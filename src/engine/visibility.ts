/**
 * showIf 조건부 노출 (명세 §5.2).
 * 참고: v1 내장 9유형에는 showIf 선언이 없어 현재 실사용처는 없지만,
 * M4 산출 범위(§11)이므로 인프라와 테스트를 갖춰 둔다.
 * 숨겨진 필드는 화면에서 빠질 뿐 아니라 제출 값에서도 제외된다(잔존값 유출 방지).
 */
import type { FieldDef } from './types';

export function isFieldVisible(field: FieldDef, values: Record<string, string>): boolean {
  if (!field.showIf) return true;
  return (values[field.showIf.key] ?? '') === field.showIf.equals;
}
