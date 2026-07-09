import { describe, it, expect } from 'vitest';
import type { FieldDef } from './types';
import { isFieldVisible } from './visibility';

const plain: FieldDef = { key: 'a', label: { en: 'A', ko: '에이' }, widget: 'text' };
const conditional: FieldDef = {
  key: 'b',
  label: { en: 'B', ko: '비' },
  widget: 'text',
  showIf: { key: 'a', equals: '이메일' },
};

describe('showIf 조건부 노출 (§5.2 — v1 내장 유형 사용처 없음, 인프라 검증)', () => {
  it('showIf가 없으면 항상 보인다', () => {
    expect(isFieldVisible(plain, {})).toBe(true);
  });

  it('조건 충족 시 보인다', () => {
    expect(isFieldVisible(conditional, { a: '이메일' })).toBe(true);
  });

  it('조건 미충족·키 부재 시 숨는다', () => {
    expect(isFieldVisible(conditional, { a: '문자' })).toBe(false);
    expect(isFieldVisible(conditional, {})).toBe(false);
  });
});
