/**
 * 내 프롬프트 저장소 (명세 §7.11)
 * localStorage 키: pg.myPrompts = CustomPrompt[] (최대 50개)
 * - 용량 경고: 직렬화 4MB 초과 시 경고 (localStorage 통상 쿼터 ~5MB 대비)
 * - QuotaExceededError를 잡아 데이터 유실 없이 실패를 알린다
 * - 가져오기: 배열 검증, name·body 필수, id 충돌 시 새 uuid + "이름 (가져옴)" 사본,
 *   50개 상한 초과분은 스킵하고 개수를 보고 (2026-07-09 확정 정책)
 */
import type { CustomPrompt } from '../engine/custom';
import { normalizeBody } from '../engine/custom';

const KEY = 'pg.myPrompts';
export const MAX_PROMPTS = 50;
const WARN_BYTES = 4 * 1024 * 1024;

export function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* 폴백으로 */
  }
  // 구형 환경 폴백 — 충돌 확률 무시 가능한 수준
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadPrompts(): CustomPrompt[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 외부 편집·손상으로 id/시각이 빠진 항목은 보정해 반환 (id 기반 수정·삭제 오동작 방지)
    return parsed.filter(isValidPrompt).map((p) => {
      const now = new Date().toISOString();
      const o = p as CustomPrompt & Record<string, unknown>;
      return {
        id: typeof o.id === 'string' && o.id !== '' ? o.id : newId(),
        name: o.name,
        body: o.body,
        createdAt: typeof o.createdAt === 'string' && o.createdAt ? o.createdAt : now,
        updatedAt: typeof o.updatedAt === 'string' && o.updatedAt ? o.updatedAt : now,
      };
    });
  } catch {
    return [];
  }
}

export interface SaveResult {
  ok: boolean;
  /** 저장은 됐지만 용량이 임박 */
  warning?: string;
  /** 저장 실패 (쿼터 초과 등) */
  error?: string;
}

export function savePrompts(list: CustomPrompt[]): SaveResult {
  const json = JSON.stringify(list);
  try {
    localStorage.setItem(KEY, json);
  } catch {
    return {
      ok: false,
      error: '저장 공간이 가득 차서 저장하지 못했어요. 안 쓰는 프롬프트를 삭제해 주세요.',
    };
  }
  if (json.length * 2 > WARN_BYTES) {
    // JS 문자열은 UTF-16 — 대략적 바이트 추정으로 조기 경고
    return { ok: true, warning: '저장 공간이 거의 찼어요. 안 쓰는 프롬프트를 정리해 주세요.' };
  }
  return { ok: true };
}

export function createPrompt(name: string, body: string): CustomPrompt {
  const now = new Date().toISOString();
  return { id: newId(), name: name.trim(), body: normalizeBody(body), createdAt: now, updatedAt: now };
}

function isValidPrompt(p: unknown): p is CustomPrompt {
  if (typeof p !== 'object' || p === null) return false;
  const o = p as Record<string, unknown>;
  return typeof o.name === 'string' && o.name.trim() !== '' && typeof o.body === 'string';
}

/** 이름 충돌을 피해 "(가져옴)", "(가져옴 2)" … 를 붙인다 */
function importedName(base: string, taken: Set<string>): string {
  let candidate = `${base} (가져옴)`;
  let n = 2;
  while (taken.has(candidate)) {
    candidate = `${base} (가져옴 ${n})`;
    n += 1;
  }
  return candidate;
}

export interface ImportResult {
  /** 기존 목록 + 수용된 항목의 새 전체 목록 */
  merged: CustomPrompt[];
  added: number;
  /** id 충돌로 "(가져옴)" 사본 처리된 수 */
  renamed: number;
  /** 50개 상한 때문에 스킵된 수 */
  skippedOverLimit: number;
  /** 형식 불량으로 스킵된 수 */
  invalid: number;
  /** 최상위가 배열이 아님 등 파일 자체가 잘못됨 */
  fileError?: string;
}

export function parseImport(jsonText: string, existing: CustomPrompt[]): ImportResult {
  const base: ImportResult = {
    merged: existing,
    added: 0,
    renamed: 0,
    skippedOverLimit: 0,
    invalid: 0,
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText.replace(/^\uFEFF/, ''));
  } catch {
    return { ...base, fileError: 'JSON 파일을 읽지 못했어요. 내보내기로 만든 파일인지 확인해 주세요.' };
  }
  if (!Array.isArray(parsed)) {
    return { ...base, fileError: '파일 형식이 달라요. [모두 내보내기]로 만든 JSON 파일을 선택해 주세요.' };
  }

  const merged = [...existing];
  const ids = new Set(existing.map((p) => p.id));
  const names = new Set(existing.map((p) => p.name));
  let added = 0;
  let renamed = 0;
  let skippedOverLimit = 0;
  let invalid = 0;

  for (const item of parsed) {
    if (!isValidPrompt(item)) {
      invalid += 1;
      continue;
    }
    if (merged.length >= MAX_PROMPTS) {
      skippedOverLimit += 1;
      continue;
    }
    const now = new Date().toISOString();
    const src = item as CustomPrompt & Record<string, unknown>;
    const idCollision = typeof src.id === 'string' && ids.has(src.id);
    const entry: CustomPrompt = {
      // id 충돌이면 덮어쓰지 않고 새 uuid의 사본으로 (명세 §7.11 + 2026-07-09 확정)
      id: idCollision || typeof src.id !== 'string' || src.id === '' ? newId() : src.id,
      name: idCollision ? importedName(src.name, names) : src.name,
      body: normalizeBody(src.body),
      createdAt: typeof src.createdAt === 'string' && src.createdAt ? src.createdAt : now,
      updatedAt: typeof src.updatedAt === 'string' && src.updatedAt ? src.updatedAt : now,
    };
    if (idCollision) renamed += 1;
    ids.add(entry.id);
    names.add(entry.name);
    merged.push(entry);
    added += 1;
  }

  return { merged, added, renamed, skippedOverLimit, invalid };
}

export function exportJson(prompts: CustomPrompt[]): string {
  return JSON.stringify(prompts, null, 2);
}
