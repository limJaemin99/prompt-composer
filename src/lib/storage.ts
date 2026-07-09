/**
 * localStorage 설정값 저장 (명세 4장 — 설정값만, 폼 입력 내용은 저장하지 않는다)
 * file:// 환경·시크릿 모드 등에서 접근이 거부될 수 있으므로 전부 try/catch.
 */
import type { DetailLevel, Flavor } from '../engine/types';

const KEY_FLAVOR = 'pg.lastFlavor';
const KEY_DETAIL = 'pg.lastDetail';

const FLAVORS: Flavor[] = ['claude', 'gpt', 'gemini'];
const DETAILS: DetailLevel[] = ['simple', 'standard', 'detailed'];

export function loadLastFlavor(): Flavor {
  try {
    const v = localStorage.getItem(KEY_FLAVOR) as Flavor | null;
    if (v && FLAVORS.includes(v)) return v;
  } catch {
    /* 접근 불가 — 기본값 */
  }
  return 'claude';
}

export function loadLastDetail(): DetailLevel {
  try {
    const v = localStorage.getItem(KEY_DETAIL) as DetailLevel | null;
    if (v && DETAILS.includes(v)) return v;
  } catch {
    /* 접근 불가 — 기본값 */
  }
  return 'standard'; // F2: 기본값 표준
}

export function saveLastFlavor(flavor: Flavor): void {
  try {
    localStorage.setItem(KEY_FLAVOR, flavor);
  } catch {
    /* 저장 실패는 무해 — 무시 */
  }
}

export function saveLastDetail(detail: DetailLevel): void {
  try {
    localStorage.setItem(KEY_DETAIL, detail);
  } catch {
    /* 저장 실패는 무해 — 무시 */
  }
}
