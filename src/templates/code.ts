/**
 * code — 코드·개발 요청 (명세 §7.8)
 * LANG_KO·ASSUME 상수 대신 자체 언어·가정 문구 사용.
 * 간단 특칙(2026-07-09 확정): 간단 = KOREAN_REPLY + STATE_ASSUMPTIONS 2줄.
 */
import type { BiText, TaskTemplate } from '../engine/types';
import { SELFCHECK } from './common';

const RUNNABLE: BiText = {
  en: 'Provide complete, runnable code (no placeholders or omitted parts).',
  ko: '생략된 부분 없이 바로 실행되는 완전한 코드로 제공',
};

const ERROR_STRUCTURE: BiText = {
  en: 'Structure the answer as: root cause → fix → how to prevent it.',
  ko: '원인 → 해결 방법 → 재발 방지 순서로 답변 구성',
};

const EXPLAIN_MAP: Record<string, BiText> = {
  '핵심 설명 포함': {
    en: 'Include brief explanations of the key points.',
    ko: '핵심 포인트 위주로 설명을 곁들임',
  },
  '코드 위주로 간단히': {
    en: 'Keep explanations minimal; focus on the code.',
    ko: '설명은 최소로 하고 코드 위주로',
  },
  '초보자용 상세 설명': {
    en: 'Explain every step in detail for a beginner.',
    ko: '초보자 눈높이에서 모든 단계를 자세히 설명',
  },
};

const STATE_ASSUMPTIONS: BiText = {
  en: 'State any assumptions about the environment.',
  ko: '실행 환경에 대해 가정한 내용을 명시',
};

const KOREAN_REPLY: BiText = {
  en: 'Respond in Korean; keep code and identifiers in their original language.',
  ko: '설명은 한국어로, 코드와 변수 이름은 원어 그대로',
};

const EDGE_CASE: BiText = {
  en: 'Point out one potential edge case or failure mode of the solution.',
  ko: '이 해법이 잘못될 수 있는 예외 상황을 1가지 짚음',
};

const CONVENTIONS: BiText = {
  en: 'Follow common conventions of the specified language/framework.',
  ko: '해당 언어·프레임워크의 일반적인 관례를 따름',
};

export const codeTemplate: TaskTemplate = {
  id: 'code',
  name: '코드·개발 요청',
  icon: '💻',
  description: '새 코드, 에러 해결, 코드 설명',
  role: {
    en: 'You are a senior software engineer who writes clean, working code and explains at the level the user needs.',
    ko: '동작하는 깔끔한 코드를 쓰고 눈높이에 맞게 설명하는 시니어 개발자',
  },
  task: {
    en: 'Complete the coding request described in the specification below.',
    ko: '아래 명세의 코딩 요청을 수행',
  },
  fields: [
    {
      key: 'kind',
      label: { en: 'Request type', ko: '요청 종류' },
      widget: 'select',
      required: true,
      options: ['새 코드 작성', '에러 해결', '코드 설명·리뷰', '개선·리팩토링', '엑셀 VBA·매크로'],
      allowCustom: true,
    },
    {
      key: 'env',
      label: { en: 'Language and environment', ko: '언어·환경' },
      widget: 'text',
      required: true,
      placeholder: '예: Python 3.11 / Java Spring / 엑셀 VBA',
    },
    {
      key: 'want',
      label: { en: 'What I want', ko: '하고 싶은 것' },
      widget: 'textarea',
      required: true,
      placeholder: '만들고 싶은 것 또는 겪고 있는 문제를 자유롭게',
    },
    {
      key: 'code',
      label: { en: 'Existing code or error', ko: '코드·에러 붙여넣기' },
      widget: 'textarea',
      longContent: true,
      placeholder: '관련 코드나 에러 메시지를 그대로',
    },
    {
      key: 'constraints',
      label: { en: 'Constraints', ko: '제약' },
      widget: 'text',
      placeholder: '예: 외부 라이브러리 없이',
    },
    {
      key: 'explainLevel',
      label: { en: 'Explanation level', ko: '설명 수준' },
      widget: 'select',
      options: ['핵심 설명 포함', '코드 위주로 간단히', '초보자용 상세 설명'],
      defaultValue: '핵심 설명 포함',
      allowCustom: true,
    },
  ],
  buildRequirements(values, detail) {
    // 간단 특칙: 자체 언어·가정 문구가 'LANG+ASSUME 계열'
    if (detail === 'simple') return [KOREAN_REPLY, STATE_ASSUMPTIONS];

    const req: BiText[] = [RUNNABLE];
    if (values.kind === '에러 해결') req.push(ERROR_STRUCTURE);
    const explain = values.explainLevel ? EXPLAIN_MAP[values.explainLevel] : undefined;
    if (explain) req.push(explain);
    req.push(STATE_ASSUMPTIONS, KOREAN_REPLY);

    if (detail === 'detailed') req.push(EDGE_CASE, CONVENTIONS, SELFCHECK);
    return req;
  },
};
