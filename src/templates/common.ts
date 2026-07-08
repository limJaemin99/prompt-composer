/**
 * 공용 요구 문구 라이브러리 (명세 §5.3, 전 유형 재사용)
 */
import type { BiText } from '../engine/types';

export const LANG_KO: BiText = {
  en: 'Write the entire output in natural, professional Korean.',
  ko: '결과물 전체를 자연스러운 업무용 한국어로 작성',
};

export const ASSUME: BiText = {
  en: 'If critical information is missing, do not ask follow-up questions; make a reasonable assumption and state it in one short line at the end.',
  ko: '정보가 부족해도 되묻지 않고, 합리적으로 가정한 뒤 마지막에 한 줄로 그 가정을 밝힘',
};

/** 상세 전용 — 항상 requirements 마지막 줄 */
export const SELFCHECK: BiText = {
  en: 'Before finalizing, silently verify your output satisfies every requirement above.',
  ko: '제출 전 위 요구사항을 모두 충족하는지 스스로 점검',
};
