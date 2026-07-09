import { describe, it, expect } from 'vitest';
import {
  UTF8_BOM,
  sanitizeFilename,
  formatTimestamp,
  buildPromptFilename,
  buildSummaryFilename,
  buildSummaryHeader,
} from './download';

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

describe('다운로드 파일명 (명세 6.1)', () => {
  const d = new Date(2026, 6, 9, 14, 30);

  it('A: 프롬프트_{유형}_{YYYYMMDD_HHmm}.txt 패턴', () => {
    expect(buildPromptFilename('이메일·메시지 작성', d)).toBe(
      '프롬프트_이메일·메시지 작성_20260709_1430.txt',
    );
  });

  it('B: 프롬프트요약_{유형}_{YYYYMMDD_HHmm}.txt 패턴', () => {
    expect(buildSummaryFilename('자유 입력', d)).toBe('프롬프트요약_자유 입력_20260709_1430.txt');
  });

  it('유형 이름에 금지 문자가 있으면 _로 치환된다', () => {
    expect(buildPromptFilename('한/영 번역', d)).toBe('프롬프트_한_영 번역_20260709_1430.txt');
  });

  it('B 헤더: 생성 도구/일시/유형 2줄', () => {
    const header = buildSummaryHeader('이메일·메시지 작성', d);
    expect(header.split('\n')).toHaveLength(2);
    expect(header).toBe(
      '생성 도구: 프롬프트 생성기\n생성 일시: 2026-07-09 14:30 · 유형: 이메일·메시지 작성',
    );
  });
});

describe('UTF8_BOM', () => {
  it('U+FEFF 한 글자다 (메모장 한글 깨짐 방지)', () => {
    expect(UTF8_BOM).toBe('\uFEFF');
    expect(UTF8_BOM.length).toBe(1);
  });
});
