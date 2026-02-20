import { defineConfig, Plugin, ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { exec } from 'child_process';

// 自定義插件：開發模式下自動開啟兩個瀏覽器分頁
function openDualBrowser(): Plugin {
  return {
    name: 'open-dual-browser',
    configureServer(server: ViteDevServer) {
      server.httpServer?.once('listening', () => {
        setTimeout(() => {
          const url1 = 'http://localhost:5173';
          const url2 = 'http://localhost:5173/#/display';

          // Windows
          if (process.platform === 'win32') {
            exec(`start ${url1}`);
            exec(`start ${url2}`);
          }
          // macOS
          else if (process.platform === 'darwin') {
            exec(`open ${url1}`);
            exec(`open ${url2}`);
          }
          // Linux
          else {
            exec(`xdg-open ${url1}`);
            exec(`xdg-open ${url2}`);
          }
        }, 500); // 延遲 500ms 確保伺服器完全啟動
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), openDualBrowser()],
  base: './',
  root: 'src/renderer',
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true, // 如果 5173 被佔用，報錯而不是換端口
  },
});
