/**
 * brainstorm — 아이디어 발상 (명세 §7.5)
 * count 옵션("10개")에서 숫자를 추출해 EN에 치환. 커스텀 값에서 숫자를 못 찾으면 count 줄 생략.
 */
import type { BiText, TaskTemplate } from '../engine/types';
import { ASSUME, LANG_KO, SELFCHECK } from './common';

const NO_DUP: BiText = {
  en: 'No near-duplicate ideas; cover at least 3 distinct angles.',
  ko: '비슷비슷한 아이디어 없이, 최소 3가지 다른 관점을 다룸',
};

const DIRECTION_MAP: Record<string, BiText> = {
  '균형 있게': {
    en: 'Balance practical ideas with fresh, bold ones.',
    ko: '현실적인 것과 참신한 것을 균형 있게',
  },
  '현실적·바로 실행 가능한 것 위주': {
    en: 'Focus on realistic ideas that can be executed right away.',
    ko: '바로 실행할 수 있는 현실적인 아이디어 위주로',
  },
  '참신하고 과감한 것 위주': {
    en: 'Favor fresh, bold, unconventional ideas.',
    ko: '참신하고 과감한 아이디어 위주로',
  },
  '저비용 위주': {
    en: 'Prioritize ideas that cost little to execute.',
    ko: '비용이 적게 드는 아이디어 위주로',
  },
};

const WITH_EVAL: BiText = {
  en: 'For each idea, add one line of pros and one line of cons.',
  ko: '아이디어마다 장점 한 줄, 단점 한 줄씩',
};

const NAME_IDEAS: BiText = {
  en: 'Give each idea a short memorable name plus a 1-2 sentence explanation.',
  ko: '아이디어마다 기억하기 쉬운 이름과 1~2문장 설명을 붙임',
};

const MARK_TOP2: BiText = {
  en: 'End by marking the 2 ideas you would try first, with a one-line reason.',
  ko: '마지막에 먼저 시도해 볼 아이디어 2개를 이유 한 줄과 함께 표시',
};

/** "10개" 등에서 숫자 추출 — 실패 시 null (count 줄 생략) */
function parseCount(value: string): number | null {
  const m = value.match(/\d+/);
  return m ? Number(m[0]) : null;
}

export const brainstormTemplate: TaskTemplate = {
  id: 'brainstorm',
  name: '아이디어 발상',
  icon: '💡',
  description: '주제만 주면 아이디어를 여러 개 내요',
  role: {
    en: 'You are a creative strategist who generates practical, diverse ideas.',
    ko: '실용적이고 다양한 아이디어를 내는 크리에이티브 전략가',
  },
  task: {
    en: 'Generate ideas for the topic below according to the specification.',
    ko: '아래 주제에 대한 아이디어를 명세대로 생성',
  },
  fields: [
    {
      key: 'topic',
      label: { en: 'Topic', ko: '주제' },
      widget: 'text',
      required: true,
      placeholder: '예: 신입사원 온보딩 개선 방안',
    },
    {
      key: 'background',
      label: { en: 'Background and constraints', ko: '상황·제약' },
      widget: 'textarea',
      placeholder: '예: 예산 거의 없음, 대상은 20명 규모 팀',
    },
    {
      key: 'count',
      label: { en: 'Number of ideas', ko: '개수' },
      widget: 'select',
      options: ['5개', '10개', '20개'],
      defaultValue: '10개',
      allowCustom: true,
    },
    {
      key: 'direction',
      label: { en: 'Direction', ko: '방향성' },
      widget: 'select',
      options: [
        '균형 있게',
        '현실적·바로 실행 가능한 것 위주',
        '참신하고 과감한 것 위주',
        '저비용 위주',
      ],
      defaultValue: '균형 있게',
      allowCustom: true,
    },
    {
      key: 'withEval',
      label: { en: 'Include pros and cons', ko: '장단점 붙이기' },
      widget: 'checkbox',
      hint: '체크하면 아이디어마다 장단점을 한 줄씩 붙여요',
    },
  ],
  buildRequirements(values, detail) {
    if (detail === 'simple') return [LANG_KO, ASSUME];

    const req: BiText[] = [LANG_KO];
    const n = values.count ? parseCount(values.count) : null;
    if (n !== null) {
      req.push({
        en: `Provide exactly ${n} ideas, numbered.`,
        ko: `정확히 ${n}개의 아이디어를 번호 붙여 제시`,
      });
    }
    req.push(NO_DUP);
    const direction = values.direction ? DIRECTION_MAP[values.direction] : undefined;
    if (direction) req.push(direction);
    if (values.withEval === 'true') req.push(WITH_EVAL);
    req.push(ASSUME);

    if (detail === 'detailed') req.push(NAME_IDEAS, MARK_TOP2, SELFCHECK);
    return req;
  },
};
