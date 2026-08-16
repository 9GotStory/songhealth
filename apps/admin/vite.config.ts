import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Admin CSR workspace build configuration. The shell source entry
// (apps/admin/src/main.tsx) is added by a later task; this file only wires
// the official React Vite plugin.
export default defineConfig({
  plugins: [react()],
});
