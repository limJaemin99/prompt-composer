/**
 * 템플릿 레지스트리 — 9유형 전체 (M4 완성).
 * 홈 카드 표시 순서 = 명세 7.1~7.9 순서 (M0 확정).
 */
import type { TaskTemplate } from '../engine/types';
import { emailTemplate } from './email';
import { reportTemplate } from './report';
import { summarizeTemplate } from './summarize';
import { translateTemplate } from './translate';
import { brainstormTemplate } from './brainstorm';
import { dataTemplate } from './data';
import { imageTemplate } from './image';
import { codeTemplate } from './code';
import { freeTemplate } from './free';

export const TEMPLATES: TaskTemplate[] = [
  emailTemplate,
  reportTemplate,
  summarizeTemplate,
  translateTemplate,
  brainstormTemplate,
  dataTemplate,
  imageTemplate,
  codeTemplate,
  freeTemplate,
];

export function getTemplate(id: string): TaskTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export interface CardInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** 미구현 유형 표시용 — M4 이후 전부 활성이라 현재 사용처 없음 */
  planned?: boolean;
}

export const HOME_CARDS: CardInfo[] = TEMPLATES.map((t) => ({
  id: t.id,
  name: t.name,
  icon: t.icon,
  description: t.description,
}));
