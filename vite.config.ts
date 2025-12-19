import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3274',
        changeOrigin: true,
        secure: false,
        timeout: 5000, // 5 second timeout
        rewrite: (path) => path.replace(/^\/api/, '/api/v0'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            // Don't log the full error object to reduce noise
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
          });
        },
      }
    }
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
  optimizeDeps: {
    include: ["react-is"],
    exclude: ["chunk-KRAW4X74"],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));
