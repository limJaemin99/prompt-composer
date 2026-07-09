/**
 * custom(내 프롬프트) 골든 (§10.2) + 치환 엔진 엣지.
 * ① 골격 보존(변수 자리 외 완전 일치 — 문자 단위로 잠금) ② 동일 변수 다중 치환
 * ③ 변수 0개 ④ JSON 라운드트립 무손실 ⑤ id 충돌 "(가져옴)" 사본
 */
import { beforeEach, describe, it, expect } from 'vitest';
import {
  extractVariables,
  findInvalidVariables,
  normalizeBody,
  substituteVariables,
} from './custom';
import type { CustomPrompt } from './custom';
import {
  MAX_PROMPTS,
  exportJson,
  loadPrompts,
  parseImport,
  savePrompts,
} from '../lib/customStore';

// ── ① 골격 보존 ─────────────────────────────────────────────

describe('custom 골든 ① — 골격 보존 (철칙)', () => {
  it('변수 자리를 제외한 모든 문자가 등록 원문과 완전히 일치한다', () => {
    const body = '너는 {{역할}} 전문가다.\n\n주제: {{주제}}\n조건:\n- 정확하게\n- {{주제}} 중심으로';
    const result = substituteVariables(body, { 역할: '마케팅', 주제: '신제품 출시' });
    // 기대 문자열을 수동 조립 — 골격의 모든 문자(개행·공백 포함)가 그대로임을 문자 단위로 확인
    expect(result).toBe(
      '너는 마케팅 전문가다.\n\n주제: 신제품 출시\n조건:\n- 정확하게\n- 신제품 출시 중심으로',
    );
  });

  it('값에 $&, $1, $$ 가 있어도 그대로 삽입된다 (replace 특수 패턴 미해석)', () => {
    expect(substituteVariables('금액: {{금액}}', { 금액: '$100 ($& $1 $$)' })).toBe(
      '금액: $100 ($& $1 $$)',
    );
  });

  it('값에 {{다른변수}} 가 있어도 재치환되지 않는다 (단일 패스)', () => {
    const r = substituteVariables('{{a}} 그리고 {{b}}', { a: '{{b}}', b: 'B값' });
    expect(r).toBe('{{b}} 그리고 B값');
  });

  it('값이 없는 변수는 토큰 원문 그대로 남는다', () => {
    expect(substituteVariables('안녕 {{이름}}, {{미정}}', { 이름: '재민' })).toBe(
      '안녕 재민, {{미정}}',
    );
  });

  it('빈 이름 토큰({{ }}, {{}})은 빈 키에 값을 넣어도 치환되지 않는다', () => {
    const body = '이건 {{ }} 그대로, {{}} 도 그대로';
    expect(extractVariables(body)).toEqual([]);
    expect(substituteVariables(body, { '': '침투값' })).toBe(body); // 빈 키 값이 있어도 원문 유지
  });

  it('JS 내장 프로퍼티명 변수({{toString}} 등)가 상속 값으로 오염되지 않는다', () => {
    // hasOwnProperty 가드가 없으면 Object.prototype.toString 함수가 문자열화되어 삽입된다
    expect(substituteVariables('주의: {{toString}}', {})).toBe('주의: {{toString}}');
    expect(substituteVariables('주의: {{constructor}}', {})).toBe('주의: {{constructor}}');
    expect(substituteVariables('값: {{toString}}', { toString: '정상 값' })).toBe('값: 정상 값');
  });
});

// ── ② 동일 변수 다중 치환 ───────────────────────────────────

describe('custom 골든 ② — 동일 이름 변수', () => {
  it('3회 등장한 같은 변수가 1개 입력으로 전부 치환된다', () => {
    const body = '{{제품}}을 소개한다. {{제품}}의 장점은? {{제품}} 요약.';
    const r = substituteVariables(body, { 제품: '프롬프트 생성기' });
    expect(r.split('프롬프트 생성기')).toHaveLength(4); // 3회 치환
    expect(r).not.toContain('{{제품}}');
  });

  it('공백만 다른 토큰({{주제}}/{{ 주제 }})은 한 변수로 묶이고 전부 치환된다', () => {
    const body = 'A: {{주제}} / B: {{ 주제 }}';
    expect(extractVariables(body)).toEqual(['주제']);
    expect(substituteVariables(body, { 주제: '요약' })).toBe('A: 요약 / B: 요약');
  });

  it('변수 필드 순서는 본문 최초 등장 순서다', () => {
    expect(extractVariables('{{b}} {{a}} {{b}} {{c}}')).toEqual(['b', 'a', 'c']);
  });
});

// ── ③ 변수 0개 ─────────────────────────────────────────────

describe('custom 골든 ③ — 변수 0개', () => {
  it('변수가 없으면 빈 목록이고 치환해도 원문 그대로다 (폼 스킵 근거)', () => {
    const body = '항상 같은 내용의 프롬프트.';
    expect(extractVariables(body)).toEqual([]);
    expect(substituteVariables(body, {})).toBe(body);
  });
});

// ── 정규화·검증 엣지 ────────────────────────────────────────

describe('normalizeBody / findInvalidVariables', () => {
  it('선두 BOM 제거 + CRLF/CR → LF (등록 시 1회만 적용되는 정규화)', () => {
    expect(normalizeBody('﻿첫 줄\r\n둘째 줄\r셋째 줄')).toBe('첫 줄\n둘째 줄\n셋째 줄');
  });

  it('중첩 {{}} 은 잘못된 변수명으로 검출된다', () => {
    expect(findInvalidVariables('{{겉 {{속}}}}').length).toBeGreaterThan(0);
    expect(findInvalidVariables('정상 {{주제}} 뿐')).toEqual([]);
  });
});

// ── localStorage 기반 저장소 (인메모리 목) ──────────────────

function mockStorage(): void {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

function fixture(id: string, name: string, body = '본문 {{x}}'): CustomPrompt {
  return { id, name, body, createdAt: '2026-07-09T00:00:00.000Z', updatedAt: '2026-07-09T00:00:00.000Z' };
}

describe('custom 골든 ④ — JSON 내보내기/가져오기 라운드트립', () => {
  beforeEach(mockStorage);

  it('내보내기 → 빈 저장소에 가져오기 → 무손실 (id·이름·본문·시각 유지)', () => {
    const original = [fixture('id-1', '주간보고'), fixture('id-2', '메일 톤 교정', '{{원문}}을 다듬어줘')];
    const json = exportJson(original);
    const r = parseImport(json, []);
    expect(r.fileError).toBeUndefined();
    expect(r.added).toBe(2);
    expect(r.renamed).toBe(0);
    expect(r.merged).toEqual(original);
  });

  it('저장 → 로드 라운드트립', () => {
    const list = [fixture('id-1', '주간보고')];
    expect(savePrompts(list).ok).toBe(true);
    expect(loadPrompts()).toEqual(list);
  });

  it('저장 공간 초과(setItem throw) 시 데이터 유실 없이 error를 반환한다', () => {
    const original = globalThis.localStorage;
    globalThis.localStorage = {
      ...original,
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError');
      },
    } as Storage;
    const r = savePrompts([fixture('id-1', '주간보고')]);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('저장 공간');
    globalThis.localStorage = original;
  });

  it('외부 손상으로 id가 빠진 항목은 로드 시 보정된다', () => {
    localStorage.setItem('pg.myPrompts', JSON.stringify([{ name: '손상 항목', body: 'b' }]));
    const loaded = loadPrompts();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBeTruthy();
    expect(loaded[0].createdAt).toBeTruthy();
  });
});

describe('custom 골든 ⑤ — id 충돌 가져오기', () => {
  beforeEach(mockStorage);

  it('같은 id가 있으면 덮어쓰지 않고 새 id의 "(가져옴)" 사본을 만든다', () => {
    const existing = [fixture('id-1', '주간보고')];
    const r = parseImport(exportJson([fixture('id-1', '주간보고', '다른 본문 {{y}}')]), existing);
    expect(r.added).toBe(1);
    expect(r.renamed).toBe(1);
    expect(r.merged).toHaveLength(2);
    const copy = r.merged[1];
    expect(copy.id).not.toBe('id-1'); // 새 uuid — 동일 id 2개 존재 금지
    expect(copy.name).toBe('주간보고 (가져옴)');
    expect(copy.body).toBe('다른 본문 {{y}}');
    expect(r.merged[0]).toEqual(existing[0]); // 원본 무손상
  });

  it('이름이 또 겹치면 "(가져옴 2)" 로 넘버링된다', () => {
    const existing = [fixture('id-1', '주간보고'), fixture('id-9', '주간보고 (가져옴)')];
    const r = parseImport(exportJson([fixture('id-1', '주간보고')]), existing);
    expect(r.merged[2].name).toBe('주간보고 (가져옴 2)');
  });
});

describe('가져오기 검증·상한 정책', () => {
  beforeEach(mockStorage);

  it('배열이 아니면 fileError', () => {
    expect(parseImport('{"name":"x"}', []).fileError).toBeTruthy();
    expect(parseImport('불량 텍스트', []).fileError).toBeTruthy();
  });

  it('name/body 없는 항목은 invalid로 스킵하고 나머지는 수용', () => {
    const json = JSON.stringify([{ name: '정상', body: 'b' }, { name: '', body: 'b' }, { body: 'no-name' }]);
    const r = parseImport(json, []);
    expect(r.added).toBe(1);
    expect(r.invalid).toBe(2);
  });

  it('50개 상한 초과분은 스킵하고 개수를 보고한다', () => {
    const existing = Array.from({ length: MAX_PROMPTS - 1 }, (_, i) => fixture(`e-${i}`, `기존 ${i}`));
    const incoming = exportJson([fixture('n-1', '새 1'), fixture('n-2', '새 2')]);
    const r = parseImport(incoming, existing);
    expect(r.added).toBe(1);
    expect(r.skippedOverLimit).toBe(1);
    expect(r.merged).toHaveLength(MAX_PROMPTS);
  });

  it('id가 없는 항목은 새 id를 발급받아 수용된다', () => {
    const r = parseImport(JSON.stringify([{ name: '아이디 없음', body: 'b' }]), []);
    expect(r.added).toBe(1);
    expect(r.merged[0].id).toBeTruthy();
  });
});
