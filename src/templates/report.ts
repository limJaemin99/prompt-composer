/**
 * report — 보고서·기획서 작성 (명세 §7.2)
 * KO·EN 문장화: 2026-07-09 승인 번역표(M4) 기준.
 */
import type { BiText, TaskTemplate } from '../engine/types';
import { ASSUME, LANG_KO, SELFCHECK } from './common';

const STYLE_MAP: Record<string, BiText> = {
  개조식: {
    en: 'Write in 개조식 (concise bullet style) as used in Korean business documents.',
    ko: '한국 업무 문서에서 쓰는 개조식으로 간결하게 작성',
  },
  서술식: {
    en: 'Write in full flowing sentences (서술식).',
    ko: '완결된 문장으로 이어지는 서술식으로 작성',
  },
};

const LENGTH_MAP: Record<string, BiText> = {
  '반 페이지': {
    en: 'Keep the length to about half an A4 page.',
    ko: '분량은 A4 반 페이지 정도로',
  },
  '1페이지': {
    en: 'Keep the length to about one A4 page.',
    ko: '분량은 A4 1페이지 정도로',
  },
  '2~3페이지': {
    en: 'Write 2-3 A4 pages with clear section headings.',
    ko: '명확한 섹션 제목과 함께 A4 2~3페이지로 작성',
  },
};

const HEADINGS: BiText = {
  en: 'Use clear section headings.',
  ko: '섹션 제목을 명확하게 구분',
};

const CONCLUSION_FIRST: BiText = {
  en: 'Lead with the conclusion (두괄식); details and evidence follow.',
  ko: '결론부터 먼저(두괄식), 상세 내용과 근거는 뒤에',
};

const NO_INVENT: BiText = {
  en: 'Keep every number and fact from the specification accurate; do not invent data.',
  ko: '전달한 숫자와 사실은 정확히 유지하고, 없는 데이터를 지어내지 않음',
};

export const reportTemplate: TaskTemplate = {
  id: 'report',
  name: '보고서·기획서',
  icon: '📄',
  description: '핵심 내용만 주면 문서 초안을 잡아요',
  role: {
    en: 'You are a senior business document writer experienced in Korean corporate reporting.',
    ko: '한국 기업 문서 작성 경험이 많은 시니어 문서 전문가',
  },
  task: {
    en: 'Write the requested business document in Korean based on the specification below.',
    ko: '아래 명세대로 한국어 업무 문서를 작성',
  },
  fields: [
    {
      key: 'docType',
      label: { en: 'Document type', ko: '문서 종류' },
      widget: 'select',
      required: true,
      options: ['업무 보고서', '기획서', '제안서', '회의록', '공지문'],
      allowCustom: true,
    },
    {
      key: 'topic',
      label: { en: 'Topic', ko: '주제' },
      widget: 'text',
      required: true,
      placeholder: '예: 3분기 고객 문의 응대 현황',
    },
    {
      key: 'content',
      label: { en: 'Key content and data', ko: '핵심 내용·자료' },
      widget: 'textarea',
      required: true,
      longContent: true,
      placeholder: '포함할 내용, 수치, 결론을 자유롭게',
    },
    {
      key: 'audience',
      label: { en: 'Audience', ko: '보는 사람' },
      widget: 'text',
      placeholder: '예: 팀장님 보고용',
    },
    {
      key: 'style',
      label: { en: 'Writing style', ko: '문체' },
      widget: 'select',
      options: ['개조식', '서술식'],
      defaultValue: '개조식',
      allowCustom: true,
    },
    {
      key: 'length',
      label: { en: 'Length', ko: '분량' },
      widget: 'select',
      options: ['반 페이지', '1페이지', '2~3페이지'],
      defaultValue: '1페이지',
      allowCustom: true,
    },
    {
      key: 'structure',
      label: { en: 'Required structure', ko: '원하는 목차' },
      widget: 'text',
      placeholder: '예: 개요 → 현황 → 문제점 → 개선안',
    },
  ],
  buildRequirements(values, detail) {
    if (detail === 'simple') return [LANG_KO, ASSUME];

    const req: BiText[] = [LANG_KO];
    const style = values.style ? STYLE_MAP[values.style] : undefined;
    if (style) req.push(style);
    const length = values.length ? LENGTH_MAP[values.length] : undefined;
    if (length) req.push(length);
    req.push(HEADINGS, ASSUME);

    if (detail === 'detailed') req.push(CONCLUSION_FIRST, NO_INVENT, SELFCHECK);
    return req;
  },
  buildOutputFormat(values) {
    if (values.structure) {
      return {
        en: `Follow this section order exactly: ${values.structure}`,
        ko: '지정한 목차 순서대로 작성',
      };
    }
    return null;
  },
};
