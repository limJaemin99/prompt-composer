import { describe, it, expect } from 'vitest';
import { UTF8_BOM, sanitizeFilename, formatTimestamp } from './download';

describe('sanitizeFilename', () => {
  it('금지 문자 9종(\\ / : * ? " < > |)을 전부 _로 치환한다', () => {
    expect(sanitizeFilename('a\\b/c:d*e?f"g<h>i|j')).toBe('a_b_c_d_e_f_g_h_i_j');
  });

  it('한글·공백·괄호 등 일반 문자는 그대로 유지한다', () => {
    expect(sanitizeFilename('프롬프트_이메일·메시지 작성_20260708_2310.txt')).toBe(
      '프롬프트_이메일·메시지 작성_20260708_2310.txt',
    );
  });
});

describe('formatTimestamp', () => {
  it('YYYYMMDD_HHmm 패턴으로 만든다 (명세 6.1 파일명 규칙)', () => {
    expect(formatTimestamp(new Date(2026, 6, 8, 9, 5))).toBe('20260708_0905');
  });
});

describe('UTF8_BOM', () => {
  it('U+FEFF 한 글자다 (메모장 한글 깨짐 방지)', () => {
    expect(UTF8_BOM).toBe('\uFEFF');
    expect(UTF8_BOM.length).toBe(1);
  });
});
