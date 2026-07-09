/**
 * 렌더러 (명세 §5.1, §5.3, §5.4)
 *
 * 철칙 1: 출력 B를 출력 A에서 파생하지 않는다 — 둘 다 PromptSpec에서 각각 렌더.
 * 철칙 2: 사용자 입력값은 어떤 렌더러에서도 변형하지 않는다(verbatim).
 *
 * 블록 사이는 빈 줄 1개('\n\n' join), 끝에 트레일링 뉴라인 없음 — §7.10 골든 기준.
 */
import type { BiText, DetailLevel, FieldDef, Flavor, PromptSpec, TaskTemplate } from './types';

/** 폼 값 → PromptSpec. entries는 fields 선언 순서, 값이 비어있지 않은 필드만. */
export function buildSpec(
  template: TaskTemplate,
  values: Record<string, string>,
  detail: DetailLevel,
): PromptSpec {
  const entries = template.fields
    .map((field) => ({ field, value: values[field.key] ?? field.defaultValue ?? '' }))
    .filter((e) => e.value !== '');
  return { template, detail, entries };
}

/** spec의 값 맵 (buildRequirements/buildOutputFormat 인자용) */
function valuesOf(spec: PromptSpec): Record<string, string> {
  const values: Record<string, string> = {};
  for (const e of spec.entries) values[e.field.key] = e.value;
  return values;
}

/**
 * role 결정: roleFromField 값이 있으면 동적 role(§7.9 — ko는 값만, "역할: " 접두어는
 * 출력 B 렌더러가 1회만 붙인다), 없으면 템플릿의 정적 role, 둘 다 없으면 null.
 */
function resolveRole(spec: PromptSpec): BiText | null {
  const t = spec.template;
  if (t.roleFromField) {
    const v = valuesOf(spec)[t.roleFromField];
    if (v) return { en: `Act as: ${v}`, ko: v };
  }
  return t.role ?? null;
}

/** 값이 3줄 이상이거나 longContent면 코드 펜스로 감쌈 (§5.3 공통 규칙) */
function isFenced(field: FieldDef, value: string): boolean {
  return !!field.longContent || value.split(/\r?\n/).length >= 3;
}

/**
 * specification에 표시할 entries.
 * roleFromField로 role에 승격된 필드는 role 블록에 이미 표시되므로 목록에서 제외
 * (중복 표기 방지 — 값 자체는 role 블록에 verbatim으로 존재).
 * 단 간단(simple) 상세도에서는 role 블록 자체가 렌더되지 않으므로(§5.3) 승격하지 않고
 * specification 항목으로 유지한다 — verbatim 불변식(§10.1-1) 보존.
 */
function specEntries(spec: PromptSpec, detail: DetailLevel) {
  const roleKey = spec.template.roleFromField;
  const values = valuesOf(spec);
  const rolePromoted = detail !== 'simple' && roleKey ? !!values[roleKey] : false;
  return spec.entries.filter((e) => !(rolePromoted && e.field.key === roleKey));
}

interface RenderParts {
  role: BiText | null;
  requirements: BiText[];
  outputFormat: BiText | null;
}

function computeParts(spec: PromptSpec, detail: DetailLevel): RenderParts {
  const values = valuesOf(spec);
  return {
    role: resolveRole(spec),
    requirements: spec.template.buildRequirements(values, detail),
    // 간단 상세도에서는 output_format 블록을 생략 (§5.3 상세도 표, §7.10 골든 확정)
    outputFormat:
      detail === 'simple' ? null : (spec.template.buildOutputFormat?.(values) ?? null),
  };
}

/** 출력 A — AI용 구조화 프롬프트 (§5.3) */
export function renderAI(spec: PromptSpec, flavor: Flavor, detail: DetailLevel): string {
  const { role, requirements, outputFormat } = computeParts(spec, detail);
  const entries = specEntries(spec, detail);
  const blocks: string[] = [];

  if (flavor === 'claude') {
    if (detail !== 'simple' && role) blocks.push(`<role>${role.en}</role>`);
    blocks.push(`<task>${spec.template.task.en}</task>`);

    const specLines = entries.map((e) =>
      isFenced(e.field, e.value)
        ? `- ${e.field.label.en}:\n\`\`\`\n${e.value}\n\`\`\``
        : `- ${e.field.label.en}: ${e.value}`,
    );
    blocks.push(`<specification>\n${specLines.join('\n')}\n</specification>`);
    blocks.push(`<requirements>\n${requirements.map((r) => `- ${r.en}`).join('\n')}\n</requirements>`);
    if (outputFormat) blocks.push(`<output_format>${outputFormat.en}</output_format>`);
  } else {
    // gpt / gemini — v1에서 동일 렌더러 공유 (§5.3)
    if (detail !== 'simple' && role) blocks.push(`## Role\n${role.en}`);
    blocks.push(`## Task\n${spec.template.task.en}`);

    const specLines = entries.map((e) =>
      isFenced(e.field, e.value)
        ? `**${e.field.label.en}:**\n\`\`\`\n${e.value}\n\`\`\``
        : `**${e.field.label.en}:** ${e.value}`,
    );
    blocks.push(`## Specification\n${specLines.join('\n')}`);
    blocks.push(`## Requirements\n${requirements.map((r) => `- ${r.en}`).join('\n')}`);
    if (outputFormat) blocks.push(`## Output format\n${outputFormat.en}`);
  }

  return blocks.join('\n\n');
}

/** 출력 B의 구조화 모델 — UI 카드와 텍스트 직렬화가 이 하나의 모델을 공유한다. */
export interface HumanEntry {
  label: string; // label.ko
  value: string; // verbatim
  fenced: boolean; // true면 UI 카드에서 시각적 코드 블록으로 표시 (§5.4 펜스 확정)
}

export interface HumanModel {
  role: string | null; // ko, "역할: " 접두어 없이 (표준 이상 + role 존재 시에만 비null)
  task: string; // task.ko
  entries: HumanEntry[];
  requirements: string[]; // ko 줄들
  outputFormat: string | null;
}

/** spec → 출력 B 모델 (§5.4). UI 카드는 이 모델을 직접 렌더한다. */
export function buildHumanModel(spec: PromptSpec, detail: DetailLevel): HumanModel {
  const { role, requirements, outputFormat } = computeParts(spec, detail);
  return {
    role: detail !== 'simple' && role ? role.ko : null,
    task: spec.template.task.ko,
    entries: specEntries(spec, detail).map((e) => ({
      label: e.field.label.ko,
      value: e.value,
      fenced: isFenced(e.field, e.value),
    })),
    requirements: requirements.map((r) => r.ko),
    outputFormat: outputFormat ? outputFormat.ko : null,
  };
}

/**
 * 출력 B — 사람용 한국어 미러의 텍스트 직렬화 (§5.4).
 * 스냅샷 테스트·.txt 다운로드가 사용. 긴 값 펜스 포함(2026-07-09 확정).
 */
export function renderHuman(spec: PromptSpec, detail: DetailLevel): string {
  const m = buildHumanModel(spec, detail);
  const blocks: string[] = [];

  const taskLines: string[] = ['[AI에게 시키는 일]'];
  if (m.role) taskLines.push(`역할: ${m.role}`);
  taskLines.push(m.task);
  blocks.push(taskLines.join('\n'));

  const entryLines = m.entries.map((e) =>
    e.fenced ? `- ${e.label}:\n\`\`\`\n${e.value}\n\`\`\`` : `- ${e.label}: ${e.value}`,
  );
  blocks.push(`[전달한 내용]\n${entryLines.join('\n')}`);
  blocks.push(`[지켜야 할 조건]\n${m.requirements.map((r) => `- ${r}`).join('\n')}`);
  if (m.outputFormat) blocks.push(`[결과물 형식]\n${m.outputFormat}`);

  return blocks.join('\n\n');
}
