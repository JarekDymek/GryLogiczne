import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/GryLogiczne/",
  plugins: [react()],
  test: {
    environment: "node",
  },
});
