import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.endsWith("/locations.json")) return "locations";
          if (id.includes("node_modules/react")) return "react";
        },
      },
    },
  },
});
