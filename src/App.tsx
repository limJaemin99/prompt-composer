import { useCallback, useRef, useState } from 'react';
import type { DetailLevel } from './engine/types';
import type { CustomPrompt } from './engine/custom';
import { extractVariables } from './engine/custom';
import { getTemplate } from './templates';
import Home from './components/Home';
import FormView from './components/FormView';
import ResultView from './components/ResultView';
import SettingsModal from './components/SettingsModal';
import CustomEditView from './components/CustomEditView';
import CustomFillView from './components/CustomFillView';
import CustomResultView from './components/CustomResultView';
import { loadLastDetail, saveLastDetail } from './lib/storage';
import {
  createPrompt,
  exportJson,
  loadPrompts,
  parseImport,
  savePrompts,
} from './lib/customStore';
import { downloadJsonFile, formatTimestamp } from './lib/download';
import { normalizeBody } from './engine/custom';

type ViewName =
  | 'home'
  | 'form'
  | 'result'
  | 'customEdit'
  | 'customFill'
  | 'customResult';

interface ToastState {
  message: string;
  ok: boolean;
}

/** SPA — 라우터 없이 view state + 설정 모달 (§6.1). 내 프롬프트 흐름 포함 (§7.11). */
export default function App() {
  const [view, setView] = useState<ViewName>('home');
  const [templateId, setTemplateId] = useState<string>('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<DetailLevel>(loadLastDetail());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 내 프롬프트 상태
  const [prompts, setPrompts] = useState<CustomPrompt[]>(loadPrompts);
  const [customId, setCustomId] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null); // null=신규
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<CustomPrompt | null>(null);

  const showToast = useCallback((message: string, ok: boolean) => {
    setToast({ message, ok });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  /** 저장 + 상태 갱신 + 용량 경고·실패 토스트 */
  const persist = (list: CustomPrompt[]): boolean => {
    const r = savePrompts(list);
    if (!r.ok) {
      showToast(r.error ?? '저장하지 못했어요.', false);
      return false;
    }
    setPrompts(list);
    if (r.warning) showToast(r.warning, false);
    return true;
  };

  const template = getTemplate(templateId);
  const currentPrompt = prompts.find((p) => p.id === customId);
  const editingPrompt = editingId ? prompts.find((p) => p.id === editingId) : undefined;

  const openCustom = (id: string) => {
    const p = prompts.find((x) => x.id === id);
    if (!p) return;
    setCustomId(id);
    setCustomValues({});
    // 변수가 0개면 폼을 건너뛰고 바로 결과 (§7.11)
    setView(extractVariables(p.body).length === 0 ? 'customResult' : 'customFill');
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = parseImport(String(reader.result ?? ''), prompts);
      if (r.fileError) {
        showToast(r.fileError, false);
        return;
      }
      if (!persist(r.merged)) return;
      const parts = [`${r.added}개를 가져왔어요.`];
      if (r.renamed > 0) parts.push(`겹친 ${r.renamed}개는 "(가져옴)" 사본으로 추가했어요.`);
      if (r.skippedOverLimit > 0) parts.push(`${r.skippedOverLimit}개는 최대 50개 제한으로 건너뛰었어요.`);
      if (r.invalid > 0) parts.push(`${r.invalid}개는 형식이 달라 건너뛰었어요.`);
      showToast(parts.join(' '), true);
    };
    reader.onerror = () => showToast('파일을 읽지 못했어요. 다른 파일로 시도해 주세요.', false);
    reader.readAsText(file);
  };

  return (
    <div className="app">
      <button className="gear" aria-label="설정 열기" onClick={() => setSettingsOpen(true)}>
        ⚙
      </button>

      {view === 'home' && (
        <Home
          onSelect={(id) => {
            setTemplateId(id);
            setValues({}); // 새 작업 시작 — 폼 입력은 저장하지 않는다(명세 4장)
            setView('form');
          }}
          prompts={prompts}
          onSelectCustom={openCustom}
          onAddCustom={() => {
            setEditingId(null);
            setView('customEdit');
          }}
          onEditCustom={(id) => {
            setEditingId(id);
            setView('customEdit');
          }}
          onExportCustom={(id) => {
            const p = prompts.find((x) => x.id === id);
            if (!p) return;
            downloadJsonFile(`내프롬프트_${p.name}_${formatTimestamp(new Date())}.json`, exportJson([p]));
            showToast('프롬프트 1개를 JSON 파일로 내보냈어요.', true);
          }}
          onDeleteCustom={(id) => {
            const p = prompts.find((x) => x.id === id);
            if (p) setDeleteTarget(p);
          }}
          onExportAll={() => {
            if (prompts.length === 0) {
              showToast('내보낼 프롬프트가 아직 없어요. 먼저 등록해 주세요.', false);
              return;
            }
            downloadJsonFile(`내프롬프트_전체_${formatTimestamp(new Date())}.json`, exportJson(prompts));
            showToast(`프롬프트 ${prompts.length}개를 JSON 파일로 내보냈어요.`, true);
          }}
          onImportFile={handleImport}
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

      {view === 'customEdit' && (
        <CustomEditView
          prompt={editingPrompt}
          existingCount={prompts.length}
          onCancel={() => setView('home')}
          onToast={showToast}
          onSave={(name, body) => {
            if (editingPrompt) {
              const updated = prompts.map((p) =>
                p.id === editingPrompt.id
                  ? { ...p, name, body: normalizeBody(body), updatedAt: new Date().toISOString() }
                  : p,
              );
              if (!persist(updated)) return;
              showToast('수정을 저장했어요.', true);
            } else {
              if (!persist([...prompts, createPrompt(name, body)])) return;
              showToast('내 프롬프트로 등록했어요.', true);
            }
            setView('home');
          }}
        />
      )}

      {view === 'customFill' && currentPrompt && (
        <CustomFillView
          prompt={currentPrompt}
          initialValues={customValues}
          onBack={() => setView('home')}
          onSubmit={(v) => {
            setCustomValues(v);
            setView('customResult');
          }}
        />
      )}

      {view === 'customResult' && currentPrompt && (
        <CustomResultView
          prompt={currentPrompt}
          values={customValues}
          onBack={() =>
            setView(extractVariables(currentPrompt.body).length === 0 ? 'home' : 'customFill')
          }
          onToast={showToast}
        />
      )}

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onToast={showToast}
      />

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="del-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="del-title" className="modal-title">
              "{deleteTarget.name}" 삭제
            </h2>
            <p className="modal-body">
              삭제하면 되돌릴 수 없어요. 나중을 위해 [내보내기]로 백업해 둘 수도 있어요.
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setDeleteTarget(null)}>
                취소
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  if (persist(prompts.filter((p) => p.id !== deleteTarget.id))) {
                    showToast('삭제했어요.', true);
                  }
                  setDeleteTarget(null);
                }}
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={toast.ok ? 'toast show' : 'toast show fail'} role="status">
          <span className="toast-mark">{toast.ok ? '✓' : '!'}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}
