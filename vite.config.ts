import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 산출물: dist/index.html 단 하나 (JS/CSS 전부 인라인, file:// 더블클릭 실행)
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    target: 'es2020',
  },
  test: {
    environment: 'node', // 렌더러는 순수 함수 — DOM 환경 불필요 (필요 시점에 사전 승인 후 jsdom 추가)
    include: ['src/**/*.test.ts'],
  },
});
