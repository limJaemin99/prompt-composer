/**
 * C층 — "AI가 스스로 다듬어 실행" 메타 지시문 (명세 §8, v2)
 * 체크 시 현재 플레이버의 출력 A 맨 앞에 덧댄다. 원문(출력 A)은 한 글자도 바뀌지 않는다.
 * 지시문은 영어 고정 — 출력 A의 영어 뼈대와 언어 일관성을 지키기 위함(§8).
 */
import type { Flavor } from './types';

/** §8 문면 그대로 — 3문장 메타 지시문 */
const META_BODY = `Below is a structured specification of my request.
Step 1 (do this silently): rewrite it into the most effective prompt you can — resolve ambiguities with reasonable assumptions, enrich the structure, and keep every piece of my content intact.
Step 2: follow that improved prompt and output only the final result. Do not show the rewritten prompt.`;

export function renderRefineWrapper(aiText: string, flavor: Flavor): string {
  if (flavor === 'claude') {
    return `<meta_instruction>\n${META_BODY}\n</meta_instruction>\n\n${aiText}`;
  }
  // gpt / gemini — 동일 문구를 ## Meta instruction 헤더 아래에 (§8)
  return `## Meta instruction\n${META_BODY}\n\n${aiText}`;
}

/** 출력 B의 "[AI 정제]" 안내 (§5.4 — 패리티 계산 제외 대상) */
export const REFINE_NOTE_KO = 'AI가 이 요청을 스스로 더 정교하게 다듬은 뒤 실행합니다.';

/** 체크박스 옆 물음표 툴팁 (§6.1 문면) */
export const REFINE_TOOLTIP =
  '복잡하거나 애매한 요청일 때, AI가 프롬프트를 한 번 더 다듬은 뒤 답을 줍니다.';
