/**
 * refine(C층 체크박스) 골든 (§10.2 v2)
 * ① claude → <meta_instruction> 시작 / gpt·gemini → ## Meta instruction 시작
 * ② 메타 지시문 아래에 원래 출력 A 전문이 그대로 존재 (체크 해제 시 출력과 부분일치)
 * ③ 출력 B에 [AI가 먼저 다듬음] 줄 존재/부재
 * ④ 체크 토글이 A/B 패리티(§10.1-2) 계산을 깨지 않음
 */
import { describe, it, expect } from 'vitest';
import { renderRefineWrapper } from './refine';
import { buildSpec, renderAI, renderHuman } from './render';
import { emailTemplate } from '../templates/email';

const VALUES = {
  recipient: '팀장님',
  purpose: '보고',
  keyMessage: '주간 실적 요약 보고',
};

const spec = buildSpec(emailTemplate, VALUES, 'standard');

describe('refine 골든 — 래퍼 형식 (§8)', () => {
  const pure = renderAI(spec, 'claude', 'standard');

  it('claude: <meta_instruction>으로 시작하고 원본 A 전문이 그대로 이어진다', () => {
    const wrapped = renderRefineWrapper(pure, 'claude');
    expect(wrapped.startsWith('<meta_instruction>\n')).toBe(true);
    expect(wrapped).toContain('</meta_instruction>\n\n');
    expect(wrapped.endsWith(pure)).toBe(true); // 원본 무변형 — 뒤에 통째로 존재
  });

  it('gpt·gemini: ## Meta instruction으로 시작 (XML 태그 없음)', () => {
    const pureGpt = renderAI(spec, 'gpt', 'standard');
    const wrapped = renderRefineWrapper(pureGpt, 'gpt');
    expect(wrapped.startsWith('## Meta instruction\n')).toBe(true);
    expect(wrapped).not.toContain('<meta_instruction>');
    expect(wrapped.endsWith(pureGpt)).toBe(true);
    expect(renderRefineWrapper(pureGpt, 'gemini')).toBe(wrapped); // gemini = gpt 형식 공유
  });

  it('메타 지시문 3문장(§8 문면)이 포함된다', () => {
    const wrapped = renderRefineWrapper(pure, 'claude');
    expect(wrapped).toContain('Below is a structured specification of my request.');
    expect(wrapped).toContain('Step 1 (do this silently)');
    expect(wrapped).toContain('Do not show the rewritten prompt.');
  });
});

describe('refine 골든 — 출력 B [AI가 먼저 다듬음] 줄 (§5.4 v2)', () => {
  it('체크 시 [AI가 먼저 다듬음] 블록 존재, 해제 시 부재 (2026-07-09 명칭 개편)', () => {
    const on = renderHuman(spec, 'standard', { refine: true });
    const off = renderHuman(spec, 'standard');
    expect(on).toContain(
      '[AI가 먼저 다듬음]\n붙여넣는 곳의 AI가 이 요청을 먼저 스스로 다듬은 뒤 답합니다.',
    );
    expect(off).not.toContain('[AI가 먼저 다듬음]');
  });

  it('④ 체크 토글이 A/B 패리티를 깨지 않는다 — 요구사항 줄 수 불변', () => {
    const reqCount = (b: string) => {
      const start = b.indexOf('[지켜야 할 조건]');
      const seg = b.slice(start).split('\n\n')[0];
      return seg.split('\n').filter((l) => l.startsWith('- ')).length;
    };
    const off = renderHuman(spec, 'standard');
    const on = renderHuman(spec, 'standard', { refine: true });
    expect(reqCount(on)).toBe(reqCount(off)); // [AI가 먼저 다듬음]은 패리티 계산 제외 (§5.4)
    // A 쪽: 래퍼는 requirements 블록을 건드리지 않는다
    const a = renderAI(spec, 'claude', 'standard');
    const wrapped = renderRefineWrapper(a, 'claude');
    const aReq = a.slice(a.indexOf('<requirements>'), a.indexOf('</requirements>'));
    expect(wrapped).toContain(aReq);
  });
});
