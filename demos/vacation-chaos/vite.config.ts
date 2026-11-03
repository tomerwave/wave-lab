import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: fileURLToPath(new URL('dist/web', import.meta.url)),
    emptyOutDir: true,
    rolldownOptions: {
      input: fileURLToPath(new URL('web/control/Main.tsx', import.meta.url)),
      output: { entryFileNames: 'control.js', assetFileNames: 'control[extname]' },
    },
  },
});
