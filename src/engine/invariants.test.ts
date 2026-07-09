/**
 * 전역 불변식 테스트 (§10.1) — 9유형 × 3플레이버 × 3상세도 = 81조합 스모크.
 * 각 유형의 fixture는 §10.2 골든 입력을 겸한다.
 */
import { describe, it, expect } from 'vitest';
import type { DetailLevel, Flavor, TaskTemplate } from './types';
import { buildSpec, renderAI, renderHuman } from './render';
import { TEMPLATES } from '../templates';
import { emailTemplate } from '../templates/email';
import { freeTemplate } from '../templates/free';
import { SELFCHECK } from '../templates/common';

const FLAVORS: Flavor[] = ['claude', 'gpt', 'gemini'];
const DETAILS: DetailLevel[] = ['simple', 'standard', 'detailed'];

/** 유형별 스모크 fixture — §10.2 골든 입력을 재사용하고 유형 특성 플래그를 함께 정의 */
interface SmokeCase {
  template: TaskTemplate;
  values: Record<string, string>;
  /** 값이 있지만 표준 이상에서 role로 승격되는 필드 (verbatim은 role 블록에서 검증) */
  roleField?: string;
}

/** §10.1: 9유형 × 3플레이버 × 3상세도 = 81조합 스모크의 유형별 입력 */
const CASES: SmokeCase[] = [
  {
    template: emailTemplate,
    values: {
      channel: '이메일',
      recipient: '거래처 김 과장님 (외부, 격식 필요)',
      purpose: '요청',
      keyMessage: '다음 주 화요일 예정 미팅을 목요일로 연기 요청',
      tone: '정중하고 격식 있게',
      mustInclude: '일정 변경에 대한 사과 한 줄',
      length: '보통',
    },
  },
  {
    template: TEMPLATES.find((t) => t.id === 'report')!,
    values: {
      docType: '업무 보고서',
      topic: '3분기 고객 문의 응대 현황',
      content: '문의 건수 1,240건으로 전분기 대비 8% 증가\n주요 원인은 신제품 출시 문의\n응대 만족도 4.2점 유지',
      audience: '팀장님 보고용',
      style: '개조식',
      length: '1페이지',
      structure: '개요 → 현황 → 문제점 → 개선안',
    },
  },
  {
    template: TEMPLATES.find((t) => t.id === 'summarize')!,
    values: {
      source: '금일 회의에서 3분기 목표를 확정했다.\n영업팀은 신규 고객 30곳 확보를 맡는다.\n마감 기한은 9월 30일이며 담당자는 박지현이다.',
      use: '상사 보고용',
      format: '핵심 불릿',
      amount: '불릿 5~7개',
      mustKeep: '날짜와 담당자 이름은 반드시 유지',
    },
  },
  {
    template: TEMPLATES.find((t) => t.id === 'translate')!,
    values: {
      mode: '한국어 → 영어 번역',
      source: '안녕하세요, 김 과장님.\n지난주 요청하신 견적서를 첨부해 드립니다.\n검토 후 의견 부탁드립니다.',
      context: '비즈니스 이메일',
      glossary: "'수협은행'은 'Sh Suhyup Bank'로 표기",
      explain: 'true',
    },
  },
  {
    template: TEMPLATES.find((t) => t.id === 'brainstorm')!,
    values: {
      topic: '신입사원 온보딩 개선 방안',
      background: '예산 거의 없음, 대상은 20명 규모 팀',
      count: '10개',
      direction: '균형 있게',
      withEval: 'true',
    },
  },
  {
    template: TEMPLATES.find((t) => t.id === 'data')!,
    values: {
      goal: '수식·함수 만들기',
      dataDesc: 'A열 날짜, B열 지점명, C열 매출액\n약 1,000행 규모\n2026년 1월부터 누적',
      want: '지점별 월 매출 합계를 구하고 싶어요',
      tool: 'Excel',
      level: '초급 — 자세한 설명 필요',
    },
  },
  {
    template: TEMPLATES.find((t) => t.id === 'image')!,
    values: {
      subject: '노란 옷을 입고 산책하는 흰색 강아지',
      style: '깔끔한 일러스트',
      scene: '공원 배경, 전신이 보이게',
      mood: '밝고 따뜻한 파스텔톤',
      usage: '발표자료용',
      avoid: '이미지 안에 글자 넣지 말 것',
    },
  },
  {
    template: TEMPLATES.find((t) => t.id === 'code')!,
    values: {
      kind: '에러 해결',
      env: 'Python 3.11',
      want: '엑셀 파일을 읽을 때 인코딩 오류가 발생합니다',
      code: 'df = pd.read_csv("sales.csv")\nUnicodeDecodeError: utf-8 codec\ncannot decode byte 0xb0 in position 2',
      constraints: '외부 라이브러리 없이',
      explainLevel: '핵심 설명 포함',
    },
  },
  {
    template: freeTemplate,
    values: {
      want: '사내 공지문 초안 작성',
      context: '대상: 전 직원 500명\n시기: 다음 주 월요일\n민감도: 높음',
      outputShape: '표로',
      aiRole: '마케팅 전문가',
    },
    roleField: 'aiRole',
  },
];

describe.each(CASES)('불변식 — $template.id', ({ template, values, roleField }) => {
  describe.each(FLAVORS)('플레이버 %s', (flavor) => {
    describe.each(DETAILS)('상세도 %s', (detail) => {
      const spec = buildSpec(template, values, detail);
      const a = renderAI(spec, flavor, detail);
      const b = renderHuman(spec, detail);

      it('1. verbatim — 입력된 모든 값이 A·B에 원문 그대로 존재 (checkbox 제외)', () => {
        for (const f of template.fields) {
          const value = values[f.key];
          if (!value || f.widget === 'checkbox') continue; // checkbox 'true'는 사용자 문장이 아님
          expect(a).toContain(value);
          expect(b).toContain(value);
        }
      });

      it('2. A/B 패리티 — 요구사항 줄 수가 A·B에서 1:1 일치', () => {
        const expected = template.buildRequirements(values, detail).length;
        const aReq = extractListLines(a, flavor === 'claude' ? '<requirements>' : '## Requirements');
        const bReq = extractListLines(b, '[지켜야 할 조건]');
        expect(aReq).toHaveLength(expected);
        expect(bReq).toHaveLength(expected);
      });

      it('2b. A/B 패리티 — 입력된 필드 집합이 A·B에 라벨 단위로 1:1 존재', () => {
        // 기대 필드 집합을 테스트 쪽에서 독립 계산 (구현 specEntries에 의존하지 않음):
        // 값이 있거나 defaultValue가 있는 필드, 단 roleFromField는 표준 이상에서 role로 승격되어 제외
        const promoted = detail !== 'simple' && roleField && values[roleField];
        const expectedFields = template.fields.filter(
          (f) =>
            f.widget !== 'checkbox' &&
            (values[f.key] ?? f.defaultValue) &&
            !(promoted && f.key === roleField),
        );
        for (const f of expectedFields) {
          const aPrefix = flavor === 'claude' ? `- ${f.label.en}:` : `**${f.label.en}:**`;
          expect(a.split('\n').filter((l) => l.startsWith(aPrefix))).toHaveLength(1);
          expect(b.split('\n').filter((l) => l.startsWith(`- ${f.label.ko}:`))).toHaveLength(1);
        }
      });

      it('2c. 상세도 단조성 — 상세 요구사항은 표준을 순서대로 포함하고 SELFCHECK로 끝남 (§5.3)', () => {
        if (detail !== 'detailed') return;
        const std = template.buildRequirements(values, 'standard').map((r) => r.en);
        const det = template.buildRequirements(values, 'detailed').map((r) => r.en);
        let matched = 0;
        for (const line of det) if (line === std[matched]) matched++;
        expect(matched).toBe(std.length); // 표준이 상세의 부분수열(순서 유지)
        expect(det[det.length - 1]).toBe(SELFCHECK.en);
      });

      it('3. 구조 — 플레이버별 골격 존재, claude는 태그 균형', () => {
        if (flavor === 'claude') {
          expect(a).toContain('<task>');
          for (const tag of ['role', 'task', 'specification', 'requirements', 'output_format']) {
            const open = count(a, `<${tag}>`);
            const close = count(a, `</${tag}>`);
            expect(open).toBe(close);
          }
        } else {
          expect(a).toContain('## Task');
        }
      });

      it('4. 상세도 — simple엔 role 없음, detailed엔 SELFCHECK 존재', () => {
        if (detail === 'simple') {
          expect(a).not.toContain(flavor === 'claude' ? '<role>' : '## Role');
          expect(hasRoleLine(b)).toBe(false);
        }
        if (detail === 'detailed') {
          expect(a).toContain(SELFCHECK.en);
          expect(b).toContain(SELFCHECK.ko);
        }
      });

      it('5. 펜스 — longContent 필드 값은 코드 펜스 안에 위치', () => {
        for (const field of template.fields) {
          const value = values[field.key];
          if (field.longContent && value) {
            expect(a).toContain('```\n' + value + '\n```');
            expect(b).toContain('```\n' + value + '\n```');
          }
        }
      });

      it('6. 역할 승격 — roleFromField 값은 표준 이상에서 role로, 간단에선 목록에 유지', () => {
        if (!roleField) return;
        const roleValue = values[roleField];
        if (detail === 'simple') {
          // role 블록이 없으므로 specification 항목으로 값 보존
          expect(a).toContain(roleValue);
        } else {
          expect(a).toContain(`Act as: ${roleValue}`);
          expect(b.split('\n')).toContain(`역할: ${roleValue}`);
          // 중복 표기 방지 — spec 목록에는 없음
          const label = template.fields.find((f) => f.key === roleField)!.label;
          expect(a).not.toContain(`${label.en}:`);
          expect(b).not.toContain(`${label.ko}:`);
        }
      });
    });
  });
});

describe('불변식 6 — 빈 필드는 라벨조차 나타나지 않음', () => {
  const minimalEmail = buildSpec(
    emailTemplate,
    { recipient: '팀장님', purpose: '보고', keyMessage: '주간 실적 보고' },
    'standard',
  );
  const minimalFree = buildSpec(freeTemplate, { want: '회의 안건 정리' }, 'standard');

  it.each(FLAVORS)('email 최소 입력(%s): mustInclude 라벨 부재', (flavor) => {
    const a = renderAI(minimalEmail, flavor, 'standard');
    const b = renderHuman(minimalEmail, 'standard');
    expect(a).not.toContain('Must include');
    expect(b).not.toContain('꼭 넣을 것');
  });

  it.each(FLAVORS)('free 최소 입력(%s): 선택 필드 라벨 부재 + role 블록 없음', (flavor) => {
    const a = renderAI(minimalFree, flavor, 'standard');
    const b = renderHuman(minimalFree, 'standard');
    for (const en of ['Background', 'Desired output shape', 'Role for the AI']) {
      expect(a).not.toContain(en);
    }
    for (const ko of ['배경 설명', '원하는 결과물 형태', 'AI에게 줄 역할']) {
      expect(b).not.toContain(ko);
    }
    expect(a).not.toContain(flavor === 'claude' ? '<role>' : '## Role');
    expect(hasRoleLine(b)).toBe(false);
  });

  it('email 최소 입력: select 기본값(channel/tone/length)은 항상 존재 — 기본값 있는 select는 항상 출력', () => {
    const a = renderAI(minimalEmail, 'claude', 'standard');
    expect(a).toContain('Channel: 이메일');
    expect(a).toContain('Tone: 정중하고 격식 있게');
    expect(a).toContain('Length: 보통');
  });

  it('비-longContent 필드도 값이 3줄 이상이면 자동으로 펜스에 감싸짐 (§5.3)', () => {
    const spec = buildSpec(
      emailTemplate,
      {
        recipient: '팀장님',
        purpose: '보고',
        keyMessage: '첫째 줄\n둘째 줄\n셋째 줄',
      },
      'standard',
    );
    const a = renderAI(spec, 'claude', 'standard');
    expect(a).toContain('- Key message:\n```\n첫째 줄\n둘째 줄\n셋째 줄\n```');
    const gpt = renderAI(spec, 'gpt', 'standard');
    expect(gpt).toContain('**Key message:**\n```\n첫째 줄\n둘째 줄\n셋째 줄\n```');
  });
});

/** 헤더 직후 블록의 '- ' 목록 줄 추출 */
function extractListLines(text: string, header: string): string[] {
  const start = text.indexOf(header);
  if (start === -1) return [];
  const after = text.slice(start + header.length);
  // 다음 블록 경계(빈 줄 2연속 이후의 새 블록 or 닫는 태그)까지
  const endIdx = (() => {
    const closeTag = after.indexOf('</');
    const nextBlock = after.indexOf('\n\n');
    if (closeTag === -1) return nextBlock === -1 ? after.length : nextBlock;
    if (nextBlock === -1) return closeTag;
    return Math.min(closeTag, nextBlock);
  })();
  return after
    .slice(0, endIdx)
    .split('\n')
    .filter((l) => l.startsWith('- '));
}

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/** 출력 B에 "역할: "으로 시작하는 줄이 있는지 (라벨 "AI에게 줄 역할: " 오탐 방지 — 줄 시작 기준) */
function hasRoleLine(b: string): boolean {
  return b.split('\n').some((l) => l.startsWith('역할: '));
}
