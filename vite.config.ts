import { defineConfig } from "vite"

export default defineConfig({
  /** GitHub Pages でリポジトリ名付き URL で公開する場合（例: https://user.github.io/sky-lab/） */
  base: process.env.GITHUB_PAGES === "1" ? "/sky-lab/" : "/",
  build: {
    rollupOptions: {
      input: ["index.html", "demo3d.html"]
    }
  }
})
