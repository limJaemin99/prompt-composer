import { useCallback, useRef, useState } from 'react';
import type { DetailLevel } from './engine/types';
import { getTemplate } from './templates';
import Home from './components/Home';
import FormView from './components/FormView';
import ResultView from './components/ResultView';
import SettingsModal from './components/SettingsModal';
import { loadLastDetail, saveLastDetail } from './lib/storage';

type ViewName = 'home' | 'form' | 'result';

interface ToastState {
  message: string;
  ok: boolean;
}

/** SPA — 라우터 없이 view state 3개 + 설정 모달 (§6.1) */
export default function App() {
  const [view, setView] = useState<ViewName>('home');
  const [templateId, setTemplateId] = useState<string>('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<DetailLevel>(loadLastDetail());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, ok: boolean) => {
    setToast({ message, ok });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const template = getTemplate(templateId);

  return (
    <div className="app">
      <button
        className="gear"
        aria-label="설정 열기"
        onClick={() => setSettingsOpen(true)}
      >
        ⚙
      </button>

      {view === 'home' && (
        <Home
          onSelect={(id) => {
            setTemplateId(id);
            setValues({}); // 새 작업 시작 — 폼 입력은 저장하지 않는다(명세 4장)
            setView('form');
          }}
        />
      )}

      {view === 'form' && template && (
        <FormView
          template={template}
          initialValues={values}
          initialDetail={detail}
          onBack={() => setView('home')}
          onSubmit={(v, d) => {
            setValues(v);
            setDetail(d);
            saveLastDetail(d); // 폼에서 고른 상세도도 "마지막 사용"으로 기억 (§4)
            setView('result');
          }}
        />
      )}

      {view === 'result' && template && (
        <ResultView
          template={template}
          values={values}
          initialDetail={detail}
          onEdit={() => setView('form')} // 입력값 유지한 채 폼 복귀 (§6.1)
          onToast={showToast}
        />
      )}

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {toast && (
        <div className={toast.ok ? 'toast show' : 'toast show fail'} role="status">
          <span className="toast-mark">{toast.ok ? '✓' : '!'}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}
