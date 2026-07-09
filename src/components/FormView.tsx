import { useMemo, useState } from 'react';
import type { DetailLevel, FieldDef, TaskTemplate } from '../engine/types';

interface Props {
  template: TaskTemplate;
  initialValues: Record<string, string>;
  initialDetail: DetailLevel;
  onBack(): void;
  onSubmit(values: Record<string, string>, detail: DetailLevel): void;
}

const CUSTOM = '__custom__';

/** 한국어 목적격 조사: 마지막 글자 받침 유무로 을/를 선택 */
function objectParticle(word: string): string {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return '을(를)'; // 한글 아님 — 병기
  return (last - 0xac00) % 28 > 0 ? '을' : '를';
}
const DETAIL_LABELS: { key: DetailLevel; label: string }[] = [
  { key: 'simple', label: '간단' },
  { key: 'standard', label: '표준' },
  { key: 'detailed', label: '상세' },
];

/**
 * 폼 — 필수 필드가 먼저, 나머지는 "세부 옵션 ▾" 아코디언 (§6.1).
 * 필수 미입력 시 버튼 비활성 + 어떤 필드가 비었는지 인라인 표시.
 */
/**
 * 결과 → 폼 복귀 시 select의 "직접 입력…" 값 복원:
 * 저장된 값이 옵션 목록에 없으면 커스텀 입력이었던 것이므로
 * select를 CUSTOM으로, 보조 입력에 원래 값을 되살린다.
 */
function restoreCustomSelects(
  template: TaskTemplate,
  values: Record<string, string>,
): Record<string, string> {
  const out = { ...values };
  for (const f of template.fields) {
    const v = out[f.key];
    if (f.widget === 'select' && f.allowCustom && v && !f.options?.includes(v)) {
      out[f.key] = CUSTOM;
      out[`${f.key}${CUSTOM}`] = v;
    }
  }
  return out;
}

export default function FormView({ template, initialValues, initialDetail, onBack, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    restoreCustomSelects(template, initialValues),
  );
  const [detail, setDetail] = useState<DetailLevel>(initialDetail);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const requiredFields = template.fields.filter((f) => f.required);
  const optionalFields = template.fields.filter((f) => !f.required);

  /** 실효값: select 커스텀은 보조 입력의 트림값, 그 외는 트림값 (수집 시 1회 트림) */
  const effective = (f: FieldDef): string => {
    const raw = values[f.key];
    if (f.widget === 'select') {
      if (raw === CUSTOM) return (values[`${f.key}${CUSTOM}`] ?? '').trim();
      return (raw ?? f.defaultValue ?? '').trim();
    }
    return (raw ?? '').trim();
  };

  const missing = useMemo(
    () => requiredFields.filter((f) => effective(f) === ''),
    // eslint 없음 — values 변경 시 재계산
    [values, requiredFields],
  );

  const submit = () => {
    if (missing.length > 0) return;
    const out: Record<string, string> = {};
    for (const f of template.fields) {
      const v = effective(f);
      if (v !== '') out[f.key] = v;
    }
    onSubmit(out, detail);
  };

  const renderField = (f: FieldDef) => (
    <div className="field" key={f.key}>
      <label className="field-label" htmlFor={`f-${f.key}`}>
        {f.label.ko}
        {f.required && <span className="req-star" aria-label="필수"> *</span>}
      </label>

      {f.widget === 'textarea' && (
        <textarea
          id={`f-${f.key}`}
          rows={f.longContent ? 6 : 3}
          placeholder={f.placeholder}
          aria-required={f.required || undefined}
          value={values[f.key] ?? ''}
          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
        />
      )}

      {f.widget === 'text' && (
        <input
          id={`f-${f.key}`}
          type="text"
          placeholder={f.placeholder}
          aria-required={f.required || undefined}
          value={values[f.key] ?? ''}
          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
        />
      )}

      {f.widget === 'select' && (
        <>
          <select
            id={`f-${f.key}`}
            aria-required={f.required || undefined}
            value={values[f.key] ?? f.defaultValue ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
          >
            {!f.defaultValue && f.required && (
              <option value="" disabled>
                선택하세요
              </option>
            )}
            {!f.defaultValue && !f.required && <option value="">선택 안 함</option>}
            {f.options?.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
            {f.allowCustom && <option value={CUSTOM}>직접 입력…</option>}
          </select>
          {values[f.key] === CUSTOM && (
            <input
              type="text"
              className="custom-input"
              placeholder="원하는 값을 그대로 적어주세요"
              aria-label={`${f.label.ko} 직접 입력`}
              value={values[`${f.key}${CUSTOM}`] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [`${f.key}${CUSTOM}`]: e.target.value }))}
            />
          )}
        </>
      )}

      {f.hint && <p className="field-hint">{f.hint}</p>}
    </div>
  );

  return (
    <div className="form-view">
      <header className="view-head">
        <button className="back-btn" onClick={onBack} aria-label="홈으로 돌아가기">
          ←
        </button>
        <h2 className="view-title">{template.name}</h2>
      </header>

      {template.banner && <div className="banner">{template.banner}</div>}

      <div className="form-body">
        {requiredFields.map(renderField)}

        {optionalFields.length > 0 && (
          <div className="options-acc">
            <button
              className="options-toggle"
              aria-expanded={optionsOpen}
              onClick={() => setOptionsOpen((o) => !o)}
            >
              세부 옵션 {optionsOpen ? '▴' : '▾'}
            </button>
            {optionsOpen && <div className="options-body">{optionalFields.map(renderField)}</div>}
          </div>
        )}
      </div>

      <div className="form-bar">
        <div className="detail-seg" role="group" aria-label="상세도">
          {DETAIL_LABELS.map((d) => (
            <button
              key={d.key}
              className={detail === d.key ? 'seg on' : 'seg'}
              aria-pressed={detail === d.key}
              onClick={() => setDetail(d.key)}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="form-bar-right">
          {missing.length > 0 && (
            <span className="missing-note" role="status">
              {missing.map((f) => f.label.ko).join(', ')}
              {objectParticle(missing[missing.length - 1].label.ko)} 입력하면 만들 수 있어요
            </span>
          )}
          <button className="btn-primary" disabled={missing.length > 0} onClick={submit}>
            프롬프트 만들기
          </button>
        </div>
      </div>
    </div>
  );
}
