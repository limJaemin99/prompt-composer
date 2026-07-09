/**
 * image — 이미지 생성 (명세 §7.7)
 * defaultFlavor gpt. LANG_KO·ASSUME 미사용 유형.
 * 간단 특칙(2026-07-09 확정): 간단 = tasteful defaults 줄 + (usage 선택 시) usage 줄.
 */
import type { BiText, TaskTemplate } from '../engine/types';
import { SELFCHECK } from './common';

const USAGE_MAP: Record<string, BiText> = {
  발표자료용: {
    en: 'Use a wide 16:9 aspect ratio suitable for slides.',
    ko: '슬라이드에 맞는 16:9 가로형으로',
  },
  '문서 삽입용': {
    en: 'Use a clean composition with generous margins.',
    ko: '여백이 넉넉한 깔끔한 구도로',
  },
  SNS용: { en: 'Use a square 1:1 aspect ratio.', ko: '정사각형(1:1) 비율로' },
};

const AVOID: BiText = {
  en: 'Strictly exclude everything listed under "Avoid".',
  ko: "'빼고 싶은 것'에 적은 요소는 절대 넣지 않음",
};

const TASTEFUL: BiText = {
  en: 'If any visual detail is unspecified, choose tasteful defaults that fit the subject and style.',
  ko: '따로 정하지 않은 부분은 주제와 스타일에 어울리게 알아서 보기 좋게 선택',
};

const FOCAL: BiText = {
  en: 'Render a single clear focal subject; avoid clutter.',
  ko: '주인공 하나가 뚜렷하게, 어수선하지 않게',
};

const LIGHTING: BiText = {
  en: 'Aim for consistent lighting and coherent style throughout.',
  ko: '조명과 스타일을 전체적으로 일관되게',
};

export const imageTemplate: TaskTemplate = {
  id: 'image',
  name: '이미지 생성',
  icon: '🖼️',
  description: '그리고 싶은 장면을 그림 요청문으로',
  defaultFlavor: 'gpt',
  banner: '이미지 생성은 ChatGPT·Gemini에서 지원돼요.',
  role: {
    en: 'You are writing an image-generation request for an AI image model.',
    ko: 'AI 이미지 모델에 보낼 생성 요청을 작성',
  },
  task: {
    en: 'Generate an image based on the specification below. Internally translate any Korean description into a rich English image prompt before generating.',
    ko: '아래 명세대로 이미지를 생성 (한국어 설명은 내부적으로 영어 프롬프트로 변환해 생성)',
  },
  fields: [
    {
      key: 'subject',
      label: { en: 'Subject', ko: '무엇을 그릴까요' },
      widget: 'text',
      required: true,
      placeholder: '예: 노란 옷을 입고 산책하는 흰색 강아지',
    },
    {
      key: 'style',
      label: { en: 'Style', ko: '스타일' },
      widget: 'select',
      options: ['깔끔한 일러스트', '사진처럼 사실적', '3D 렌더', '수채화', '픽셀아트'],
      defaultValue: '깔끔한 일러스트',
      allowCustom: true,
    },
    {
      key: 'scene',
      label: { en: 'Scene and composition', ko: '배경·구도' },
      widget: 'text',
      placeholder: '예: 공원 배경, 전신이 보이게',
    },
    {
      key: 'mood',
      label: { en: 'Colors and mood', ko: '색감·분위기' },
      widget: 'text',
      placeholder: '예: 밝고 따뜻한 파스텔톤',
    },
    {
      key: 'usage',
      label: { en: 'Usage', ko: '용도' },
      widget: 'select',
      options: ['발표자료용', '문서 삽입용', 'SNS용'],
      allowCustom: true,
    },
    {
      key: 'avoid',
      label: { en: 'Avoid', ko: '빼고 싶은 것' },
      widget: 'text',
      placeholder: '예: 이미지 안에 글자 넣지 말 것',
    },
  ],
  buildRequirements(values, detail) {
    const usage = values.usage ? USAGE_MAP[values.usage] : undefined;

    // 간단 특칙: LANG·ASSUME이 없는 유형 — tasteful defaults(+usage)의 1~2줄
    if (detail === 'simple') return usage ? [usage, TASTEFUL] : [TASTEFUL];

    const req: BiText[] = [];
    if (usage) req.push(usage);
    if (values.avoid) req.push(AVOID);
    req.push(TASTEFUL);

    if (detail === 'detailed') req.push(FOCAL, LIGHTING, SELFCHECK);
    return req;
  },
};
