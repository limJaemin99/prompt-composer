import { useEffect, useRef, useState } from 'react';
import { loadApiKey, saveApiKey } from '../lib/byok';

interface Props {
  open: boolean;
  onClose(): void;
  onToast(message: string, ok: boolean): void;
}

/**
 * 설정 모달 (§6.1-4, §9) — BYOK 키 입력.
 * Anthropic·Google 2칸만 노출 — OpenAI는 file:// CORS 차단으로 v1에서 숨김
 * (docs/M6_CORS검증보고서.md, 정책 변경 시 재검 후 추가).
 */
export default function SettingsModal({ open, onClose, onToast }: Props) {
  const firstRef = useRef<HTMLInputElement>(null);
  const [anthropicKey, setAnthropicKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');

  useEffect(() => {
    if (!open) return;
    setAnthropicKey(loadApiKey('anthropic'));
    setGoogleKey(loadApiKey('google'));
    const trigger = document.activeElement as HTMLElement | null;
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      // 포커스 트랩 — Tab이 모달 밖으로 새지 않게 첫/끝에서 순환
      if (e.key === 'Tab') {
        const focusables = document.querySelectorAll<HTMLElement>(
          '.modal input, .modal button',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      trigger?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const save = () => {
    saveApiKey('anthropic', anthropicKey);
    saveApiKey('google', googleKey);
    onToast('설정을 저장했어요.', true);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="settings-title" className="modal-title">
          설정 — 내 API 키로 다듬기 (고급)
        </h2>
        <p className="modal-body">
          AI 회사에서 발급받은 내 API 키를 넣으면, 결과 화면에 [프롬프트 지금 다듬기] 버튼이 생겨요.
          <br />
          키는 이 PC의 브라우저에만 저장되며, 해당 AI사 API 호출 외에는 어디로도 전송되지
          않습니다.
        </p>

        <div className="field">
          <label className="field-label" htmlFor="key-anthropic">
            Anthropic API 키
          </label>
          <input
            ref={firstRef}
            id="key-anthropic"
            type="password"
            placeholder="sk-ant-…"
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="key-google">
            Google API 키
          </label>
          <input
            id="key-google"
            type="password"
            placeholder="발급받은 키를 그대로 붙여넣으세요 (AIza…, AQ.… 모두 가능)"
            value={googleKey}
            onChange={(e) => setGoogleKey(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>
            닫기
          </button>
          <button className="btn-primary" onClick={save}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
