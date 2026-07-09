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

/** 출력 A 다운로드 파일명: 프롬프트_{유형또는이름}_{YYYYMMDD_HHmm}.txt (명세 6.1) */
export function buildPromptFilename(typeName: string, d: Date): string {
  return sanitizeFilename(`프롬프트_${typeName}_${formatTimestamp(d)}.txt`);
}

/** 출력 B 다운로드 파일명: 프롬프트요약_{유형또는이름}_{YYYYMMDD_HHmm}.txt (명세 6.1) */
export function buildSummaryFilename(typeName: string, d: Date): string {
  return sanitizeFilename(`프롬프트요약_${typeName}_${formatTimestamp(d)}.txt`);
}

/**
 * 출력 B 파일 첫머리의 "생성 도구/일시/유형" 2줄 헤더 (명세 6.1).
 * 헤더 뒤에 빈 줄 하나를 두고 본문이 이어진다.
 */
export function buildSummaryHeader(typeName: string, d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const dateText = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  return `생성 도구: 프롬프트 생성기\n생성 일시: ${dateText} · 유형: ${typeName}`;
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
