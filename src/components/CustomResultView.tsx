import { useMemo, useState } from 'react';
import type { CustomPrompt } from '../engine/custom';
import { extractVariables, substituteVariables } from '../engine/custom';
import {
  REFINE_CHECKBOX_LABEL,
  REFINE_LABEL_KO,
  REFINE_NOTE_KO,
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
import { loadLastFlavor } from '../lib/storage';

interface Props {
  prompt: CustomPrompt;
  values: Record<string, string>;
  /** 변수가 있으면 채우기 폼으로, 없으면 홈으로 */
  onBack(): void;
  onToast(message: string, ok: boolean): void;
}

/**
 * 커스텀 결과 화면 특칙 (§7.11):
 * 플레이버 탭·상세도 토글 없음. 출력 A = 원문에 변수값만 치환한 완성본.
 * 출력 B = 프롬프트 이름 + 채운 값 목록 + 안내 1줄.
 */
export default function CustomResultView({ prompt, values, onBack, onToast }: Props) {
  const variables = useMemo(() => extractVariables(prompt.body), [prompt.body]);
  const substituted = useMemo(() => substituteVariables(prompt.body, values), [prompt.body, values]);
  const [refineChecked, setRefineChecked] = useState(false);
  const hasVariables = variables.length > 0;

  // 체크 시 메타 지시문을 원문 앞에 덧댈 뿐, 사용자 원문은 한 글자도 바뀌지 않는다 (§8).
  // 커스텀엔 플레이버 탭이 없으므로 래퍼 형식은 마지막 사용 플레이버, 폴백 Claude (§8 v2 확정).
  const finalText = useMemo(
    () => (refineChecked ? renderRefineWrapper(substituted, loadLastFlavor()) : substituted),
    [refineChecked, substituted],
  );

  const handleCopy = async () => {
    const r = await copyText(finalText);
    if (r.ok) onToast('복사됐어요. AI 채팅창에 붙여넣으세요.', true);
    else onToast('복사가 안 됐어요. 어두운 코드 상자의 글을 드래그해 직접 복사해 주세요.', false);
  };

  const downloadA = () => {
    downloadTextFile(buildPromptFilename(prompt.name, new Date()), finalText);
    onToast('프롬프트 파일을 내려받았어요.', true);
  };

  const downloadB = () => {
    const now = new Date();
    const lines = [
      `[내 프롬프트] ${prompt.name}`,
      '',
      '[채운 값]',
      ...(hasVariables ? variables.map((v) => `- ${v}: ${values[v] ?? ''}`) : ['- (변수 없음)']),
      '',
      '등록하신 프롬프트 원문에 위 값이 채워졌습니다',
      ...(refineChecked ? ['', `[${REFINE_LABEL_KO}]`, REFINE_NOTE_KO] : []),
    ].join('\n');
    downloadTextFile(
      buildSummaryFilename(prompt.name, now),
      `${buildSummaryHeader(prompt.name, now)}\n\n${lines}`,
    );
    onToast('요약 파일을 내려받았어요.', true);
  };

  return (
    <div className="result-view">
      <header className="view-head">
        <button className="back-btn" onClick={onBack} aria-label="이전 화면으로">
          ←
        </button>
        <h2 className="view-title">{prompt.name}</h2>
      </header>

      {/* 출력 B — 이름 + 채운 값 + 안내 1줄 */}
      <section className="b-card" aria-label="채운 값 요약">
        <div className="b-cap">
          <b>이렇게 요청합니다</b>
          <button className="icon-btn" onClick={downloadB} aria-label="요약을 텍스트 파일로 내려받기">
            ⬇
          </button>
        </div>

        <div className="b-sec">
          <div className="b-label">내 프롬프트</div>
          <div className="b-text">{prompt.name}</div>
        </div>

        <div className="b-sec">
          <div className="b-label">채운 값</div>
          {hasVariables ? (
            <ul className="b-list">
              {variables.map((v) => (
                <li key={v}>
                  {v}: {values[v] ?? ''}
                </li>
              ))}
            </ul>
          ) : (
            <div className="b-text">변수가 없는 프롬프트예요 — 원문 그대로 사용돼요.</div>
          )}
        </div>

        <p className="b-note">등록하신 프롬프트 원문에 위 값이 채워졌습니다</p>
        {refineChecked && (
          <div className="b-sec">
            <div className="b-label">{REFINE_LABEL_KO}</div>
            <div className="b-text">{REFINE_NOTE_KO}</div>
          </div>
        )}
      </section>

      {/* 출력 A — 치환 완성본. 탭·토글 없음 (골격 무변형 철칙) */}
      <section className="a-box" aria-label="완성된 프롬프트">
        <div className="a-bar">
          <span className="a-static-label">내 프롬프트 완성본</span>
          <span className="a-sp" />
          <button
            className="icon-btn dark"
            onClick={downloadA}
            aria-label="프롬프트를 텍스트 파일로 내려받기"
          >
            ⬇
          </button>
        </div>
        <pre className="a-pre">{finalText}</pre>
      </section>

      <label className="refine-row" title={REFINE_TOOLTIP}>
        <input
          type="checkbox"
          checked={refineChecked}
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
        <button className="btn-ghost" onClick={onBack}>
          {hasVariables ? '입력 수정' : '홈으로'}
        </button>
      </div>
    </div>
  );
}
