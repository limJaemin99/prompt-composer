/**
 * summarize — 요약·정리 (명세 §7.3)
 * KO·EN 문장화: 2026-07-09 승인 번역표(M4) 기준. "한 줄 요약" KO는 재민 수정안("한 줄로 요약").
 */
import type { BiText, TaskTemplate } from '../engine/types';
import { ASSUME, LANG_KO, SELFCHECK } from './common';

const NO_ADD: BiText = {
  en: 'Do not add any information that is not present in the source.',
  ko: '원문에 없는 내용은 보태지 않음',
};

const KEEP_FACTS: BiText = {
  en: 'Keep all numbers, dates, and names exactly as written in the source.',
  ko: '숫자·날짜·이름은 원문에 적힌 그대로 유지',
};

const FORMAT_MAP: Record<string, BiText> = {
  '핵심 불릿': { en: 'Format the summary as key bullet points.', ko: '핵심만 불릿으로 정리' },
  '짧은 문단': { en: 'Format the summary as one short paragraph.', ko: '짧은 문단 하나로 정리' },
  '한 줄 요약': { en: 'Summarize in a single sentence.', ko: '한 줄로 요약' },
  '표로 정리': { en: 'Organize the summary into a table.', ko: '표로 정리' },
};

const AMOUNT_MAP: Record<string, BiText> = {
  '3줄 이내': { en: 'Keep the summary within 3 lines.', ko: '3줄 이내로' },
  '불릿 5~7개': { en: 'Use 5-7 bullet points.', ko: '불릿 5~7개로' },
  '원문의 절반 이하': {
    en: 'Keep it under half the length of the source.',
    ko: '원문의 절반 이하 분량으로',
  },
};

const ACTION_ITEMS: BiText = {
  en: 'If the source contains action items or deadlines, list them separately at the end.',
  ko: '원문에 할 일이나 기한이 있으면 마지막에 따로 정리',
};

export const summarizeTemplate: TaskTemplate = {
  id: 'summarize',
  name: '요약·정리',
  icon: '📋',
  description: '긴 글을 붙여넣으면 핵심만 남겨요',
  role: {
    en: 'You are an expert at distilling documents into accurate, decision-ready summaries.',
    ko: '문서를 정확하게 핵심만 추리는 요약 전문가',
  },
  task: {
    en: 'Summarize the source text below according to the specification.',
    ko: '아래 원문을 명세대로 요약',
  },
  fields: [
    {
      key: 'source',
      label: { en: 'Source text', ko: '원문 붙여넣기' },
      widget: 'textarea',
      required: true,
      longContent: true,
      placeholder: '요약할 글을 그대로 붙여넣으세요 (회의록, 기사, 긴 메일 등)',
    },
    {
      key: 'use',
      label: { en: 'Intended use', ko: '어디에 쓰나요' },
      widget: 'select',
      options: ['상사 보고용', '팀 공유용', '개인 메모용', '고객 전달용'],
      allowCustom: true,
    },
    {
      key: 'format',
      label: { en: 'Format', ko: '형태' },
      widget: 'select',
      options: ['핵심 불릿', '짧은 문단', '한 줄 요약', '표로 정리'],
      defaultValue: '핵심 불릿',
      allowCustom: true,
    },
    {
      key: 'amount',
      label: { en: 'Amount', ko: '분량' },
      widget: 'select',
      options: ['3줄 이내', '불릿 5~7개', '원문의 절반 이하'],
      defaultValue: '불릿 5~7개',
      allowCustom: true,
    },
    {
      key: 'mustKeep',
      label: { en: 'Must keep', ko: '꼭 남길 것' },
      widget: 'text',
      placeholder: '예: 날짜와 담당자 이름은 반드시 유지',
    },
  ],
  buildRequirements(values, detail) {
    if (detail === 'simple') return [LANG_KO, ASSUME];

    const req: BiText[] = [LANG_KO, NO_ADD, KEEP_FACTS];
    const format = values.format ? FORMAT_MAP[values.format] : undefined;
    if (format) req.push(format);
    const amount = values.amount ? AMOUNT_MAP[values.amount] : undefined;
    if (amount) req.push(amount);
    req.push(ASSUME);

    if (detail === 'detailed') req.push(ACTION_ITEMS, SELFCHECK);
    return req;
  },
};
