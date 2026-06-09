import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import obsidianmd from "eslint-plugin-obsidianmd";
import prettier from "eslint-config-prettier";
import globals from "globals";

const pluginReviewRules = {
	rules: {
		"require-eslint-directive-description": {
			meta: {
				type: "suggestion",
				docs: {
					description:
						"Require descriptions on ESLint directive comments, matching Obsidian plugin review output.",
				},
				messages: {
					missingDescription:
						"Unexpected undescribed directive comment. Include descriptions to explain why the comment is necessary.",
				},
				schema: [],
			},
			create(context) {
				return {
					Program() {
						const sourceCode = context.sourceCode ?? context.getSourceCode();
						const directivePattern =
							/\beslint-(?:disable|disable-next-line|disable-line|enable)\b/u;

						for (const comment of sourceCode.getAllComments()) {
							const value = comment.value.trim();

							if (!directivePattern.test(value)) {
								continue;
							}

							const descriptionIndex = value.indexOf("--");
							const hasDescription =
								descriptionIndex >= 0 &&
								value.slice(descriptionIndex + 2).trim().length > 0;

							if (!hasDescription) {
								context.report({
									loc: comment.loc,
									messageId: "missingDescription",
								});
							}
						}
					},
				};
			},
		},
		"no-network-interval": {
			meta: {
				type: "problem",
				docs: {
					description:
						"Disallow setInterval in files that perform network calls, matching Obsidian review telemetry heuristics.",
				},
				messages: {
					noSetInterval:
						"Use a self-rescheduling setTimeout instead of setInterval in files that perform network calls.",
				},
				schema: [],
			},
			create(context) {
				const sourceCode = context.sourceCode ?? context.getSourceCode();
				const hasNetworkCall = /\b(?:requestUrl|fetch|XMLHttpRequest|sendBeacon)\b/u.test(
					sourceCode.text
				);

				if (!hasNetworkCall) {
					return {};
				}

				function getCallName(callee) {
					if (callee.type === "Identifier") {
						return callee.name;
					}

					if (
						callee.type === "MemberExpression" &&
						!callee.computed &&
						callee.property.type === "Identifier"
					) {
						return callee.property.name;
					}

					return null;
				}

				return {
					CallExpression(node) {
						const callName = getCallName(node.callee);

						if (callName === "setInterval") {
							context.report({
								node: node.callee,
								messageId: "noSetInterval",
							});
						}
					},
				};
			},
		},
		"no-codemirror-theme-styles": {
			meta: {
				type: "problem",
				docs: {
					description:
						"Disallow static CodeMirror theme styles in TypeScript; use stylesheet selectors instead.",
				},
				messages: {
					noCodeMirrorThemeStyles:
						"Move CodeMirror styling out of TypeScript and into the plugin stylesheet.",
				},
				schema: [],
			},
			create(context) {
				return {
					CallExpression(node) {
						const { callee } = node;
						if (
							callee.type === "MemberExpression" &&
							!callee.computed &&
							callee.object.type === "Identifier" &&
							callee.object.name === "EditorView" &&
							callee.property.type === "Identifier" &&
							callee.property.name === "theme"
						) {
							context.report({
								node: callee,
								messageId: "noCodeMirrorThemeStyles",
							});
						}
					},
				};
			},
		},
		"no-raw-console-diagnostics": {
			meta: {
				type: "problem",
				docs: {
					description:
						"Require production diagnostics to go through a plugin logger instead of raw console calls.",
				},
				messages: {
					noRawConsoleDiagnostic:
						"Use a plugin logger for production diagnostics instead of console.{{ method }}.",
				},
				schema: [],
			},
			create(context) {
				return {
					CallExpression(node) {
						const { callee } = node;
						if (
							callee.type === "MemberExpression" &&
							!callee.computed &&
							callee.object.type === "Identifier" &&
							callee.object.name === "console" &&
							callee.property.type === "Identifier" &&
							["debug", "info", "warn", "error"].includes(callee.property.name)
						) {
							context.report({
								node: callee,
								messageId: "noRawConsoleDiagnostic",
								data: { method: callee.property.name },
							});
						}
					},
				};
			},
		},
		"no-inner-html": {
			meta: {
				type: "problem",
				docs: {
					description:
						"Disallow assigning HTML strings to innerHTML, matching Obsidian review security heuristics.",
				},
				messages: {
					noInnerHtml:
						"Use DOM creation APIs or sanitized content instead of assigning to innerHTML.",
				},
				schema: [],
			},
			create(context) {
				function isInnerHtmlMember(node) {
					return (
						node.type === "MemberExpression" &&
						!node.computed &&
						node.property.type === "Identifier" &&
						node.property.name === "innerHTML"
					);
				}

				return {
					AssignmentExpression(node) {
						if (isInnerHtmlMember(node.left)) {
							context.report({
								node: node.left,
								messageId: "noInnerHtml",
							});
						}
					},
				};
			},
		},
	},
};

const sourceFilePatterns = ["main.ts", "src/**/*.ts"];

const obsidianRecommendedConfig = obsidianmd.configs.recommended.map((config) => {
	const hasUnscopedObsidianRules =
		config.files === undefined &&
		Object.keys(config.rules ?? {}).some((ruleName) => ruleName.startsWith("obsidianmd/"));

	if (!hasUnscopedObsidianRules) {
		return config;
	}

	return {
		...config,
		files: sourceFilePatterns,
	};
});

export default [
	{
		ignores: [
			"node_modules/**",
			"main.js",
			"dist/**",
			"coverage/**",
			"docs/**",
			"e2e/**",
			"scripts/**",
			"**/*.test.ts",
			"**/*.spec.ts",
			"**/__tests__/**",
			"tests/**",
			"test/**",
			"*.config.mjs",
			"*.config.ts",
		],
	},

	js.configs.recommended,

	...obsidianRecommendedConfig,

	{
		files: sourceFilePatterns,
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: "./tsconfig.json",
				sourceType: "module",
			},
			globals: {
				...globals.browser,
				...globals.node,
				...globals.es2021,
			},
		},
		plugins: {
			"@typescript-eslint": tseslint,
			"plugin-review": pluginReviewRules,
		},
		rules: {
			...tseslint.configs.recommended.rules,

			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{ args: "none", varsIgnorePattern: "^_" },
			],
			"no-prototype-builtins": "off",
			"@typescript-eslint/no-empty-function": "off",
			"@typescript-eslint/ban-ts-comment": [
				"warn",
				{
					"ts-expect-error": "allow-with-description",
					"ts-ignore": "allow-with-description",
					"ts-nocheck": "allow-with-description",
					"ts-check": false,
					minimumDescriptionLength: 10,
				},
			],
			"@typescript-eslint/no-explicit-any": ["warn", { fixToUnknown: true }],
			"@typescript-eslint/no-inferrable-types": "warn",
			"no-constant-condition": "warn",
			"no-case-declarations": "warn",
			"no-undef": "warn",
			"no-new-func": "error",
			"plugin-review/no-inner-html": "warn",
			"plugin-review/require-eslint-directive-description": "warn",
			"plugin-review/no-network-interval": "warn",
			"plugin-review/no-codemirror-theme-styles": "warn",
			"plugin-review/no-raw-console-diagnostics": "warn",
			"obsidianmd/no-static-styles-assignment": "warn",
			"obsidianmd/rule-custom-message": "warn",
			"obsidianmd/ui/sentence-case": "warn",
			"obsidianmd/no-forbidden-elements": "warn",
			"obsidianmd/settings-tab": "off",
			"obsidianmd/platform": "off",

			"@typescript-eslint/no-unsafe-assignment": "warn",
			"@typescript-eslint/no-unsafe-member-access": "warn",
			"@typescript-eslint/no-unsafe-call": "warn",
			"@typescript-eslint/no-unsafe-argument": "warn",
			"@typescript-eslint/no-unsafe-return": "warn",
			"@typescript-eslint/no-misused-promises": "warn",
			"@typescript-eslint/no-floating-promises": "warn",
			"@typescript-eslint/no-unnecessary-type-assertion": "warn",
			"@typescript-eslint/no-deprecated": "warn",
			"@typescript-eslint/no-base-to-string": "warn",
			"@typescript-eslint/no-redundant-type-constituents": "warn",
			"@typescript-eslint/restrict-template-expressions": "warn",
			"@typescript-eslint/prefer-promise-reject-errors": "warn",
			"@typescript-eslint/no-non-null-assertion": "warn",
			"@typescript-eslint/no-require-imports": "warn",
		},
	},

	{
		files: ["*.mjs"],
		languageOptions: {
			globals: {
				...globals.node,
				...globals.es2021,
			},
		},
	},

	prettier,
];
