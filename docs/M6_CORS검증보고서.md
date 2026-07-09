# M6 CORS 검증 보고서 — BYOK 브라우저 직접 호출 (명세 §9)

- 검증일: 2026-07-09
- 방법: 설치된 실제 Chrome을 `file://` 프로토콜로 구동(puppeteer-core), 페이지 컨텍스트에서
  각 제공사 API로 `fetch` 실행. **무효 키**를 사용 — HTTP 상태(401/400)가 브라우저에
  도달하면 CORS 통과, `TypeError: Failed to fetch`면 CORS 차단.
  (CORS 프리플라이트는 인증 이전 단계이므로 키 유무와 무관하게 판별 가능)
- 오리진: `file://` (Origin: null)

## 결과

| 제공사 | 엔드포인트 | 결과 | 판정 |
|---|---|---|---|
| **Anthropic** | `POST api.anthropic.com/v1/messages` + `anthropic-dangerous-direct-browser-access: true` | **401 도달** — `authentication_error: invalid x-api-key` 본문 수신 | ✅ **호출 가능** (유효 키만 있으면 동작) |
| **Google** | `POST generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent` | **400 도달** — `API key not valid` 본문 수신 | ✅ **호출 가능** |
| **OpenAI** | `POST api.openai.com/v1/chat/completions` | `TypeError: Failed to fetch` | ❌ **CORS 차단** |

## 결정 (명세 §9 정책 적용)

- **Anthropic·Google**: BYOK 대상으로 지원. Anthropic은 `anthropic-dangerous-direct-browser-access: true`
  헤더 필수(실측으로 유효성 확인).
- **OpenAI**: §9 "실패하는 제공사는 v1에서 조용히 숨긴다" — 설정 모달에서 OpenAI 키 입력칸을
  노출하지 않는다. (프리플라이트 차단이므로 유효 키가 있어도 브라우저 직접 호출 불가)
- **숨김 해제 조건**: 이 판정은 **2026-07-09 실측** 기준이다. OpenAI가 브라우저 직접 호출(CORS)
  정책을 변경하면, 위와 동일한 방법(무효 키 fetch — HTTP 상태 도달 여부)으로 **재검 후 통과 시
  설정 모달에 OpenAI 칸을 추가**하는 것만으로 되살릴 수 있다. 코드 구조는 제공사 추가가 쉽도록
  상수 테이블 기반으로 유지한다.

## 정제용 최소 비용 모델 상수 (구현 시점 확인, §9)

| 제공사 | 모델 ID | 근거 |
|---|---|---|
| Anthropic | `claude-haiku-4-5` | 공식 카탈로그 기준 최소 비용 티어($1/$5 per MTok), haiku 계열 최신. alias 사용(날짜 suffix 금지) |
| Google | `gemini-2.0-flash` | flash 계열(저비용 티어). 실측에서 엔드포인트 경로 유효성 확인 |

## 참고

- `file://`에서 `isSecureContext === true`(M1 검증) — Web Crypto·Clipboard 등 secure context API 사용 가능.
- 이 실측은 headless Chrome 기준. 제공사가 CORS 정책을 변경하면 결과가 달라질 수 있으므로,
  구현에는 호출 실패 시 원인·다음 행동을 안내하는 에러 처리를 포함한다(§6.2).
