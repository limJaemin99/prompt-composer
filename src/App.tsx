import { useMemo, useState } from 'react';
import { copyText, type CopyResult } from './lib/clipboard';
import { downloadTextFile, formatTimestamp } from './lib/download';

/**
 * M1 임시 검증 화면.
 * 목적: file:// 더블클릭 환경에서 ① 클립보드 복사(+폴백) ② UTF-8 BOM .txt 다운로드가
 * 실제로 동작하는지 검증한다. 정식 UI는 M3에서 별도 구현한다.
 */

const SAMPLE_TEXT = `프롬프트 생성기 M1 파이프라인 검증용 샘플입니다.
한글, English, 숫자 123, 기호 <>&"' 모두 포함.
이 텍스트가 복사·다운로드 후에도 그대로면 성공입니다.`;

interface EnvInfo {
  protocol: string;
  secureContext: boolean;
  clipboardApi: boolean;
  execCommand: boolean;
}

function readEnv(): EnvInfo {
  return {
    protocol: window.location.protocol,
    secureContext: window.isSecureContext,
    clipboardApi: !!navigator.clipboard?.writeText,
    execCommand: typeof document.execCommand === 'function',
  };
}

export default function App() {
  const env = useMemo(readEnv, []);
  const [text, setText] = useState(SAMPLE_TEXT);
  const [copyResult, setCopyResult] = useState<CopyResult | null>(null);
  const [downloaded, setDownloaded] = useState<string | null>(null);

  const handleCopy = async () => {
    setCopyResult(await copyText(text));
  };

  const handleDownload = () => {
    const filename = `검증샘플_${formatTimestamp(new Date())}.txt`;
    downloadTextFile(filename, text);
    setDownloaded(filename);
  };

  return (
    <main className="wrap">
      <h1>프롬프트 생성기</h1>
      <p className="sub">M1 파이프라인 검증 화면 — 정식 화면은 M3에서 만들어집니다.</p>

      <section className="panel">
        <h2>실행 환경 진단</h2>
        <ul className="diag">
          <li>
            프로토콜: <code>{env.protocol}</code>
          </li>
          <li>
            보안 컨텍스트(isSecureContext): <code>{String(env.secureContext)}</code>
          </li>
          <li>
            클립보드 API 사용 가능: <code>{String(env.clipboardApi)}</code>
          </li>
          <li>
            execCommand 폴백 사용 가능: <code>{String(env.execCommand)}</code>
          </li>
        </ul>
      </section>

      <section className="panel">
        <h2>검증용 텍스트</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          aria-label="검증용 텍스트"
        />
        <div className="actions">
          <button type="button" className="primary" onClick={handleCopy}>
            프롬프트 복사
          </button>
          <button type="button" onClick={handleDownload}>
            .txt 다운로드
          </button>
        </div>

        {copyResult && (
          <p className={copyResult.ok ? 'ok' : 'fail'} role="status">
            {copyResult.ok
              ? `복사됐어요. (방법: ${copyResult.method}) 메모장에 붙여넣어 확인해 보세요.`
              : `복사에 실패했어요. (마지막 시도: ${copyResult.method ?? '없음'}) ${copyResult.error ?? ''}`}
          </p>
        )}
        {downloaded && (
          <p className="ok" role="status">
            <code>{downloaded}</code> 파일을 내려받았어요. 메모장으로 열어 한글이 깨지지 않는지 확인해
            보세요.
          </p>
        )}
      </section>
    </main>
  );
}
