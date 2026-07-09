/**
 * §7.10 골든 스냅샷 테스트 — 구현이 명세 기대 출력과 완전 일치해야 한다 (§10.2 email).
 * fixture는 명세 §7.10 블록을 그대로 커밋한 것. 렌더러는 트레일링 뉴라인 없이
 * 출력하므로 fixture 끝 개행 1개만 정규화해 비교한다.
 */
import { describe, it, expect } from 'vitest';
import { buildSpec, renderAI, renderHuman } from './render';
import { emailTemplate } from '../templates/email';
import goldenClaude from './golden/email.claude.txt?raw';
import goldenGpt from './golden/email.gpt.txt?raw';
import goldenHuman from './golden/email.human.txt?raw';

/** §7.10 골든 입력 */
const GOLDEN_VALUES: Record<string, string> = {
  channel: '이메일',
  recipient: '거래처 김 과장님 (외부, 격식 필요)',
  purpose: '요청',
  keyMessage: '다음 주 화요일 예정 미팅을 목요일로 연기 요청',
  tone: '정중하고 격식 있게',
  mustInclude: '일정 변경에 대한 사과 한 줄',
  length: '보통',
};

const fix = (s: string) => s.replace(/\r\n/g, '\n').replace(/\n$/, '');

describe('§7.10 골든 — email 표준', () => {
  const spec = buildSpec(emailTemplate, GOLDEN_VALUES, 'standard');

  it('출력 A(claude)가 기대 출력과 완전 일치한다', () => {
    expect(renderAI(spec, 'claude', 'standard')).toBe(fix(goldenClaude));
  });

  it('출력 A(gpt)가 기대 출력과 완전 일치한다', () => {
    expect(renderAI(spec, 'gpt', 'standard')).toBe(fix(goldenGpt));
  });

  it('gemini는 gpt와 동일 렌더러를 공유한다 (§5.3)', () => {
    expect(renderAI(spec, 'gemini', 'standard')).toBe(renderAI(spec, 'gpt', 'standard'));
  });

  it('출력 B가 기대 출력과 완전 일치한다', () => {
    expect(renderHuman(spec, 'standard')).toBe(fix(goldenHuman));
  });
});

describe('§7.10 상세도 차이 — 같은 spec', () => {
  const spec = buildSpec(emailTemplate, GOLDEN_VALUES, 'standard');

  it('간단: role 블록과 output_format 없음, requirements는 LANG_KO+ASSUME 2줄', () => {
    const a = renderAI(spec, 'claude', 'simple');
    expect(a).not.toContain('<role>');
    expect(a).not.toContain('<output_format>');
    expect(a).toContain('Write the entire output in natural, professional Korean.');
    expect(a).toContain('If critical information is missing');
    const reqBlock = a.slice(a.indexOf('<requirements>'), a.indexOf('</requirements>'));
    expect(reqBlock.split('\n').filter((l) => l.startsWith('- '))).toHaveLength(2);
  });

  it('상세: 표준 + 격식·인사 2줄 + SELFCHECK가 마지막 줄', () => {
    const a = renderAI(spec, 'claude', 'detailed');
    expect(a).toContain('Match the level of formality precisely to the recipient description.');
    expect(a).toContain(
      'Keep the opening pleasantries brief; get to the point within the first two or three sentences.',
    );
    const reqBlock = a.slice(a.indexOf('<requirements>'), a.indexOf('</requirements>'));
    const reqLines = reqBlock.split('\n').filter((l) => l.startsWith('- '));
    expect(reqLines[reqLines.length - 1]).toBe(
      '- Before finalizing, silently verify your output satisfies every requirement above.',
    );
  });
});
