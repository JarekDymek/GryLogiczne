import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/GryLogiczne/",
  plugins: [react()],
  test: {
    environment: "node",
  },
});
