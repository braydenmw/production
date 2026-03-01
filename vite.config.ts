import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/bwmetadata/',
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          // Proxy API requests to backend server during development
          '/api': {
            target: 'http://localhost:3004',
            changeOrigin: true,
            secure: false,
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 3000,
        rollupOptions: {
          onwarn(warning, warn) {
            const message = warning?.message || '';
            if (
              message.includes('is dynamically imported by') &&
              message.includes('but also statically imported by')
            ) {
              return;
            }
            warn(warning);
          },
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) {
                return undefined;
              }

              if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
                return 'vendor-react';
              }

              if (id.includes('/framer-motion/') || id.includes('/lucide-react/')) {
                return 'vendor-ui';
              }

              if (id.includes('/recharts/') || id.includes('/d3-')) {
                return 'vendor-charts';
              }

              if (id.includes('/@google/generative-ai/') || id.includes('/openai/')) {
                return 'vendor-ai';
              }

              if (id.includes('/pdf-lib/') || id.includes('/jspdf/') || id.includes('/html2canvas/')) {
                return 'vendor-docs';
              }

              return 'vendor-misc';
            }
          }
        }
      }
    };
});
