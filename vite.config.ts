import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import builtins from "builtin-modules";

export default defineConfig({
	plugins: [react()],
	build: {
		lib: {
			entry: "src/main.ts",
			formats: ["cjs"],
			fileName: "main",
		},
		outDir: "dist/obsidian-publisher-plugin",
		emptyOutDir: true,
		rollupOptions: {
			external: [
				"obsidian",
				"electron",
				"@codemirror/autocomplete",
				"@codemirror/collab",
				"@codemirror/commands",
				"@codemirror/language",
				"@codemirror/lint",
				"@codemirror/search",
				"@codemirror/state",
				"@codemirror/view",
				"@lezer/common",
				"@lezer/highlight",
				"@lezer/lr",
				...builtins,
			],
			output: {
				entryFileNames: "main.js",
				format: "cjs",
			},
		},
		sourcemap: "inline",
		minify: false,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
