import { useMemo, useState } from 'react';
import type { DetailLevel, Flavor, TaskTemplate } from '../engine/types';
import { buildHumanModel, buildSpec, renderAI, renderHuman } from '../engine/render';
import { copyText } from '../lib/clipboard';
import {
  buildPromptFilename,
  buildSummaryFilename,
  buildSummaryHeader,
  downloadTextFile,
} from '../lib/download';
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

/** 결과 — 상단 B 카드(사람용 검증) + 하단 A 코드박스(복사 대상). 탭·토글 즉시 재렌더 (§6.1). */
export default function ResultView({ template, values, initialDetail, onEdit, onToast }: Props) {
  const [flavor, setFlavor] = useState<Flavor>(() =>
    template.defaultFlavor ?? loadLastFlavor(),
  );
  const [detail, setDetail] = useState<DetailLevel>(initialDetail);

  const spec = useMemo(() => buildSpec(template, values, detail), [template, values, detail]);
  const aiText = useMemo(() => renderAI(spec, flavor, detail), [spec, flavor, detail]);
  const human = useMemo(() => buildHumanModel(spec, detail), [spec, detail]);

  const pickFlavor = (f: Flavor) => {
    setFlavor(f);
    saveLastFlavor(f);
  };
  const pickDetail = (d: DetailLevel) => {
    setDetail(d);
    saveLastDetail(d);
  };

  const handleCopy = async () => {
    const r = await copyText(aiText);
    if (r.ok) onToast('복사됐어요. AI 채팅창에 붙여넣으세요.', true);
    else onToast('복사가 안 됐어요. 어두운 코드 상자의 글을 드래그해 직접 복사해 주세요.', false);
  };

  const downloadA = () => {
    downloadTextFile(buildPromptFilename(template.name, new Date()), aiText);
    onToast('프롬프트 파일을 내려받았어요.', true);
  };
  const downloadB = () => {
    const now = new Date();
    const body = renderHuman(spec, detail);
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
        <pre className="a-pre">{highlight(aiText, flavor)}</pre>
      </section>

      <div className="result-actions">
        <button className="btn-primary" onClick={handleCopy}>
          프롬프트 복사
        </button>
        <button className="btn-ghost" onClick={onEdit}>
          입력 수정
        </button>
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
    // <tag>내용</tag> / <tag> / </tag> 구조 태그를 강조
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
