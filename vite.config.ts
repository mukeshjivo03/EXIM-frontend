import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import pkg from "./package.json"

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-radix": ["radix-ui"],
          "vendor-charts": ["recharts"],
          "vendor-three": ["three"],
          "vendor-motion": ["framer-motion"],
          "vendor-excel": ["xlsx", "xlsx-js-style"],
          "vendor-utils": [
            "axios",
            "date-fns",
            "clsx",
            "tailwind-merge",
            "class-variance-authority",
            "lucide-react",
            "zod",
            "sonner",
            "react-day-picker",
          ],
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5003,
  },
})