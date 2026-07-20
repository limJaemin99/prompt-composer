import { useMemo, useState } from 'react';
import type { DetailLevel, Flavor, TaskTemplate } from '../engine/types';
import { buildHumanModel, buildSpec, renderAI, renderHuman } from '../engine/render';
import {
  REFINE_CHECKBOX_LABEL,
  REFINE_LABEL_KO,
  REFINE_TOOLTIP,
  renderRefineWrapper,
} from '../engine/refine';
import { copyText } from '../lib/clipboard';
import {
  buildPromptFilename,
  buildSummaryFilename,
  buildSummaryHeader,
  downloadTextFile,
} from '../lib/download';
import { activeProvider, refinePrompt } from '../lib/byok';
import { loadLastFlavor, saveLastDetail, saveLastFlavor } from '../lib/storage';

interface Props {
  template: TaskTemplate;
  values: Record<string, string>;
  initialDetail: DetailLevel;
  onEdit(): void;
  onToast(message: string, ok: boolean): void;
}

const FLAVOR_TABS: { key: Flavor; label: string }[] = [
  { key: 'claude', label: 'Claude' },
  { key: 'gpt', label: 'ChatGPT' },
  { key: 'gemini', label: 'Gemini' },
];
const DETAIL_TABS: { key: DetailLevel; label: string }[] = [
  { key: 'simple', label: '간단' },
  { key: 'standard', label: '표준' },
  { key: 'detailed', label: '상세' },
];

/** BYOK 정제 결과 오버라이드 — spec 파생이 아니므로 별도 보관 (§9 v2 상태 모델) */
interface RefinedOverride {
  flavor: Flavor;
  detail: DetailLevel;
  text: string;
}

/** 결과 — 상단 B 카드(사람용 검증) + 하단 A 코드박스(복사 대상). 탭·토글 즉시 재렌더 (§6.1). */
export default function ResultView({ template, values, initialDetail, onEdit, onToast }: Props) {
  const [flavor, setFlavor] = useState<Flavor>(() => template.defaultFlavor ?? loadLastFlavor());
  const [detail, setDetail] = useState<DetailLevel>(initialDetail);
  const [refineChecked, setRefineChecked] = useState(false);
  const [refined, setRefined] = useState<RefinedOverride | null>(null);
  const [refining, setRefining] = useState(false);

  const spec = useMemo(() => buildSpec(template, values, detail), [template, values, detail]);
  const pureText = useMemo(() => renderAI(spec, flavor, detail), [spec, flavor, detail]);
  const wrappedText = useMemo(
    () => (refineChecked ? renderRefineWrapper(pureText, flavor) : pureText),
    [refineChecked, pureText, flavor],
  );
  // 정제 오버라이드는 만들어진 (플레이버, 상세도) 조합에서만 표시 — 다른 조합은 순수 렌더 (§9 v2)
  const overrideActive = refined !== null && refined.flavor === flavor && refined.detail === detail;
  const displayText = overrideActive ? refined.text : wrappedText;

  // B는 화면의 A를 정확히 설명해야 한다 — 오버라이드 표시 중엔 래퍼가 없으므로 [AI가 먼저 다듬음] 줄도 제외
  const refineShown = refineChecked && !overrideActive;
  const human = useMemo(
    () => buildHumanModel(spec, detail, { refine: refineShown }),
    [spec, detail, refineShown],
  );

  const provider = activeProvider();

  const pickFlavor = (f: Flavor) => {
    setFlavor(f);
    saveLastFlavor(f);
  };
  const pickDetail = (d: DetailLevel) => {
    setDetail(d);
    saveLastDetail(d);
  };

  const handleCopy = async () => {
    const r = await copyText(displayText);
    if (r.ok) onToast('복사됐어요. AI 채팅창에 붙여넣으세요.', true);
    else onToast('복사가 안 됐어요. 어두운 코드 상자의 글을 드래그해 직접 복사해 주세요.', false);
  };

  const handleRefine = async () => {
    if (!provider || refining) return;
    setRefining(true);
    // 정제 대상은 항상 순수 렌더 A — C층 메타 지시문이 정제 결과에 섞이지 않게 (§9 이중 다듬기 방지)
    const r = await refinePrompt(provider, pureText);
    setRefining(false);
    if (r.ok && r.text) {
      setRefined({ flavor, detail, text: r.text });
      setRefineChecked(false); // 이미 다듬어졌으므로 체크 의미 소멸 — B 표시와 화면 일치
      onToast('프롬프트를 다듬었어요. [되돌리기]로 원본을 볼 수 있어요.', true);
    } else {
      onToast(r.error ?? '프롬프트를 다듬지 못했어요. 잠시 후 다시 시도해 주세요.', false);
    }
  };

  const downloadA = () => {
    downloadTextFile(buildPromptFilename(template.name, new Date()), displayText);
    onToast('프롬프트 파일을 내려받았어요.', true);
  };
  const downloadB = () => {
    const now = new Date();
    const body = renderHuman(spec, detail, { refine: refineShown });
    downloadTextFile(
      buildSummaryFilename(template.name, now),
      `${buildSummaryHeader(template.name, now)}\n\n${body}`,
    );
    onToast('요약 파일을 내려받았어요.', true);
  };

  return (
    <div className="result-view">
      <header className="view-head">
        <button className="back-btn" onClick={onEdit} aria-label="폼으로 돌아가기">
          ←
        </button>
        <h2 className="view-title">{template.name}</h2>
      </header>

      {/* 출력 B — 사람용 미러 카드 */}
      <section className="b-card" aria-label="요청 내용 요약">
        <div className="b-cap">
          <b>이렇게 요청합니다</b>
          <button className="icon-btn" onClick={downloadB} aria-label="요약을 텍스트 파일로 내려받기">
            ⬇
          </button>
        </div>

        <div className="b-sec">
          <div className="b-label">AI에게 시키는 일</div>
          {human.role && <div className="b-role">역할: {human.role}</div>}
          <div className="b-text">{human.task}</div>
        </div>

        <div className="b-sec">
          <div className="b-label">전달한 내용</div>
          <ul className="b-list">
            {human.entries.map((e) => (
              <li key={e.label}>
                {e.fenced ? (
                  <>
                    {e.label}:
                    <pre className="b-fence">{e.value}</pre>
                  </>
                ) : (
                  <>
                    {e.label}: {e.value}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="b-sec">
          <div className="b-label">지켜야 할 조건</div>
          <ul className="b-list">
            {human.requirements.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>

        {human.outputFormat && (
          <div className="b-sec">
            <div className="b-label">결과물 형식</div>
            <div className="b-text">{human.outputFormat}</div>
          </div>
        )}

        {human.refineNote && (
          <div className="b-sec">
            <div className="b-label">{REFINE_LABEL_KO}</div>
            <div className="b-text">{human.refineNote}</div>
          </div>
        )}
      </section>

      {/* 출력 A — AI용 코드박스 */}
      <section className="a-box" aria-label="AI에게 보낼 프롬프트">
        <div className="a-bar">
          {FLAVOR_TABS.map((t) => (
            <button
              key={t.key}
              className={flavor === t.key ? 'a-tab on' : 'a-tab'}
              aria-pressed={flavor === t.key}
              onClick={() => pickFlavor(t.key)}
            >
              {t.label}
            </button>
          ))}
          <span className="a-sp" />
          <div className="a-seg" role="group" aria-label="상세도">
            {DETAIL_TABS.map((d) => (
              <button
                key={d.key}
                className={detail === d.key ? 'a-seg-btn on' : 'a-seg-btn'}
                aria-pressed={detail === d.key}
                onClick={() => pickDetail(d.key)}
              >
                {d.label}
              </button>
            ))}
          </div>
          <button
            className="icon-btn dark"
            onClick={downloadA}
            aria-label="프롬프트를 텍스트 파일로 내려받기"
          >
            ⬇
          </button>
        </div>
        {overrideActive && (
          <div className="a-refined-bar" role="status">
            <span className="refined-badge">✨ 내 API 키로 다듬은 프롬프트</span>
            <button className="btn-mini dark" onClick={() => setRefined(null)}>
              되돌리기
            </button>
          </div>
        )}
        <pre className="a-pre">{highlight(displayText, flavor)}</pre>
      </section>

      {/* C층 체크박스 (§8) — 정제 오버라이드 활성 중엔 비활성(이중 다듬기 방지) */}
      <label className={overrideActive ? 'refine-row disabled' : 'refine-row'} title={REFINE_TOOLTIP}>
        <input
          type="checkbox"
          checked={refineChecked}
          disabled={overrideActive}
          onChange={(e) => setRefineChecked(e.target.checked)}
        />
        <span>{REFINE_CHECKBOX_LABEL}</span>
        <span className="refine-help" aria-label={REFINE_TOOLTIP}>
          ?
        </span>
      </label>

      <div className="result-actions">
        <button className="btn-primary" onClick={handleCopy}>
          프롬프트 복사
        </button>
        <button className="btn-ghost" onClick={onEdit}>
          입력 수정
        </button>
        {provider && !overrideActive && (
          <button className="btn-ghost" onClick={handleRefine} disabled={refining}>
            {refining ? '다듬는 중…' : '프롬프트 지금 다듬기 (내 API 키)'}
          </button>
        )}
      </div>
    </div>
  );
}

/** 표시 전용 하이라이트 — 복사·다운로드는 항상 원문 텍스트를 쓴다 */
function highlight(text: string, flavor: Flavor) {
  return text.split('\n').map((line, i) => (
    <span key={i}>
      {highlightLine(line, flavor)}
      {'\n'}
    </span>
  ));
}

function highlightLine(line: string, flavor: Flavor) {
  if (flavor === 'claude') {
    const m = line.match(/^(<\/?[a-z_]+>)(.*?)(<\/[a-z_]+>)?$/);
    if (m && line.startsWith('<')) {
      return (
        <>
          <span className="hl-tag">{m[1]}</span>
          {m[2]}
          {m[3] && <span className="hl-tag">{m[3]}</span>}
        </>
      );
    }
  } else if (line.startsWith('## ')) {
    return <span className="hl-tag">{line}</span>;
  }
  if (line.startsWith('- ')) {
    return (
      <>
        <span className="hl-dim">-</span>
        {line.slice(1)}
      </>
    );
  }
  return line;
}
