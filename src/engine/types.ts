/**
 * 코어 타입 정의 (명세 §5.2)
 */

export type Flavor = 'claude' | 'gpt' | 'gemini';
export type DetailLevel = 'simple' | 'standard' | 'detailed';

/** 모든 템플릿 고정 문구는 EN/KO 쌍 — en은 출력 A, ko는 폼·출력 B */
export interface BiText {
  en: string;
  ko: string;
}

export interface FieldDef {
  key: string;
  label: BiText; // en → 출력 A 라벨, ko → 폼 라벨·출력 B 라벨
  widget: 'text' | 'textarea' | 'select' | 'checkbox';
  required?: boolean;
  placeholder?: string; // 반드시 구체적인 한국어 예시
  options?: string[]; // select: 한국어 라벨이 곧 값 ("(기본)" 표기는 데이터가 아님 — defaultValue로 분리)
  allowCustom?: boolean; // select에 "직접 입력…" 허용
  defaultValue?: string;
  hint?: string;
  longContent?: boolean; // true면 출력에서 ``` 펜스로 감쌈
  showIf?: { key: string; equals: string };
}

export interface TaskTemplate {
  id: string;
  name: string; // 카드에 표시할 한국어 이름
  icon: string;
  description: string;
  defaultFlavor?: Flavor;
  banner?: string;
  /**
   * 명세 §5.2는 role을 필수로 선언하지만 free 유형(§7.9)은 "role: 기본 생략"이므로
   * optional로 완화한다. role이 없고 roleFromField 값도 없으면 role 블록 자체를 생략.
   */
  role?: BiText;
  task: BiText;
  roleFromField?: string; // 이 key의 필드값이 있으면 role을 동적으로 대체 (free 유형)
  fields: FieldDef[];
  buildRequirements(values: Record<string, string>, detail: DetailLevel): BiText[];
  buildOutputFormat?(values: Record<string, string>): BiText | null;
}

export interface PromptSpec {
  template: TaskTemplate;
  detail: DetailLevel;
  entries: { field: FieldDef; value: string }[]; // 값이 입력된 필드만, 원문 그대로(verbatim)
}
