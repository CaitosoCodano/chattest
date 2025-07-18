import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,
  },
  preview: {
    host: "::",
    port: 4173,
  },
  build: {
    target: 'es2020',
    minify: false, // Disable minification to avoid hoisting issues
    rollupOptions: {
      output: {
        manualChunks: undefined,
        format: 'es',
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  esbuild: {
    keepNames: true, // Preserve function names
  },
}));
