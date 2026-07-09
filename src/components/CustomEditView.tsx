import { useMemo, useRef, useState } from 'react';
import type { CustomPrompt } from '../engine/custom';
import { extractVariables, findInvalidVariables, normalizeBody } from '../engine/custom';
import { MAX_PROMPTS } from '../lib/customStore';
import { copyText } from '../lib/clipboard';

interface Props {
  /** 있으면 편집 모드 */
  prompt?: CustomPrompt;
  /** 현재 저장된 개수 (신규 등록 상한 판정용) */
  existingCount: number;
  onSave(name: string, body: string): void;
  onCancel(): void;
  onToast(message: string, ok: boolean): void;
}

/** 변수 찾기 도우미 메타프롬프트 (명세 §7.11 문면 그대로) */
const HELPER_PROMPT = `Below is a prompt I use repeatedly. Identify only the parts that would change
each time I use it (topics, dates, names, pasted content, etc.), and replace
each with a {{placeholder}} using a short Korean name, e.g. {{주제}}.
Keep every other character exactly as written — do not rephrase, reorder,
or improve anything. Return only the modified prompt.

---
`;

const MAX_FILE_BYTES = 200 * 1024; // .txt/.md 200KB (명세 §7.11)

/** 등록·편집 화면 (§7.11) — txt 첨부 / 드래그 변수 지정 / 변수 찾기 도우미 / 칩·하이라이트 */
export default function CustomEditView({ prompt, existingCount, onSave, onCancel, onToast }: Props) {
  const [name, setName] = useState(prompt?.name ?? '');
  const [body, setBody] = useState(prompt?.body ?? '');
  const [varNameDraft, setVarNameDraft] = useState<string | null>(null); // null=닫힘
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLPreElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const selection = useRef<{ start: number; end: number } | null>(null);

  const variables = useMemo(() => extractVariables(body), [body]);
  const invalidVars = useMemo(() => findInvalidVariables(body), [body]);
  const isNew = !prompt;
  const overLimit = isNew && existingCount >= MAX_PROMPTS;
  const canSave = name.trim() !== '' && body.trim() !== '' && invalidVars.length === 0 && !overLimit;

  const syncScroll = () => {
    if (bodyRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = bodyRef.current.scrollTop;
      backdropRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  };

  const attachFile = (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      onToast('파일이 200KB를 넘어요. 더 짧은 파일을 선택해 주세요.', false);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBody(normalizeBody(String(reader.result ?? '')));
      onToast('파일 내용을 본문에 채웠어요.', true);
    };
    reader.onerror = () => onToast('파일을 읽지 못했어요. 다른 파일로 시도해 주세요.', false);
    reader.readAsText(file);
  };

  const startMakeVariable = () => {
    const ta = bodyRef.current;
    if (!ta) return;
    const { selectionStart, selectionEnd } = ta;
    if (selectionStart === selectionEnd) {
      onToast('본문에서 변수로 만들 부분을 먼저 드래그해 주세요.', false);
      return;
    }
    selection.current = { start: selectionStart, end: selectionEnd };
    setVarNameDraft('');
  };

  const confirmMakeVariable = () => {
    const sel = selection.current;
    const varName = (varNameDraft ?? '').trim();
    if (!sel || !varName) return;
    if (/[{}]/.test(varName)) {
      onToast('변수 이름에는 중괄호를 쓸 수 없어요.', false);
      return;
    }
    setBody((b) => b.slice(0, sel.start) + `{{${varName}}}` + b.slice(sel.end));
    setVarNameDraft(null);
    selection.current = null;
  };

  const copyHelper = async () => {
    const r = await copyText(HELPER_PROMPT + body);
    if (r.ok) {
      onToast('도우미 프롬프트를 복사했어요. AI 채팅창에 붙여넣고, 답변을 본문에 다시 붙여넣으세요.', true);
    } else {
      onToast('복사가 안 됐어요. 본문을 직접 드래그해 복사해 주세요.', false);
    }
  };

  /** 하이라이트 오버레이 — {{변수}}만 표시하고 나머지는 투명 텍스트로 정렬 유지 */
  const backdrop = useMemo(() => {
    const parts = body.split(/(\{\{.+?\}\})/g);
    return parts.map((p, i) =>
      /^\{\{.+\}\}$/.test(p) ? (
        <mark key={i} className="var-mark">
          {p}
        </mark>
      ) : (
        <span key={i}>{p}</span>
      ),
    );
  }, [body]);

  return (
    <div className="custom-edit">
      <header className="view-head">
        <button className="back-btn" onClick={onCancel} aria-label="홈으로 돌아가기">
          ←
        </button>
        <h2 className="view-title">{isNew ? '내 프롬프트 등록' : '내 프롬프트 수정'}</h2>
      </header>

      <div className="field">
        <label className="field-label" htmlFor="cp-name">
          이름<span className="req-star" aria-label="필수"> *</span>
        </label>
        <input
          id="cp-name"
          type="text"
          placeholder="예: 주간보고 정리 프롬프트"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="field">
        <div className="edit-toolbar">
          <label className="field-label" htmlFor="cp-body">
            본문<span className="req-star" aria-label="필수"> *</span>
          </label>
          <div className="edit-actions">
            <button className="btn-mini" onClick={() => fileRef.current?.click()}>
              .txt 파일 첨부
            </button>
            <button className="btn-mini" onClick={startMakeVariable}>
              선택을 변수로
            </button>
            <button className="btn-mini" onClick={copyHelper}>
              변수 찾기 도우미
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) attachFile(f);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        <div className="body-wrap">
          <pre ref={backdropRef} className="body-backdrop" aria-hidden="true">
            {backdrop}
            {'\n'}
          </pre>
          <textarea
            id="cp-body"
            ref={bodyRef}
            rows={14}
            placeholder="자주 쓰는 프롬프트를 붙여넣으세요. 매번 바뀌는 부분은 {{주제}} 처럼 적으면 입력칸이 생겨요."
            value={body}
            onChange={(e) => setBody(normalizeBody(e.target.value))}
            onScroll={syncScroll}
          />
        </div>
        <p className="field-hint">
          본문에 {'{{이름}}'} 모양이 있으면 변수로 인식돼요. 같은 이름 변수는 한 번만 입력하면 전부
          채워져요.
        </p>
      </div>

      {varNameDraft !== null && (
        <div className="var-name-row">
          <input
            type="text"
            placeholder="변수 이름 (예: 주제)"
            aria-label="변수 이름"
            value={varNameDraft}
            onChange={(e) => setVarNameDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmMakeVariable()}
            autoFocus
          />
          <button className="btn-mini" onClick={confirmMakeVariable}>
            변수 만들기
          </button>
          <button className="btn-mini" onClick={() => setVarNameDraft(null)}>
            취소
          </button>
        </div>
      )}

      <div className="chip-row" aria-label="인식된 변수">
        {variables.length === 0 ? (
          <span className="chip-empty">인식된 변수 없음 — 변수가 없어도 등록할 수 있어요</span>
        ) : (
          variables.map((v) => (
            <span key={v} className="chip">
              {v}
            </span>
          ))
        )}
      </div>

      {invalidVars.length > 0 && (
        <p className="edit-error" role="alert">
          중첩된 {'{{ }}'}는 사용할 수 없어요: {invalidVars.join(', ')} — 괄호를 정리해 주세요.
        </p>
      )}
      {overLimit && (
        <p className="edit-error" role="alert">
          프롬프트는 최대 {MAX_PROMPTS}개까지 저장할 수 있어요. 안 쓰는 프롬프트를 삭제한 뒤 다시
          등록해 주세요.
        </p>
      )}

      <div className="result-actions">
        <button className="btn-primary" disabled={!canSave} onClick={() => onSave(name.trim(), body)}>
          {isNew ? '등록하기' : '수정 저장'}
        </button>
        <button className="btn-ghost" onClick={onCancel}>
          취소
        </button>
      </div>
    </div>
  );
}
