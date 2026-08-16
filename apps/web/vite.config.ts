import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

// Public workspace build configuration. The release-shaped custom server entry
// (apps/web/server.ts) and its SSR build input are added by a later task; this
// file only wires the official React Router Framework Mode Vite plugin.
export default defineConfig({
  plugins: [reactRouter()],
});
