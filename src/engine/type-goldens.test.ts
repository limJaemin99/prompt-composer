/**
 * 유형별 골든 (§10.2) — 구체 입력 + must-contain 어서션.
 * email(§7.10 스냅샷)·free는 golden.test.ts / invariants.test.ts에서 커버.
 * 간단 모드 특칙 3건(image·code·translate, 2026-07-09 확정)도 여기서 잠근다.
 */
import { describe, it, expect } from 'vitest';
import { buildSpec, renderAI } from './render';
import { getTemplate } from '../templates';
import { ASSUME, LANG_KO } from '../templates/common';

const t = (id: string) => getTemplate(id)!;

describe('report 골든', () => {
  const spec = buildSpec(
    t('report'),
    {
      docType: '업무 보고서',
      topic: '3분기 고객 문의 응대 현황',
      content: '문의 1,240건',
      style: '개조식',
      structure: '개요 → 현황 → 개선안',
    },
    'standard',
  );
  const a = renderAI(spec, 'claude', 'standard');

  it('style=개조식 → 개조식 (concise bullet style) 줄 존재', () => {
    expect(a).toContain('개조식 (concise bullet style)');
  });

  it('structure 입력 시 output_format 블록 존재 (값 치환 포함)', () => {
    expect(a).toContain('<output_format>Follow this section order exactly: 개요 → 현황 → 개선안</output_format>');
  });
});

describe('summarize 골든', () => {
  const spec = buildSpec(
    t('summarize'),
    {
      source: '첫째 줄 내용\n둘째 줄 내용\n셋째 줄 내용',
      format: '핵심 불릿',
      amount: '불릿 5~7개',
    },
    'standard',
  );
  const a = renderAI(spec, 'claude', 'standard');

  it('source 값이 펜스 안에 존재', () => {
    expect(a).toContain('```\n첫째 줄 내용\n둘째 줄 내용\n셋째 줄 내용\n```');
  });

  it('원문 보존 요구 2줄 존재', () => {
    expect(a).toContain('Do not add any information');
    expect(a).toContain('Keep all numbers, dates, and names exactly as written in the source.');
  });
});

describe('translate 골든', () => {
  const base = { source: '안녕하세요, 지난주 견적서를 첨부합니다.' };

  it('한→영: professional business English 존재, LANG_KO 부재', () => {
    const spec = buildSpec(t('translate'), { ...base, mode: '한국어 → 영어 번역' }, 'standard');
    const a = renderAI(spec, 'claude', 'standard');
    expect(a).toContain('Output in natural, professional business English.');
    expect(a).not.toContain(LANG_KO.en);
  });

  it('교정 모드: what was changed 줄 + 원문 언어 유지 줄 존재', () => {
    const spec = buildSpec(t('translate'), { ...base, mode: '한국어 문장 교정' }, 'standard');
    const a = renderAI(spec, 'claude', 'standard');
    expect(a).toContain('what was changed and why');
    expect(a).toContain('Keep the corrected text in the same language as the source.');
  });

  it('간단 특칙: 언어 규칙 + ASSUME 2줄 (문구까지 잠금)', () => {
    const spec = buildSpec(t('translate'), { ...base, mode: '한국어 → 영어 번역' }, 'simple');
    const a = renderAI(spec, 'claude', 'simple');
    const req = a.slice(a.indexOf('<requirements>'), a.indexOf('</requirements>'));
    const lines = req.split('\n').filter((l) => l.startsWith('- '));
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('- Output in natural, professional business English.');
    expect(lines[1]).toBe(`- ${ASSUME.en}`);
  });

  it('간단 특칙(교정 모드): 원문 언어 유지 + ASSUME 2줄', () => {
    const spec = buildSpec(t('translate'), { ...base, mode: '영어 문장 교정' }, 'simple');
    const a = renderAI(spec, 'claude', 'simple');
    const req = a.slice(a.indexOf('<requirements>'), a.indexOf('</requirements>'));
    const lines = req.split('\n').filter((l) => l.startsWith('- '));
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('- Keep the corrected text in the same language as the source.');
    expect(lines[1]).toBe(`- ${ASSUME.en}`);
  });

  it('mode는 직접 입력 불가 (allowCustom 예외)', () => {
    const mode = t('translate').fields.find((f) => f.key === 'mode')!;
    expect(mode.allowCustom).toBeUndefined();
  });
});

describe('brainstorm 골든', () => {
  const spec = buildSpec(
    t('brainstorm'),
    { topic: '온보딩 개선', count: '10개', withEval: 'true' },
    'standard',
  );
  const a = renderAI(spec, 'claude', 'standard');

  it('count=10개 → exactly 10 ideas 존재', () => {
    expect(a).toContain('Provide exactly 10 ideas, numbered.');
  });

  it('withEval 체크 → pros/cons 줄 존재', () => {
    expect(a).toContain('one line of pros and one line of cons');
  });

  it('커스텀 count에 숫자가 없으면 count 줄 생략 (분기 안전)', () => {
    const s2 = buildSpec(t('brainstorm'), { topic: '온보딩 개선', count: '많이' }, 'standard');
    expect(renderAI(s2, 'claude', 'standard')).not.toContain('Provide exactly');
  });
});

describe('data 골든', () => {
  const spec = buildSpec(
    t('data'),
    {
      goal: '수식·함수 만들기',
      dataDesc: 'A열 날짜, B열 매출',
      want: '월 합계',
      tool: 'Excel',
      level: '초급 — 자세한 설명 필요',
    },
    'standard',
  );
  const a = renderAI(spec, 'claude', 'standard');

  it('level=초급 → step by step 존재', () => {
    expect(a).toContain('Explain step by step');
  });

  it('tool=Excel → Excel 타겟팅 줄 존재', () => {
    expect(a).toContain('Target Excel specifically; use its exact function names and menu paths.');
  });
});

describe('image 골든', () => {
  const values = {
    subject: '흰색 강아지',
    usage: '발표자료용',
    avoid: '이미지 안에 글자 넣지 말 것',
  };
  const spec = buildSpec(t('image'), values, 'standard');
  const a = renderAI(spec, 'gpt', 'standard');

  it('defaultFlavor가 gpt', () => {
    expect(t('image').defaultFlavor).toBe('gpt');
  });

  it('usage=발표자료용 → 16:9 존재', () => {
    expect(a).toContain('16:9');
  });

  it('avoid 입력 → Strictly exclude 존재', () => {
    expect(a).toContain('Strictly exclude');
  });

  it('LANG_KO 부재 (전 상세도)', () => {
    for (const d of ['simple', 'standard', 'detailed'] as const) {
      expect(renderAI(buildSpec(t('image'), values, d), 'gpt', d)).not.toContain(LANG_KO.en);
    }
  });

  it('간단 특칙: usage + tasteful defaults 2줄, 표준과 동일한 순서 (요구사항 0줄 방지)', () => {
    const s = buildSpec(t('image'), values, 'simple');
    const a2 = renderAI(s, 'claude', 'simple');
    const req = a2.slice(a2.indexOf('<requirements>'), a2.indexOf('</requirements>'));
    const lines = req.split('\n').filter((l) => l.startsWith('- '));
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('16:9'); // usage 먼저 (표준 나열 순서와 동일 — 문서 v2 §7.7 특칙)
    expect(lines[1]).toContain('tasteful defaults');
  });

  it('간단 특칙: usage 미선택이면 tasteful defaults 1줄', () => {
    const s = buildSpec(t('image'), { subject: '흰색 강아지' }, 'simple');
    const a2 = renderAI(s, 'claude', 'simple');
    const req = a2.slice(a2.indexOf('<requirements>'), a2.indexOf('</requirements>'));
    expect(req.split('\n').filter((l) => l.startsWith('- '))).toHaveLength(1);
  });
});

describe('code 골든', () => {
  const spec = buildSpec(
    t('code'),
    {
      kind: '에러 해결',
      env: 'Python 3.11',
      want: '인코딩 오류 해결',
      code: 'line one\nline two\nline three of error',
    },
    'standard',
  );
  const a = renderAI(spec, 'claude', 'standard');

  it('code 필드 값이 펜스 안에 존재', () => {
    expect(a).toContain('```\nline one\nline two\nline three of error\n```');
  });

  it('kind=에러 해결 → root cause 존재', () => {
    expect(a).toContain('root cause');
  });

  it('complete, runnable code 존재', () => {
    expect(a).toContain('complete, runnable code');
  });

  it('간단 특칙: Respond in Korean + State assumptions 2줄', () => {
    const a2 = renderAI(spec, 'claude', 'simple');
    const req = a2.slice(a2.indexOf('<requirements>'), a2.indexOf('</requirements>'));
    const lines = req.split('\n').filter((l) => l.startsWith('- '));
    expect(lines).toHaveLength(2);
    expect(req).toContain('Respond in Korean');
    expect(req).toContain('State any assumptions');
  });
});
