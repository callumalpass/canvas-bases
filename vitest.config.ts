import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "jsdom",
		setupFiles: [
			"obsidian-test-mocks/vitest-setup",
			"obsidian-test-mocks/obsidian-typings/vitest-setup",
		],
	},
	resolve: {
		alias: {
			obsidian: "obsidian-test-mocks/obsidian",
		},
	},
});
