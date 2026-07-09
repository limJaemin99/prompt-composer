/**
 * email — 이메일·메시지 작성 (명세 §7.1)
 * KO 요구 문구: 2026-07-09 재민 승인 번역표 기준.
 */
import type { BiText, TaskTemplate } from '../engine/types';
import { ASSUME, LANG_KO, SELFCHECK } from './common';

const SUBJECT_LINE: BiText = {
  en: 'Include a subject line (제목).',
  ko: '제목 포함',
};

const LENGTH_MAP: Record<string, BiText> = {
  짧게: { en: 'Keep it very short: 2-4 sentences.', ko: '2~4문장으로 아주 짧게' },
  보통: {
    en: 'Keep the body concise: roughly 150-300 Korean characters.',
    ko: '본문은 150~300자 내외로 간결하게',
  },
  자세히: {
    en: 'Write a fuller message: roughly 300-600 Korean characters.',
    ko: '본문은 300~600자 내외로 자세하게',
  },
};

const FORMALITY: BiText = {
  en: 'Match the level of formality precisely to the recipient description.',
  ko: '받는 사람이 누구인지에 맞춰 격식 수준을 정확히 조절',
};

const BRIEF_OPENING: BiText = {
  en: 'Keep the opening pleasantries brief; get to the point within the first two or three sentences.',
  ko: '형식적인 인사는 짧게, 두세 번째 문장 안에 용건 제시',
};

export const emailTemplate: TaskTemplate = {
  id: 'email',
  name: '이메일·메시지 작성',
  icon: '✉️',
  description: '받는 사람과 목적에 맞는 메시지를 만들어요',
  role: {
    en: 'You are an expert business communication assistant specializing in Korean workplace emails and messages.',
    ko: '한국 직장 이메일·메시지 작성 전문 어시스턴트',
  },
  task: {
    en: 'Write a complete message in Korean based on the specification below.',
    ko: '아래 명세대로 한국어 메시지를 완성',
  },
  fields: [
    {
      key: 'channel',
      label: { en: 'Channel', ko: '어디로 보내나요' },
      widget: 'select',
      options: ['이메일', '사내 메신저', '문자·카카오톡'],
      defaultValue: '이메일',
      allowCustom: true,
    },
    {
      key: 'recipient',
      label: { en: 'Recipient', ko: '받는 사람' },
      widget: 'text',
      required: true,
      placeholder: '예: 거래처 김 과장님 (외부, 격식 필요)',
    },
    {
      key: 'purpose',
      label: { en: 'Purpose', ko: '목적' },
      widget: 'select',
      required: true,
      options: ['요청', '보고', '공지', '답변', '감사', '사과', '거절', '일정 조율'],
      allowCustom: true,
    },
    {
      key: 'keyMessage',
      label: { en: 'Key message', ko: '핵심 내용' },
      widget: 'textarea',
      required: true,
      placeholder: '예: 다음 주 화요일 미팅을 목요일로 연기 요청',
    },
    {
      key: 'tone',
      label: { en: 'Tone', ko: '말투' },
      widget: 'select',
      options: ['정중하고 격식 있게', '정중하지만 부드럽게', '친근하게', '최대한 간결하게'],
      defaultValue: '정중하고 격식 있게',
      allowCustom: true,
    },
    {
      key: 'mustInclude',
      label: { en: 'Must include', ko: '꼭 넣을 것' },
      widget: 'text',
      placeholder: '예: 일정 변경에 대한 사과 한 줄',
    },
    {
      key: 'length',
      label: { en: 'Length', ko: '길이' },
      widget: 'select',
      options: ['짧게', '보통', '자세히'],
      defaultValue: '보통',
      allowCustom: true,
    },
  ],
  buildRequirements(values, detail) {
    // 간단: LANG + ASSUME 계열만 (§7 도입부, §7.10 확정)
    if (detail === 'simple') return [LANG_KO, ASSUME];

    const req: BiText[] = [LANG_KO];
    if (values.channel === '이메일') req.push(SUBJECT_LINE);
    const length = values.length ? LENGTH_MAP[values.length] : undefined;
    if (length) req.push(length);
    req.push(ASSUME);

    if (detail === 'detailed') {
      // 표준 목록(ASSUME까지) 뒤에 상세 추가, SELFCHECK는 항상 마지막 (§5.3)
      req.push(FORMALITY, BRIEF_OPENING, SELFCHECK);
    }
    return req;
  },
  buildOutputFormat(values) {
    if (values.channel === '이메일') {
      return {
        en: 'Output the 제목 (subject) first, then the body.',
        ko: '제목, 본문 순서로 출력',
      };
    }
    return null;
  },
};
