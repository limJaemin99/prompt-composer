/**
 * data — 데이터·엑셀 분석 (명세 §7.6)
 * 배너·hint로 민감정보 경고. tool 값은 EN 문구에 치환.
 */
import type { BiText, TaskTemplate } from '../engine/types';
import { ASSUME, LANG_KO, SELFCHECK } from './common';

const EXACT_STEPS: BiText = {
  en: 'Give the exact formula or steps, state exactly where to put or click them, and add a one-line reason why it works.',
  ko: '정확한 수식이나 순서를 알려주고, 어디에 입력·클릭하는지와 왜 되는지 이유 한 줄까지 제시',
};

const LEVEL_MAP: Record<string, BiText> = {
  '초급 — 자세한 설명 필요': {
    en: 'Explain step by step, assuming no prior knowledge of functions.',
    ko: '함수를 모른다고 가정하고 차근차근 단계별로 설명',
  },
  '중급 — 핵심만': {
    en: 'Be concise; skip basic explanations.',
    ko: '기본 설명은 건너뛰고 핵심만 간결하게',
  },
};

const MISTAKE: BiText = {
  en: 'Mention one common mistake or edge case to watch for.',
  ko: '흔히 하는 실수나 주의할 예외 상황을 1가지 짚음',
};

const RECOMMEND: BiText = {
  en: 'If multiple approaches exist, recommend one and say why in one line.',
  ko: '방법이 여러 가지면 하나를 추천하고 이유를 한 줄로',
};

export const dataTemplate: TaskTemplate = {
  id: 'data',
  name: '데이터·엑셀 분석',
  icon: '📊',
  description: '수식 만들기, 차트 추천, 데이터 해석',
  banner: '실제 민감한 데이터 대신, 열 구성 설명이나 가짜 예시를 넣는 걸 권장해요.',
  role: {
    en: 'You are a spreadsheet and data-analysis expert who explains clearly to office workers.',
    ko: '사무직에게 명확히 설명해 주는 스프레드시트·데이터 분석 전문가',
  },
  task: {
    en: 'Help with the spreadsheet/data task described in the specification below.',
    ko: '아래 명세의 스프레드시트·데이터 작업을 도움',
  },
  fields: [
    {
      key: 'goal',
      label: { en: 'Goal', ko: '무엇을 하고 싶나요' },
      widget: 'select',
      required: true,
      options: ['수식·함수 만들기', '데이터 해석·인사이트', '차트·시각화 추천', '데이터 정리 방법', '피벗테이블 도움'],
      allowCustom: true,
    },
    {
      key: 'dataDesc',
      label: { en: 'Data description', ko: '데이터 설명' },
      widget: 'textarea',
      required: true,
      longContent: true,
      placeholder: '예: A열 날짜, B열 지점명, C열 매출액, 약 1,000행',
      hint: '실제 민감한 데이터 대신, 열 구성 설명이나 가짜 예시를 넣는 걸 권장해요.',
    },
    {
      key: 'want',
      label: { en: 'Desired outcome', ko: '원하는 결과' },
      widget: 'text',
      required: true,
      placeholder: '예: 지점별 월 매출 합계를 구하고 싶어요',
    },
    {
      key: 'tool',
      label: { en: 'Tool', ko: '사용 도구' },
      widget: 'select',
      options: ['Excel', 'Google Sheets'],
      defaultValue: 'Excel',
      allowCustom: true,
    },
    {
      key: 'level',
      label: { en: 'My skill level', ko: '내 숙련도' },
      widget: 'select',
      options: ['초급 — 자세한 설명 필요', '중급 — 핵심만'],
      defaultValue: '초급 — 자세한 설명 필요',
      allowCustom: true,
    },
  ],
  buildRequirements(values, detail) {
    if (detail === 'simple') return [LANG_KO, ASSUME];

    const req: BiText[] = [LANG_KO, EXACT_STEPS];
    const level = values.level ? LEVEL_MAP[values.level] : undefined;
    if (level) req.push(level);
    if (values.tool) {
      req.push({
        en: `Target ${values.tool} specifically; use its exact function names and menu paths.`,
        ko: `${values.tool} 기준으로 정확한 함수 이름과 메뉴 위치를 사용`,
      });
    }
    req.push(ASSUME);

    if (detail === 'detailed') req.push(MISTAKE, RECOMMEND, SELFCHECK);
    return req;
  },
};
