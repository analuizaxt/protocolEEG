import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  // Relative assets support both / and /repository/ on GitHub Pages.
  base: "./",
  build: {
    assetsInlineLimit: Infinity,
    rollupOptions: { input: fileURLToPath(new URL("./src/index.html", import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "development-entry",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const [pathname, query] = (req.url ?? "/").split("?");
          if (pathname === "/" || pathname === "/index.html") {
            req.url = `/src/index.html${query ? `?${query}` : ""}`;
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
