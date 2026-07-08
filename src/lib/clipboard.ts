/**
 * 클립보드 복사 유틸.
 * 1) navigator.clipboard.writeText 우선 시도
 * 2) 실패 시 숨김 textarea + document.execCommand('copy') 폴백
 *
 * file:// 환경에서 clipboard API가 거부될 수 있으므로(M1 검증 항목)
 * 어느 경로로 성공/실패했는지 결과에 담아 진단할 수 있게 한다.
 */

export type CopyMethod = 'clipboard-api' | 'execCommand';

export interface CopyResult {
  ok: boolean;
  /** 성공 또는 마지막으로 시도한 방법 */
  method: CopyMethod | null;
  error?: string;
}

export async function copyText(text: string): Promise<CopyResult> {
  // 1차: Clipboard API (secure context가 아니면 navigator.clipboard 자체가 undefined일 수 있음)
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true, method: 'clipboard-api' };
    } catch {
      // 거부/미지원 — 폴백으로 진행
    }
  }

  // 2차: 숨김 textarea + execCommand('copy') 폴백
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length); // 일부 환경에서 select()만으로 부족
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok
      ? { ok: true, method: 'execCommand' }
      : { ok: false, method: 'execCommand', error: "execCommand('copy')가 false를 반환했어요." };
  } catch (e) {
    return { ok: false, method: 'execCommand', error: String(e) };
  }
}
