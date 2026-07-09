import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  onClose(): void;
}

/** 설정 모달 자리 (§6.1-4) — BYOK 입력은 M6에서 채워진다. */
export default function SettingsModal({ open, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      // 포커스 가능한 요소가 닫기 버튼 하나뿐 — Tab이 배경으로 새지 않게 가둔다
      if (e.key === 'Tab') {
        e.preventDefault();
        closeRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      trigger?.focus(); // 닫히면 열었던 버튼(톱니)으로 포커스 복귀
    };
  }, [open, onClose]);

  if (!open) return null;

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
          설정
        </h2>
        <p className="modal-body">
          고급 설정(내 API 키로 프롬프트 다듬기)은 준비 중이에요.
          <br />
          지금 제공되는 모든 기능은 인터넷 없이, 이 PC 안에서만 동작해요.
        </p>
        <div className="modal-actions">
          <button ref={closeRef} className="btn-ghost" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
