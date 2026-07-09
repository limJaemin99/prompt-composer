/**
 * 템플릿 레지스트리.
 * M3 시점: email·free 2종 구현 완료. 나머지 7종은 홈 그리드 레이아웃(3×3)을 위해
 * 카드 정보만 노출하고 "준비 중"으로 표시한다 — M4에서 TaskTemplate로 승격.
 */
import type { TaskTemplate } from '../engine/types';
import { emailTemplate } from './email';
import { freeTemplate } from './free';

export const TEMPLATES: TaskTemplate[] = [emailTemplate, freeTemplate];

export function getTemplate(id: string): TaskTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/** 홈 카드 표시 순서 = 명세 7.1~7.9 순서 (M0 확정) */
export interface CardInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** 아직 템플릿 미구현(M4 예정) */
  planned?: boolean;
}

export const HOME_CARDS: CardInfo[] = [
  { id: 'email', name: emailTemplate.name, icon: emailTemplate.icon, description: emailTemplate.description },
  { id: 'report', name: '보고서·기획서', icon: '📄', description: '핵심 내용만 주면 문서 초안을 잡아요', planned: true },
  { id: 'summarize', name: '요약·정리', icon: '📋', description: '긴 글을 붙여넣으면 핵심만 남겨요', planned: true },
  { id: 'translate', name: '번역·교정', icon: '🌐', description: '한↔영 번역, 어색한 문장 다듬기', planned: true },
  { id: 'brainstorm', name: '아이디어 발상', icon: '💡', description: '주제만 주면 아이디어를 여러 개 내요', planned: true },
  { id: 'data', name: '데이터·엑셀 분석', icon: '📊', description: '수식 만들기, 차트 추천, 데이터 해석', planned: true },
  { id: 'image', name: '이미지 생성', icon: '🖼️', description: '그리고 싶은 장면을 그림 요청문으로', planned: true },
  { id: 'code', name: '코드·개발 요청', icon: '💻', description: '새 코드, 에러 해결, 코드 설명', planned: true },
  { id: 'free', name: freeTemplate.name, icon: freeTemplate.icon, description: freeTemplate.description },
];
