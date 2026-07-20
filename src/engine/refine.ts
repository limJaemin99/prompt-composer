/**
 * C층 — "붙여넣는 곳의 AI가 먼저 다듬고 답하게 하기" 메타 지시문 (명세 §8, v2)
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

/** 출력 B의 "[AI가 먼저 다듬음]" 안내 (§5.4 — 패리티 계산 제외 대상. 2026-07-09 명칭 개편) */
export const REFINE_NOTE_KO = '붙여넣는 곳의 AI가 이 요청을 먼저 스스로 다듬은 뒤 답합니다.';

/** 출력 B 섹션 라벨 (직렬화 시 대괄호) */
export const REFINE_LABEL_KO = 'AI가 먼저 다듬음';

/** 체크박스 라벨 (§6.1, 2026-07-09 명칭 개편) */
export const REFINE_CHECKBOX_LABEL = '붙여넣는 곳의 AI가 먼저 다듬고 답하게 하기 (고급)';

/** 체크박스 옆 물음표 툴팁 (§6.1 문면, 2026-07-09 명칭 개편) */
export const REFINE_TOOLTIP =
  '복잡하거나 애매한 요청일 때 좋아요. 요청문을 받은 AI가 먼저 스스로 다듬은 뒤 답합니다.';
