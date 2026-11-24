import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function fileProtocolCompatible() {
  return {
    name: 'file-protocol-compatible',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replace(
          /<script\s+type="module"\s+crossorigin\s+src="([^"]+)"><\/script>/g,
          '<script defer src="$1"></script>',
        )
        .replace(
          /<link\s+rel="stylesheet"\s+crossorigin\s+href="([^"]+)">/g,
          '<link rel="stylesheet" href="$1">',
        );
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), fileProtocolCompatible()],
  build: {
    modulePreload: false,
    rollupOptions: {
      output: {
        format: 'iife',
      },
    },
  },
  server: {
    host: '0.0.0.0',
  },
});
