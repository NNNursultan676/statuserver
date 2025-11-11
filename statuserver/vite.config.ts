import { defineConfig } from "vite";
import path from "path";

export default defineConfig(async () => {
  const isDev = process.env.NODE_ENV !== "production";
  const plugins = [];

  // ✅ React-плагин должен подключаться всегда
  const react = (await import("@vitejs/plugin-react")).default;
  plugins.push(react({ jsxRuntime: "automatic" }));

  // 👇 Остальные плагины — только для Replit/Dev
  if (isDev) {
    const runtimeErrorOverlay = (await import("@replit/vite-plugin-runtime-error-modal")).default;
    plugins.push(runtimeErrorOverlay());

    if (process.env.REPL_ID !== undefined) {
      const { cartographer } = await import("@replit/vite-plugin-cartographer");
      const { devBanner } = await import("@replit/vite-plugin-dev-banner");
      plugins.push(cartographer(), devBanner());
    }
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: false,
      allowedHosts: true,
      hmr: {
        clientPort: 443,
        protocol: "wss",
      },
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
