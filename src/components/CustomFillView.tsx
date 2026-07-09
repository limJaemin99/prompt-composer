import { useMemo, useState } from 'react';
import type { CustomPrompt } from '../engine/custom';
import { extractVariables } from '../engine/custom';

interface Props {
  prompt: CustomPrompt;
  initialValues: Record<string, string>;
  onBack(): void;
  onSubmit(values: Record<string, string>): void;
}

/** 커스텀 변수 입력 폼 (§7.11) — 변수가 곧 필드, 전부 필수, 각 필드는 textarea */
export default function CustomFillView({ prompt, initialValues, onBack, onSubmit }: Props) {
  const variables = useMemo(() => extractVariables(prompt.body), [prompt.body]);
  const [values, setValues] = useState<Record<string, string>>(initialValues);

  // {{toString}} 같은 변수명이 Object.prototype 상속 함수를 반환해 크래시하지 않도록 own-property만 읽는다
  const valueOf = (v: string): string =>
    Object.prototype.hasOwnProperty.call(values, v) ? values[v] : '';

  const missing = variables.filter((v) => valueOf(v).trim() === '');

  return (
    <div className="form-view">
      <header className="view-head">
        <button className="back-btn" onClick={onBack} aria-label="홈으로 돌아가기">
          ←
        </button>
        <h2 className="view-title">{prompt.name}</h2>
      </header>

      <div className="form-body">
        {variables.map((v) => (
          <div className="field" key={v}>
            <label className="field-label" htmlFor={`v-${v}`}>
              {v}
              <span className="req-star" aria-label="필수"> *</span>
            </label>
            <textarea
              id={`v-${v}`}
              rows={3}
              aria-required="true"
              placeholder={`{{${v}}} 자리에 들어갈 내용`}
              value={valueOf(v)}
              onChange={(e) => setValues((s) => ({ ...s, [v]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <div className="form-bar">
        <span className="mine-note">같은 이름 변수는 한 번만 입력하면 전부 채워져요</span>
        <div className="form-bar-right">
          {missing.length > 0 && (
            <span className="missing-note" role="status">
              {missing.join(', ')} 값을 채우면 만들 수 있어요
            </span>
          )}
          <button
            className="btn-primary"
            disabled={missing.length > 0}
            onClick={() => {
              const out: Record<string, string> = {};
              for (const v of variables) out[v] = valueOf(v).trim();
              onSubmit(out);
            }}
          >
            프롬프트 만들기
          </button>
        </div>
      </div>
    </div>
  );
}
