import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

/**
 * BASE_PATH lets the same build work on a root domain and on a GitHub Pages
 * project site, which is served from /<repo>/. The deploy workflow sets it
 * from the repository name, so a fork needs no edits here.
 */
const base = process.env.BASE_PATH || "/";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base,
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
