import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: process.env.VITE_BASE_PATH || '/',
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
        // Legacy REACT_APP_ references → Vite VITE_ equivalents
        'process.env.REACT_APP_USE_REAL_AI':             JSON.stringify(env.VITE_USE_REAL_AI || env.REACT_APP_USE_REAL_AI || 'true'),
        'process.env.REACT_APP_USE_REAL_DATA':           JSON.stringify(env.VITE_USE_REAL_DATA || env.REACT_APP_USE_REAL_DATA || 'true'),
        'process.env.REACT_APP_USE_REAL_BACKEND':        JSON.stringify(env.VITE_USE_REAL_BACKEND || env.REACT_APP_USE_REAL_BACKEND || 'true'),
        'process.env.REACT_APP_SHOW_DEMO_INDICATORS':    JSON.stringify(env.VITE_SHOW_DEMO_INDICATORS || 'false'),
        'process.env.REACT_APP_ENABLE_ANALYTICS':        JSON.stringify(env.VITE_ENABLE_ANALYTICS || 'false'),
        'process.env.REACT_APP_ENABLE_AUTH':             JSON.stringify(env.VITE_ENABLE_AUTH || 'false'),
        'process.env.REACT_APP_API_BASE_URL':            JSON.stringify(env.VITE_API_BASE_URL || ''),
        'process.env.NODE_ENV':                          JSON.stringify(env.NODE_ENV || 'development'),
        // Legacy Gemini references (dead but prevents ReferenceError)
        'process.env.API_KEY':        JSON.stringify(''),
        'process.env.GEMINI_API_KEY': JSON.stringify(''),
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

              const inPkg = (pkgs: string[]) => pkgs.some((pkg) => id.includes(pkg));

              if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
                return 'vendor-react';
              }

              if (id.includes('/framer-motion/') || id.includes('/lucide-react/')) {
                return 'vendor-ui';
              }

              if (id.includes('/recharts/') || id.includes('/d3-')) {
                return 'vendor-charts';
              }

              if (inPkg(['/@google/generative-ai/', '/@google/genai/', '/openai/'])) {
                return 'vendor-ai';
              }

              if (inPkg(['/pdfjs-dist/'])) {
                return 'vendor-pdfjs';
              }

              if (inPkg(['/docx/'])) {
                return 'vendor-docx';
              }

              if (inPkg(['/jspdf/', '/html2canvas/'])) {
                return 'vendor-jspdf';
              }

              if (inPkg(['/pdf-lib/'])) {
                return 'vendor-pdflib';
              }

              if (inPkg(['/react-icons/'])) {
                return 'vendor-icons';
              }

              if (inPkg(['/@aws-sdk/', '/@smithy/'])) {
                return 'vendor-aws';
              }

              if (inPkg(['/leaflet/', '/react-leaflet/'])) {
                return 'vendor-maps';
              }

              if (inPkg(['/react-markdown/'])) {
                return 'vendor-markdown';
              }

              if (inPkg(['/mathjs/'])) {
                return 'vendor-math';
              }

              if (inPkg(['/axios/', '/uuid/'])) {
                return 'vendor-data';
              }

              return 'vendor-misc';
            }
          }
        }
      }
    };
});
