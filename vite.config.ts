import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Collect all environment variables starting with known prefixes or keys
  const collectedEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value && (key.endsWith('_API_KEY') || key.endsWith('_KEY') || key.includes('OLLAMA') || key.includes('AI'))) {
      collectedEnv[key] = value;
    }
  }

  // Also include anything from .env files
  for (const [key, value] of Object.entries(env)) {
    if (value) {
      collectedEnv[key] = value;
    }
  }

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      tailwindcss(),
    ],
    define: {
      '__SYSTEM_ENV__': JSON.stringify(collectedEnv),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || collectedEnv.GEMINI_API_KEY || ''),
      'import.meta.env.VITE_OPENROUTER_API_KEY': JSON.stringify(env.OPENROUTER_API_KEY || collectedEnv.OPENROUTER_API_KEY || ''),
      'import.meta.env.VITE_OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY || collectedEnv.OPENAI_API_KEY || ''),
      'import.meta.env.VITE_DEEPSEEK_API_KEY': JSON.stringify(env.DEEPSEEK_API_KEY || collectedEnv.DEEPSEEK_API_KEY || ''),
      'import.meta.env.VITE_GROQ_API_KEY': JSON.stringify(env.GROQ_API_KEY || collectedEnv.GROQ_API_KEY || ''),
      'import.meta.env.VITE_OLLAMA_ENDPOINT': JSON.stringify(env.OLLAMA_HOST || collectedEnv.OLLAMA_HOST || 'http://localhost:11434'),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('pdfjs-dist')) {
                return 'pdfjs-vendor';
              }
              if (id.includes('@google/genai')) {
                return 'gemini-vendor';
              }
              if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype') || id.includes('highlight.js')) {
                return 'markdown-vendor';
              }
              if (id.includes('dexie')) {
                return 'storage-vendor';
              }
              if (id.includes('lucide-react')) {
                return 'icons-vendor';
              }
            }
          },
        },
      },
      chunkSizeWarningLimit: 800,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
