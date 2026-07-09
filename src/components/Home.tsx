import { useRef, useState } from 'react';
import { HOME_CARDS } from '../templates';
import type { CustomPrompt } from '../engine/custom';
import { extractVariables } from '../engine/custom';

interface Props {
  onSelect(templateId: string): void;
  prompts: CustomPrompt[];
  onSelectCustom(id: string): void;
  onAddCustom(): void;
  onEditCustom(id: string): void;
  onExportCustom(id: string): void;
  onDeleteCustom(id: string): void;
  onExportAll(): void;
  onImportFile(file: File): void;
}

/** 홈 — 유형 카드 그리드 3×3 + 내 프롬프트 섹션 (§6.1, §7.11) */
export default function Home({
  onSelect,
  prompts,
  onSelectCustom,
  onAddCustom,
  onEditCustom,
  onExportCustom,
  onDeleteCustom,
  onExportAll,
  onImportFile,
}: Props) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  return (
    <div className="home" onClick={() => setMenuId(null)}>
      <header className="home-head">
        <div>
          <h1 className="app-title">프롬프트 생성기</h1>
          <p className="app-tag">빈칸만 채우면, AI에게 잘 통하는 요청문이 만들어져요</p>
        </div>
      </header>

      <div className="card-grid">
        {HOME_CARDS.map((c) => (
          <button key={c.id} className="type-card" onClick={() => onSelect(c.id)}>
            <span className="type-ico" aria-hidden="true">{c.icon}</span>
            <div className="type-name">{c.name}</div>
            <div className="type-desc">{c.description}</div>
          </button>
        ))}
      </div>

      <section className="mine">
        <div className="mine-head">
          <b>내 프롬프트</b>
          <span>자주 쓰는 나만의 프롬프트를 등록해 두고 재사용해요</span>
          <span className="mine-sp" />
          <button className="btn-mini" onClick={onExportAll}>
            모두 내보내기(JSON)
          </button>
          <button className="btn-mini" onClick={() => importRef.current?.click()}>
            가져오기(JSON)
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportFile(f);
              e.target.value = '';
            }}
          />
        </div>

        <div className="card-grid">
          {prompts.map((p) => {
            const varCount = extractVariables(p.body).length;
            return (
              <div key={p.id} className="type-card custom-card">
                <button className="custom-card-main" onClick={() => onSelectCustom(p.id)}>
                  <span className="type-ico" aria-hidden="true">⭐</span>
                  <div className="type-name">{p.name}</div>
                  <div className="type-desc">
                    {varCount > 0 ? `변수 ${varCount}개 — 채우면 완성돼요` : '변수 없음 — 바로 사용'}
                  </div>
                </button>
                <button
                  className="card-menu-btn"
                  aria-label={`${p.name} 메뉴 열기`}
                  aria-expanded={menuId === p.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuId((m) => (m === p.id ? null : p.id));
                  }}
                >
                  ⋯
                </button>
                {menuId === p.id && (
                  <div className="menu-pop" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setMenuId(null); onEditCustom(p.id); }}>수정</button>
                    <button onClick={() => { setMenuId(null); onExportCustom(p.id); }}>내보내기</button>
                    <button className="danger" onClick={() => { setMenuId(null); onDeleteCustom(p.id); }}>
                      삭제
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          <button className="type-card mine-add-card" onClick={onAddCustom}>
            <span className="type-ico" aria-hidden="true">＋</span>
            <div className="type-name">내 프롬프트 등록</div>
            <div className="type-desc">붙여넣기 또는 .txt 파일로 등록해요</div>
          </button>
        </div>
      </section>
    </div>
  );
}
