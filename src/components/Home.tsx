import { HOME_CARDS } from '../templates';

interface Props {
  onSelect(templateId: string): void;
}

/** 홈 — 유형 카드 그리드 3×3 (§6.1). 미구현 유형은 "준비 중" 표시(M4). */
export default function Home({ onSelect }: Props) {
  return (
    <div className="home">
      <header className="home-head">
        <div>
          <h1 className="app-title">프롬프트 생성기</h1>
          <p className="app-tag">빈칸만 채우면, AI에게 잘 통하는 요청문이 만들어져요</p>
        </div>
      </header>

      <div className="card-grid">
        {HOME_CARDS.map((c) =>
          c.planned ? (
            <div key={c.id} className="type-card planned" aria-disabled="true">
              <span className="type-ico" aria-hidden="true">{c.icon}</span>
              <span className="planned-badge">준비 중</span>
              <div className="type-name">{c.name}</div>
              <div className="type-desc">{c.description}</div>
            </div>
          ) : (
            <button key={c.id} className="type-card" onClick={() => onSelect(c.id)}>
              <span className="type-ico" aria-hidden="true">{c.icon}</span>
              <div className="type-name">{c.name}</div>
              <div className="type-desc">{c.description}</div>
            </button>
          ),
        )}
      </div>

      <section className="mine">
        <div className="mine-head">
          <b>내 프롬프트</b>
          <span>자주 쓰는 나만의 프롬프트를 등록해 두고 재사용해요 — 곧 제공될 기능이에요</span>
        </div>
        <div className="mine-add" aria-disabled="true">
          ＋ 내 프롬프트 등록
        </div>
      </section>
    </div>
  );
}
