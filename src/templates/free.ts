/**
 * free — 자유 입력 (명세 §7.9)
 * role은 기본 생략, aiRole 값이 있으면 동적 생성(roleFromField).
 * KO 요구 문구: 2026-07-09 재민 승인 번역표 기준.
 */
import type { BiText, TaskTemplate } from '../engine/types';
import { ASSUME, LANG_KO, SELFCHECK } from './common';

const OUTPUT_SHAPE: BiText = {
  en: 'Follow the desired output shape exactly.',
  ko: '원하는 결과물 형태 그대로 출력',
};

const BROAD_HEADINGS: BiText = {
  en: 'If the request is broad, structure the answer with short headings.',
  ko: '요청 범위가 넓으면 짧은 소제목으로 나눠 정리',
};

export const freeTemplate: TaskTemplate = {
  id: 'free',
  name: '자유 입력',
  icon: '📝',
  description: '어떤 요청이든 자유롭게 적어요',
  roleFromField: 'aiRole',
  task: {
    en: 'Complete the request described in the specification below.',
    ko: '아래 명세의 요청을 수행',
  },
  fields: [
    {
      key: 'want',
      label: { en: 'What I want', ko: '하고 싶은 것' },
      widget: 'textarea',
      required: true,
      placeholder: 'AI에게 시키고 싶은 일을 자유롭게 적어주세요',
    },
    {
      key: 'context',
      label: { en: 'Background', ko: '배경 설명' },
      widget: 'textarea',
      longContent: true,
      placeholder: '상황, 대상, 제약 등 (선택)',
    },
    {
      key: 'outputShape',
      label: { en: 'Desired output shape', ko: '원하는 결과물 형태' },
      widget: 'text',
      placeholder: '예: 표로 / 목록 5개 / 500자 이내',
    },
    {
      key: 'aiRole',
      label: { en: 'Role for the AI', ko: 'AI에게 줄 역할' },
      widget: 'text',
      placeholder: '예: 마케팅 전문가',
    },
  ],
  buildRequirements(values, detail) {
    if (detail === 'simple') return [LANG_KO, ASSUME];

    // 명세 §7.9 나열 순서: LANG_KO → ASSUME → (outputShape 입력 시) OUTPUT_SHAPE
    const req: BiText[] = [LANG_KO, ASSUME];
    if (values.outputShape) req.push(OUTPUT_SHAPE);

    if (detail === 'detailed') {
      req.push(BROAD_HEADINGS, SELFCHECK);
    }
    return req;
  },
};
