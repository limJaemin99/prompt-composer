import {
  INTERVIEW_CHECKBOX_LABEL,
  INTERVIEW_TOOLTIP,
  MUTEX_TOOLTIP,
  REFINE_CHECKBOX_LABEL,
  REFINE_TOOLTIP,
} from '../engine/refine';

interface Props {
  /** C층 "먼저 다듬기" 체크 상태 */
  refine: boolean;
  /** 인터뷰 "먼저 질문하기" 체크 상태 */
  interview: boolean;
  onRefineChange(v: boolean): void;
  onInterviewChange(v: boolean): void;
  /** BYOK 정제 오버라이드 등으로 두 옵션 모두 강제 비활성 (M6 규칙 확장) */
  forceDisabled?: boolean;
}

/**
 * C층 메타 옵션 두 체크박스 (§8 먼저 다듬기 / §4 먼저 질문하기).
 * 상호 배타(v2 §6-7): 하나를 체크하면 다른 쪽 비활성 + 안내 툴팁, 해제 시 복원.
 * 결과 화면·커스텀 결과 화면이 공유해 로직 드리프트를 막는다.
 */
export default function MetaOptions({
  refine,
  interview,
  onRefineChange,
  onInterviewChange,
  forceDisabled = false,
}: Props) {
  const refineDisabled = forceDisabled || interview;
  const interviewDisabled = forceDisabled || refine;
  // 비활성 사유가 "상대 선택"이면 상호 배타 안내, 그 외(override)엔 원래 툴팁 유지
  const refineTitle = interview && !forceDisabled ? MUTEX_TOOLTIP : REFINE_TOOLTIP;
  const interviewTitle = refine && !forceDisabled ? MUTEX_TOOLTIP : INTERVIEW_TOOLTIP;

  return (
    <div className="meta-options">
      <label className={refineDisabled ? 'refine-row disabled' : 'refine-row'} title={refineTitle}>
        <input
          type="checkbox"
          checked={refine}
          disabled={refineDisabled}
          onChange={(e) => onRefineChange(e.target.checked)}
        />
        <span>{REFINE_CHECKBOX_LABEL}</span>
        <span className="refine-help" aria-label={refineTitle}>
          ?
        </span>
      </label>

      <label
        className={interviewDisabled ? 'refine-row disabled' : 'refine-row'}
        title={interviewTitle}
      >
        <input
          type="checkbox"
          checked={interview}
          disabled={interviewDisabled}
          onChange={(e) => onInterviewChange(e.target.checked)}
        />
        <span>{INTERVIEW_CHECKBOX_LABEL}</span>
        <span className="refine-help" aria-label={interviewTitle}>
          ?
        </span>
      </label>
    </div>
  );
}
