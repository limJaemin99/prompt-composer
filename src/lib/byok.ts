/**
 * BYOK — 사용자 API 키로 프롬프트 정제 (명세 §9, v2)
 * 키는 localStorage에만 저장. 유일한 런타임 네트워크 요청 지점 — 사용자가 버튼을
 * 눌렀을 때만 호출된다(BYOK 미설정 시 네트워크 요청 0건 요건과 공존).
 *
 * 지원 제공사: Anthropic·Google (2026-07-09 CORS 실측 — docs/M6_CORS검증보고서.md).
 * OpenAI는 file:// 오리진 CORS 차단으로 v1에서 숨김(정책 변경 시 재검 후 추가).
 */

export type Provider = 'anthropic' | 'google';

const KEYS: Record<Provider, string> = {
  anthropic: 'pg.byok.anthropic',
  google: 'pg.byok.google',
};

/**
 * §9: 각사 최소 비용 모델 (구현 시점 공식 문서 확인 — CORS 보고서 참조)
 * google: gemini-2.0-flash는 2026-07 공식 카탈로그에서 deprecated(신규 무료 키 quota 0) —
 * 현행 세대 최소 비용 Flash-Lite로 갱신 (2026-07-09 재확인)
 */
const MODELS: Record<Provider, string> = {
  anthropic: 'claude-haiku-4-5',
  google: 'gemini-3.1-flash-lite',
};

/** §9 정제 요청 시스템 프롬프트 문면 그대로 */
const REFINE_SYSTEM =
  'You are a prompt engineering expert. Improve the following prompt for clarity, specificity, and effectiveness. Preserve all user content and the original language mix (English skeleton + Korean content). Return only the improved prompt, nothing else.';

const TIMEOUT_MS = 30_000;

export function loadApiKey(provider: Provider): string {
  try {
    return localStorage.getItem(KEYS[provider]) ?? '';
  } catch {
    return '';
  }
}

export function saveApiKey(provider: Provider, key: string): void {
  try {
    if (key.trim() === '') localStorage.removeItem(KEYS[provider]);
    else localStorage.setItem(KEYS[provider], key.trim());
  } catch {
    /* 저장 실패 — 설정 모달에서 재시도 안내 */
  }
}

/**
 * 저장된 키가 있는 첫 제공사 — Google 우선 (2026-07-09 확정).
 * Google은 무료 티어, Anthropic은 선결제 유료 — 둘 다 저장돼 있으면 무료가 기본값.
 * 실패 시 자동 폴백은 하지 않는다(동의 없는 비용 발생 방지).
 */
export function activeProvider(): Provider | null {
  if (loadApiKey('google')) return 'google';
  if (loadApiKey('anthropic')) return 'anthropic';
  return null;
}

export interface RefineResult {
  ok: boolean;
  text?: string;
  /** 실패 시 — 원인과 다음 행동을 담은 사용자 문구 (§6.2) */
  error?: string;
}

export async function refinePrompt(provider: Provider, promptText: string): Promise<RefineResult> {
  const apiKey = loadApiKey(provider);
  if (!apiKey) return { ok: false, error: '저장된 API 키가 없어요. 설정에서 키를 입력해 주세요.' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res =
      provider === 'anthropic'
        ? await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'content-type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              // file:// 오리진(null)에서의 브라우저 직접 호출 허용 헤더 — CORS 보고서 참조
              'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
              model: MODELS.anthropic,
              max_tokens: 4096,
              system: REFINE_SYSTEM,
              messages: [{ role: 'user', content: promptText }],
            }),
          })
        : await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.google}:generateContent`,
            {
              method: 'POST',
              signal: controller.signal,
              headers: {
                'content-type': 'application/json',
                // 키는 URL이 아닌 헤더로 — 실패 로그·히스토리에 키가 노출되지 않게 (2026-07-09)
                'x-goog-api-key': apiKey,
              },
              body: JSON.stringify({
                system_instruction: { parts: [{ text: REFINE_SYSTEM }] },
                contents: [{ role: 'user', parts: [{ text: promptText }] }],
              }),
            },
          );

    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      return { ok: false, error: errorMessage(res.status, bodyText) };
    }

    const data: unknown = await res.json();
    const text = extractText(provider, data);
    if (!text) {
      return { ok: false, error: 'AI 응답을 읽지 못했어요. 잠시 후 다시 시도해 주세요.' };
    }
    return { ok: true, text };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { ok: false, error: '응답이 너무 오래 걸려 중단했어요. 잠시 후 다시 시도해 주세요.' };
    }
    return { ok: false, error: '연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 상태코드 + 응답 본문 → 원인과 다음 행동을 담은 사용자 문구 (§6.2).
 * 429는 두 갈래로 구분한다: 할당량 자체가 0(키 등급에서 모델 미지원 — 기다려도 소용없음)
 * vs 일시적 빈도 제한(잠시 후 재시도). 테스트를 위해 export.
 */
export function errorMessage(status: number, bodyText = ''): string {
  if (status === 401 || status === 403) {
    return 'API 키가 올바르지 않아요. 설정에서 키를 다시 확인해 주세요.';
  }
  if (status === 429) {
    // Google RESOURCE_EXHAUSTED에 "limit: 0"이 오면 이 키 등급에서 모델 할당량이 없는 것 —
    // 재시도해도 해결되지 않으므로 별도 안내 (2026-07-09 실사용 보고 반영)
    if (/limit:\s*0\b/.test(bodyText)) {
      return '지금 키 등급에서는 이 모델을 쓸 수 없어요(할당량 0). 발급 콘솔에서 키 등급과 모델 사용 가능 여부를 확인해 주세요.';
    }
    return '요청이 너무 잦아 잠시 제한됐어요. 1분 정도 후에 다시 시도해 주세요.';
  }
  if (status >= 500) {
    return 'AI 서비스가 일시적으로 불안정해요. 잠시 후 다시 시도해 주세요.';
  }
  return `요청이 실패했어요(오류 ${status}). 잠시 후 다시 시도해 주세요.`;
}

function extractText(provider: Provider, data: unknown): string | null {
  try {
    if (provider === 'anthropic') {
      const d = data as { content?: { type: string; text?: string }[] };
      const block = d.content?.find((b) => b.type === 'text');
      return block?.text?.trim() || null;
    }
    const d = data as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const parts = d.candidates?.[0]?.content?.parts;
    const text = parts?.map((p) => p.text ?? '').join('');
    return text?.trim() || null;
  } catch {
    return null;
  }
}
