import { join } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// libsodium-wrappers-sumo's build imports a sibling "./libsodium-sumo.(mjs|js)"
// that is only a symlink to the separate libsodium-sumo package. `npm install`
// creates that symlink but `npm ci` (CI) does not, so the bundler can't resolve
// it. Redirect those imports to the real libsodium-sumo package, resolved as a
// sibling in the same node_modules as the importer.
const libsodiumSumoFix: Plugin = {
  name: "libsodium-sumo-symlink-fix",
  enforce: "pre",
  resolveId(source, importer) {
    if (
      importer &&
      importer.includes("libsodium-wrappers-sumo") &&
      /\/libsodium-sumo\.(mjs|js)$/.test(source)
    ) {
      const marker = "node_modules";
      const idx = importer.lastIndexOf(marker);
      if (idx === -1) return null;
      const nodeModules = importer.slice(0, idx + marker.length);
      const rel = source.endsWith(".mjs")
        ? "libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs"
        : "libsodium-sumo/dist/modules-sumo/libsodium-sumo.js";
      return join(nodeModules, rel);
    }
    return null;
  },
};

// Content-Security-Policy for the built app. Injected as a <meta> only in
// production builds (Cloudflare Pages does not reliably apply the CSP line
// from _headers, and a meta CSP in dev would break Vite's HMR). frame-ancestors
// is omitted here (ignored in meta) — X-Frame-Options: DENY covers framing.
const PROD_CSP =
  "default-src 'self'; " +
  "connect-src 'self' https://my-one-password-api.nalrarang.workers.dev; " +
  "script-src 'self' 'wasm-unsafe-eval'; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: blob:; " +
  "object-src 'none'; base-uri 'none'; manifest-src 'self'; worker-src 'self'";

const cspMetaPlugin: Plugin = {
  name: "inject-csp-meta",
  apply: "build",
  transformIndexHtml(html: string): string {
    return html.replace(
      /<head>/i,
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="${PROD_CSP}" />`,
    );
  },
};

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  build: {
    target: "esnext",
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
  esbuild: {
    target: "esnext",
  },
  plugins: [
    libsodiumSumoFix,
    cspMetaPlugin,
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icons/icon.svg"],
      manifest: false, // use public/manifest.json
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Cache Google Fonts or other CDN assets if any
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
        // Do NOT cache API responses in SW — IndexedDB handles encrypted vault caching
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB — libsodium WASM is ~3 MiB
        cleanupOutdatedCaches: true,
        skipWaiting: false, // let user control update timing
        clientsClaim: false,
      },
    }),
  ],
});
