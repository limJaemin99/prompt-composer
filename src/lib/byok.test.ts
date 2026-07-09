import { describe, it, expect } from 'vitest';
import { errorMessage } from './byok';

describe('BYOK 에러 문구 (§6.2 원인+행동)', () => {
  it('401/403 → 키 확인 안내', () => {
    expect(errorMessage(401)).toContain('API 키가 올바르지 않아요');
    expect(errorMessage(403)).toContain('설정에서 키를 다시 확인');
  });

  it('429 + limit: 0 본문 → 키 등급/모델 할당량 안내 (재시도 무의미 케이스)', () => {
    const body =
      '{"error":{"code":429,"status":"RESOURCE_EXHAUSTED","message":"Quota exceeded for metric, limit: 0"}}';
    const msg = errorMessage(429, body);
    expect(msg).toContain('키 등급에서는 이 모델을 쓸 수 없어요');
    expect(msg).not.toContain('다시 시도'); // "잠시 후 재시도"로 오도하지 않음
  });

  it('429 일반(빈도 제한) → 잠시 후 재시도 안내', () => {
    const body = '{"error":{"code":429,"message":"Rate limit exceeded, limit: 60 per minute"}}';
    expect(errorMessage(429, body)).toContain('1분 정도 후에 다시 시도');
    expect(errorMessage(429)).toContain('1분 정도 후에 다시 시도'); // 본문 없어도 안전
  });

  it('limit: 0 판정은 단어 경계 기준 — limit: 0.5나 1000에 오탐하지 않음', () => {
    expect(errorMessage(429, 'limit: 1000 per day')).toContain('다시 시도');
  });

  it('5xx → 서비스 불안정 안내', () => {
    expect(errorMessage(500)).toContain('일시적으로 불안정');
    expect(errorMessage(529)).toContain('일시적으로 불안정');
  });
});
