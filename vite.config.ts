import { defineConfig } from "vite"

export default defineConfig({
  base: process.env.GITHUB_PAGES === "1" ? "/sky-lab/" : "/",
  build: {
    rollupOptions: {
      input: ["index.html", "demo3d.html"]
    }
  }
})
