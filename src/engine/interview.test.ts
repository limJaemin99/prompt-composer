/**
 * 기능 A — 인터뷰 체크박스 골든 (v2 §4-4, refine 골든 패턴 복제)
 * ① claude → <meta_instruction> 시작 / gpt·gemini → ## Meta instruction 시작
 * ② 래퍼 아래 원래 출력 A 전문이 그대로 존재 (원문 무변형)
 * ③ 출력 B에 [AI가 먼저 질문함] 줄 존재/부재 + 패리티 제외
 * ④ ASSUME 오버라이드 문장이 래퍼에 포함 (§4 핵심 디테일 1, §6-8)
 * ⑤ refine ↔ interview 상호 배타는 buildHumanModel 레벨에서 확인
 * (체크박스 UI 상호 배타·비활성은 E2E가 커버)
 */
import { describe, it, expect } from 'vitest';
import { renderInterviewWrapper, renderRefineWrapper } from './refine';
import { buildSpec, buildHumanModel, renderAI, renderHuman } from './render';
import { emailTemplate } from '../templates/email';

const VALUES = {
  recipient: '팀장님',
  purpose: '보고',
  keyMessage: '주간 실적 요약 보고',
};
const spec = buildSpec(emailTemplate, VALUES, 'standard');

describe('interview 골든 — 래퍼 형식 (§4)', () => {
  const pure = renderAI(spec, 'claude', 'standard');

  it('claude: <meta_instruction>으로 시작하고 원본 A 전문이 그대로 이어진다', () => {
    const wrapped = renderInterviewWrapper(pure, 'claude');
    expect(wrapped.startsWith('<meta_instruction>\n')).toBe(true);
    expect(wrapped).toContain('</meta_instruction>\n\n');
    expect(wrapped.endsWith(pure)).toBe(true); // 원문 무변형 — 뒤에 통째로 존재
  });

  it('gpt·gemini: ## Meta instruction으로 시작 (XML 태그 없음), 두 플레이버 동일', () => {
    const pureGpt = renderAI(spec, 'gpt', 'standard');
    const wrapped = renderInterviewWrapper(pureGpt, 'gpt');
    expect(wrapped.startsWith('## Meta instruction\n')).toBe(true);
    expect(wrapped).not.toContain('<meta_instruction>');
    expect(wrapped.endsWith(pureGpt)).toBe(true);
    expect(renderInterviewWrapper(pureGpt, 'gemini')).toBe(wrapped);
  });

  it('④ 인터뷰 지시 + ASSUME 오버라이드 문장이 문면 그대로 포함된다', () => {
    const wrapped = renderInterviewWrapper(pure, 'claude');
    expect(wrapped).toContain('interview me first: ask the 3 to 5 most');
    expect(wrapped).toContain(
      'This interview step intentionally overrides any instruction below that\nsays not to ask follow-up questions',
    );
    expect(wrapped).toContain('If I reply "그냥 진행해줘"');
  });

  it('refine 래퍼와는 다른 문면이다 (먼저 질문 ≠ 먼저 다듬기)', () => {
    const iv = renderInterviewWrapper(pure, 'claude');
    const rf = renderRefineWrapper(pure, 'claude');
    expect(iv).not.toBe(rf);
    expect(iv).toContain('interview me first');
    expect(rf).toContain('rewrite it into the most effective prompt');
    expect(rf).not.toContain('interview me first');
  });
});

describe('interview 골든 — 출력 B [AI가 먼저 질문함] 줄 (§4-3)', () => {
  it('체크 시 블록 존재, 해제 시 부재', () => {
    const on = renderHuman(spec, 'standard', { interview: true });
    const off = renderHuman(spec, 'standard');
    expect(on).toContain(
      '[AI가 먼저 질문함]\n붙여넣는 곳의 AI가 먼저 3~5개를 질문한 뒤, 답을 반영해 결과를 만듭니다.',
    );
    expect(off).not.toContain('[AI가 먼저 질문함]');
  });

  it('③ 체크 토글이 A/B 패리티(§10.1-2)를 깨지 않는다 — 요구사항 줄 수 불변', () => {
    const reqCount = (b: string) => {
      const start = b.indexOf('[지켜야 할 조건]');
      const seg = b.slice(start).split('\n\n')[0];
      return seg.split('\n').filter((l) => l.startsWith('- ')).length;
    };
    expect(reqCount(renderHuman(spec, 'standard', { interview: true }))).toBe(
      reqCount(renderHuman(spec, 'standard')),
    );
  });
});

describe('interview ↔ refine 상호 배타 (§6-7) — 모델 레벨', () => {
  it('두 옵션이 동시에 참이면 안 되지만, 방어적으로 각 노트는 독립 필드다', () => {
    // UI가 동시 체크를 막지만(E2E 검증), 모델은 각 플래그를 독립 처리한다
    const onlyInterview = buildHumanModel(spec, 'standard', { interview: true });
    expect(onlyInterview.interviewNote).toBeTruthy();
    expect(onlyInterview.refineNote).toBeNull();

    const onlyRefine = buildHumanModel(spec, 'standard', { refine: true });
    expect(onlyRefine.refineNote).toBeTruthy();
    expect(onlyRefine.interviewNote).toBeNull();

    const neither = buildHumanModel(spec, 'standard');
    expect(neither.refineNote).toBeNull();
    expect(neither.interviewNote).toBeNull();
  });
});
