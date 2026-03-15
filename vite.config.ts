import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';

/**
 * Vite plugin: proxy external image URLs through /image-proxy?url=<encoded>
 * This bypasses CORS restrictions on OSS/CDN image links returned by Wanxiang API.
 */
function ossImageProxyPlugin(): Plugin {
  return {
    name: 'oss-image-proxy',
    configureServer(server) {
      server.middlewares.use('/image-proxy', async (req, res) => {
        const rawUrl = req.url ?? '';
        const qs = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?') + 1) : '';
        const params = new URLSearchParams(qs);
        const imageUrl = params.get('url');

        if (!imageUrl) {
          res.statusCode = 400;
          res.end('Missing url parameter');
          return;
        }

        try {
          const upstream = await fetch(imageUrl);
          const contentType = upstream.headers.get('content-type') || 'image/png';
          const buffer = await upstream.arrayBuffer();
          res.setHeader('Content-Type', contentType);
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.statusCode = 200;
          res.end(Buffer.from(buffer));
        } catch (e) {
          res.statusCode = 500;
          res.end(`Image proxy error: ${e}`);
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const hmrPort = mode === 'parity' ? 1422 : 1421;
  return {
    clearScreen: false,
    base: './',
    plugins: [react(), tailwindcss(), ossImageProxyPlugin()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.DASHSCOPE_API_KEY': JSON.stringify(env.DASHSCOPE_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true' ? {
        protocol: 'ws',
        host: 'localhost',
        port: hmrPort,
      } : false,
      proxy: {
        '/dashscope-api': {
          target: 'https://dashscope.aliyuncs.com',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/dashscope-api/, '/api'),
        },
      },
    },
  };
});

