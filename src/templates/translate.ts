/**
 * translate — 번역·교정 (명세 §7.4)
 * 언어 규칙은 mode에 따라 교체. mode는 분기 키이므로 allowCustom 예외(2026-07-09 확정).
 * 간단 특칙: mode별 언어 규칙 1줄 + ASSUME.
 */
import type { BiText, TaskTemplate } from '../engine/types';
import { ASSUME, LANG_KO, SELFCHECK } from './common';

const MODE_KO_EN = '한국어 → 영어 번역';
const MODE_EN_KO = '영어 → 한국어 번역';
const MODE_FIX_KO = '한국어 문장 교정';
const MODE_FIX_EN = '영어 문장 교정';

const LANG_EN: BiText = {
  en: 'Output in natural, professional business English.',
  ko: '자연스러운 비즈니스 영어로 출력',
};

const LANG_SAME: BiText = {
  en: 'Keep the corrected text in the same language as the source.',
  ko: '교정 결과는 원문과 같은 언어로',
};

const PRESERVE: BiText = {
  en: 'Preserve the meaning and nuance; do not summarize or omit.',
  ko: '의미와 뉘앙스를 그대로 보존, 요약하거나 빼먹지 않음',
};

const CORRECTED_FIRST: BiText = {
  en: 'Output the corrected text first, then a short list of what was changed and why.',
  ko: '교정한 글을 먼저, 그 뒤에 무엇을 왜 고쳤는지 짧게 정리',
};

const GLOSSARY: BiText = {
  en: 'Strictly follow the terminology rules.',
  ko: '용어 지침을 그대로 따름',
};

const EXPLAIN: BiText = {
  en: 'After the result, briefly explain 2-3 key expressions.',
  ko: '결과 뒤에 주요 표현 2~3개를 간단히 설명',
};

const REGISTER: BiText = {
  en: 'Match the register to the specified context.',
  ko: '지정한 용도에 맞는 격식 수준으로',
};

const PLAIN_VOCAB: BiText = {
  en: 'Prefer plain, widely-used business vocabulary over rare words.',
  ko: '어려운 단어보다 널리 쓰이는 비즈니스 어휘를 우선',
};

/** mode → 언어 규칙 줄 (LANG 계열) */
function langRule(mode: string): BiText {
  if (mode === MODE_KO_EN) return LANG_EN;
  if (mode === MODE_FIX_KO || mode === MODE_FIX_EN) return LANG_SAME;
  return LANG_KO; // 영→한 및 기본
}

const isFixMode = (mode: string) => mode === MODE_FIX_KO || mode === MODE_FIX_EN;

export const translateTemplate: TaskTemplate = {
  id: 'translate',
  name: '번역·교정',
  icon: '🌐',
  description: '한↔영 번역, 어색한 문장 다듬기',
  role: {
    en: 'You are a professional translator and editor for Korean-English business content.',
    ko: '한·영 비즈니스 콘텐츠 전문 번역·교정가',
  },
  task: {
    en: 'Process the source text below according to the specified mode.',
    ko: '아래 원문을 지정한 모드대로 번역 또는 교정',
  },
  fields: [
    {
      key: 'mode',
      label: { en: 'Mode', ko: '무엇을 할까요' },
      widget: 'select',
      required: true,
      options: [MODE_KO_EN, MODE_EN_KO, MODE_FIX_KO, MODE_FIX_EN],
      // 언어 규칙 분기의 키 — 직접 입력 불가 (allowCustom 예외, 2026-07-09 확정)
    },
    {
      key: 'source',
      label: { en: 'Source text', ko: '원문 붙여넣기' },
      widget: 'textarea',
      required: true,
      longContent: true,
      placeholder: '번역·교정할 글을 붙여넣으세요',
    },
    {
      key: 'context',
      label: { en: 'Context', ko: '용도' },
      widget: 'select',
      options: ['비즈니스 이메일', '공식 문서', '발표 자료', '마케팅 문구', '일상 대화'],
      allowCustom: true,
    },
    {
      key: 'glossary',
      label: { en: 'Terminology rules', ko: '용어 지침' },
      widget: 'text',
      placeholder: "예: '수협은행'은 'Sh Suhyup Bank'로 표기",
    },
    {
      key: 'explain',
      label: { en: 'Add expression notes', ko: '표현 설명 추가' },
      widget: 'checkbox',
      hint: '체크하면 번역 후 주요 표현 2~3개를 설명해 줘요',
    },
  ],
  buildRequirements(values, detail) {
    const mode = values.mode ?? '';
    if (detail === 'simple') return [langRule(mode), ASSUME];

    const req: BiText[] = [langRule(mode), PRESERVE];
    if (isFixMode(mode)) req.push(CORRECTED_FIRST);
    if (values.glossary) req.push(GLOSSARY);
    if (values.explain === 'true') req.push(EXPLAIN);
    req.push(ASSUME);

    if (detail === 'detailed') {
      req.push(REGISTER);
      if (mode === MODE_KO_EN) req.push(PLAIN_VOCAB);
      req.push(SELFCHECK);
    }
    return req;
  },
};
