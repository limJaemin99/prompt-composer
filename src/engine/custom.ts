/**
 * 내 프롬프트 — 변수 치환 엔진 (명세 §7.11)
 *
 * 신뢰 원칙(철칙): 사용자 프롬프트의 골격을 한 글자도 변형하지 않는다.
 * - 변수 목록은 저장하지 않고 body를 스캔해 매번 파생 (단일 진실 원천)
 * - 치환은 단일 패스 함수 치환 — 삽입된 값 속의 {{...}}가 재치환되지 않고,
 *   값 속의 $&, $1 같은 JS replace 특수 패턴도 해석되지 않는다
 * - 등록·수정 시 normalizeBody 1회(BOM 제거 + 개행 LF 통일)만 허용하고,
 *   그 결과 문자열을 불변의 "원문"으로 취급한다 (2026-07-09 M0 분석 확정)
 */

export interface CustomPrompt {
  id: string; // uuid
  name: string;
  body: string; // 원문. {{변수명}} 플레이스홀더 포함 가능
  createdAt: string;
  updatedAt: string;
}

/** 명세 §7.11의 변수 스캔 정규식 그대로 */
const VAR_RE = /\{\{(.+?)\}\}/g;

/**
 * 등록·수정 시 1회 적용하는 정규화: 선두 BOM 제거 + CRLF/CR → LF.
 * (.txt 첨부와 클립보드 붙여넣기의 개행·BOM 차이로 "원문" 정의가 흔들리는 것을 방지)
 */
export function normalizeBody(raw: string): string {
  return raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

/**
 * body의 변수명 목록 — 최초 등장 순서, 트림 후 중복 제거.
 * 트림 결과가 빈 이름({{ }} 등)이면 변수로 취급하지 않는다.
 */
export function extractVariables(body: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of body.matchAll(VAR_RE)) {
    const name = m[1].trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

/**
 * 중첩 등 잘못된 변수명 검출 — 이름에 { 또는 } 가 섞이면(예: "{{겉 {{속}}}}")
 * 등록 화면에서 저장을 막고 안내한다 (명세 §7.11 "중첩 불가").
 */
export function findInvalidVariables(body: string): string[] {
  const bad: string[] = [];
  for (const m of body.matchAll(VAR_RE)) {
    const name = m[1].trim();
    if (name && /[{}]/.test(name)) bad.push(name);
  }
  return [...new Set(bad)];
}

/**
 * 단일 패스 변수 치환.
 * - 같은 이름 변수(공백만 다른 {{ 주제 }} 포함)는 전부 같은 값으로 치환
 * - 값이 없는 변수·빈 이름 토큰은 원문 그대로 남긴다
 * - 변수 자리 외의 모든 문자는 원문과 완전히 일치한다 (§10.2 custom ① — 테스트로 잠금)
 */
export function substituteVariables(body: string, values: Record<string, string>): string {
  return body.replace(VAR_RE, (match, rawName: string) => {
    const name = rawName.trim();
    if (!name) return match;
    // hasOwnProperty 가드 — {{toString}} 같은 변수명이 Object.prototype의
    // 상속 프로퍼티를 값으로 잡아 골격을 오염시키는 것을 방지
    if (!Object.prototype.hasOwnProperty.call(values, name)) return match;
    return values[name];
  });
}
