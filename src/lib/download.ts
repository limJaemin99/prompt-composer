/**
 * 파일 다운로드 유틸.
 * Blob + URL.createObjectURL + a[download] 방식 (명세 4장).
 * 모든 .txt는 UTF-8 BOM 포함 — Windows 메모장 더블클릭에서 한글이 깨지지 않아야 한다.
 */

/** UTF-8 BOM (U+FEFF). 메모장이 UTF-8로 인식하게 하는 표식 */
export const UTF8_BOM = '\uFEFF';

/** 파일명에 쓸 수 없는 문자(\ / : * ? " < > |)를 _로 치환 (명세 6.1) */
export function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}

/** 다운로드 파일명 타임스탬프: YYYYMMDD_HHmm (명세 6.1) */
export function formatTimestamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

/** UTF-8(BOM 포함) 텍스트 파일로 다운로드 */
export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([UTF8_BOM + content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = sanitizeFilename(filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
