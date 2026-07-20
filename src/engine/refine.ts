/**
 * C층 메타 지시문 래퍼 2종 (모두 출력 A 맨 앞에 덧대기만 — 원문 무변형).
 * - 먼저 다듬기(refine, 제품 v1 §8): "붙여넣는 곳의 AI가 먼저 다듬고 답하게 하기"
 * - 먼저 질문하기(interview, v2 §4): "붙여넣는 곳의 AI가 먼저 질문한 뒤 답하게 하기"
 * 지시문은 영어 고정 — 출력 A의 영어 뼈대와 언어 일관성을 위함. 두 옵션은 상호 배타(v2 §6-7).
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

// ── 기능 A — 인터뷰 체크박스 (오프라인, v2 §4) ──────────────────

/**
 * 인터뷰 래퍼 문면 (v2 §4 고정, EN). ASSUME 오버라이드 문장 포함 — 이 문장을 빼면
 * 모델이 "되묻지 말라"(ASSUME)와 "먼저 질문하라" 사이에서 흔들린다(§4 핵심 디테일 1, §6-8).
 */
const INTERVIEW_BODY = `Before doing anything else, interview me first: ask the 3 to 5 most
important clarifying questions (in Korean, numbered, all in ONE message)
that would most improve the quality of the final result. Then stop and
wait for my answers. After I answer, produce the final result following
the specification below, enriched by my answers.
This interview step intentionally overrides any instruction below that
says not to ask follow-up questions; after the interview, that
instruction applies again.
If I reply "그냥 진행해줘", skip remaining questions, proceed with
reasonable assumptions, and state them briefly at the end.`;

export function renderInterviewWrapper(aiText: string, flavor: Flavor): string {
  if (flavor === 'claude') {
    return `<meta_instruction>\n${INTERVIEW_BODY}\n</meta_instruction>\n\n${aiText}`;
  }
  return `## Meta instruction\n${INTERVIEW_BODY}\n\n${aiText}`;
}

/** 출력 B의 "[AI가 먼저 질문함]" 안내 (§4-3 — 패리티 계산 제외) */
export const INTERVIEW_NOTE_KO = '붙여넣는 곳의 AI가 먼저 3~5개를 질문한 뒤, 답을 반영해 결과를 만듭니다.';

/** 출력 B 섹션 라벨 (직렬화 시 대괄호) */
export const INTERVIEW_LABEL_KO = 'AI가 먼저 질문함';

/** 체크박스 라벨 (§4, C층과 병렬 구조: "먼저 다듬고" ↔ "먼저 질문한 뒤") */
export const INTERVIEW_CHECKBOX_LABEL = '붙여넣는 곳의 AI가 먼저 질문한 뒤 답하게 하기 (고급)';

/** 체크박스 옆 물음표 툴팁 (§4 문면) */
export const INTERVIEW_TOOLTIP =
  '요청문을 받은 AI가 먼저 3~5개를 질문하고, 내 답을 반영해 결과를 만듭니다. 대화 몇 번을 감수하고 더 정확한 결과를 원할 때 좋아요.';

/** 상호 배타 시 비활성 쪽 툴팁 (§4-2 문면) */
export const MUTEX_TOOLTIP = '두 옵션은 함께 쓸 수 없어요. 하나만 선택해 주세요.';
