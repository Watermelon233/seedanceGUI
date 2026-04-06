import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '');
  const isMock = env.VITE_MOCK_API === 'true';

  console.log('[Vite Config] VITE_MOCK_API =', env.VITE_MOCK_API, 'isMock =', isMock);

  // 生产环境强制禁用 mock
  if (mode === 'production') {
    if (isMock) {
      throw new Error('FATAL: MOCK_API enabled in production build! Refusing to build.');
    }
    if ('VITE_MOCK_API' in env) {
      console.warn('⚠️ VITE_MOCK_API detected in production, ignoring...');
    }
  }

  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: true, // 监听所有地址，方便局域网访问
    },
    define: {
      'import.meta.env.VITE_MOCK_API': JSON.stringify(isMock ? 'true' : 'false'),
    },
  };
});
