import stylelint from "stylelint";
import selectorParser from "postcss-selector-parser";

const { createPlugin, utils } = stylelint;

const noHasRuleName = "canvas-bases/no-has";
const obsidianBrowserSupportRuleName = "canvas-bases/obsidian-browser-support";
const scopedSelectorsRuleName = "canvas-bases/scoped-selectors";
const noFixedPositionRuleName = "canvas-bases/no-fixed-position";

const noHasRule = createPlugin(noHasRuleName, (enabled) => {
	return (root, result) => {
		if (!enabled) return;

		root.walkRules((ruleNode) => {
			const selector = ruleNode.selector ?? "";
			let searchIndex = 0;

			while (searchIndex < selector.length) {
				const index = selector.indexOf(":has(", searchIndex);
				if (index === -1) break;

				utils.report({
					message:
						"Avoid :has - it can cause significant performance issues due to broad selector invalidation.",
					node: ruleNode,
					result,
					ruleName: noHasRuleName,
					index,
					endIndex: index + ":has".length,
				});

				searchIndex = index + ":has(".length;
			}
		});
	};
});

const partiallySupportedFeatures = [
	{
		feature: "css-display-contents",
		matches: (declaration) =>
			declaration.prop.toLowerCase() === "display" &&
			/\bcontents\b/iu.test(declaration.value),
	},
	{
		feature: "multicolumn",
		matches: (declaration) => {
			const property = declaration.prop.toLowerCase();
			return (
				property === "columns" ||
				property.startsWith("column-") ||
				property === "break-inside"
			);
		},
	},
	{
		feature: "text-decoration",
		matches: (declaration) => {
			const property = declaration.prop.toLowerCase();
			return (
				property === "text-decoration-line" ||
				property === "text-decoration-thickness"
			);
		},
	},
];

const obsidianBrowserSupportRule = createPlugin(
	obsidianBrowserSupportRuleName,
	(enabled) => {
		return (root, result) => {
			if (!enabled) return;

			root.walkDecls((declaration) => {
				for (const { feature, matches } of partiallySupportedFeatures) {
					if (!matches(declaration)) continue;

					utils.report({
						message: `Unexpected browser feature "${feature}" is only partially supported by Obsidian 1.11.4,144,146,148`,
						node: declaration,
						result,
						ruleName: obsidianBrowserSupportRuleName,
					});
				}
			});
		};
	}
);

const ownedSelectorPatterns = [/^canvas-bases(?:-|$)/u];
const allowedGlobalContextClasses = new Set([
	"theme-dark",
	"theme-light",
	"is-mobile",
	"modal",
	"modal-content",
	"mod-cta",
]);

function isOwnedClassOrId(name) {
	return ownedSelectorPatterns.some((pattern) => pattern.test(name));
}

function isScopedSelector(selectorNode) {
	let hasOwnedSelector = false;
	let hasClassOrId = false;
	let hasOnlyAllowedGlobals = true;

	selectorNode.walk((node) => {
		if (node.type !== "class" && node.type !== "id") return;

		hasClassOrId = true;
		if (isOwnedClassOrId(node.value)) {
			hasOwnedSelector = true;
			return;
		}

		if (!allowedGlobalContextClasses.has(node.value)) {
			hasOnlyAllowedGlobals = false;
		}
	});

	return hasOwnedSelector || (!hasClassOrId && hasOnlyAllowedGlobals);
}

const scopedSelectorsRule = createPlugin(scopedSelectorsRuleName, (enabled) => {
	return (root, result) => {
		if (!enabled) return;

		root.walkRules((ruleNode) => {
			if (ruleNode.parent?.type === "atrule" && ruleNode.parent.name === "keyframes") {
				return;
			}

			let parsedSelector;
			try {
				parsedSelector = selectorParser().astSync(ruleNode.selector);
			} catch {
				return;
			}

			parsedSelector.each((selectorNode) => {
				if (isScopedSelector(selectorNode)) return;

				utils.report({
					message:
						"Scope plugin CSS with a Canvas Bases-owned selector or an explicit allowed global context.",
					node: ruleNode,
					result,
					ruleName: scopedSelectorsRuleName,
				});
			});
		});
	};
});

const noFixedPositionRule = createPlugin(noFixedPositionRuleName, (enabled) => {
	return (root, result) => {
		if (!enabled) return;

		root.walkDecls("position", (declaration) => {
			if (declaration.value.toLowerCase() !== "fixed") return;

			utils.report({
				message:
					"Avoid fixed positioning in plugin CSS unless there is a narrowly reviewed exception.",
				node: declaration,
				result,
				ruleName: noFixedPositionRuleName,
			});
		});
	};
});

const warning = { severity: "warning" };

export default {
	plugins: [
		noHasRule,
		obsidianBrowserSupportRule,
		scopedSelectorsRule,
		noFixedPositionRule,
	],
	rules: {
		"color-hex-length": [
			"long",
			{
				...warning,
				message: "Use the full 6-digit hex format for consistency.",
			},
		],
		"declaration-block-no-duplicate-properties": [true, warning],
		"declaration-no-important": [
			true,
			{
				...warning,
				message:
					"Avoid !important - override styles by increasing selector specificity or using CSS variables instead.",
			},
		],
		"no-duplicate-selectors": [true, warning],
		"property-no-unknown": [true, warning],
		"selector-pseudo-class-no-unknown": [
			true,
			{
				...warning,
				ignorePseudoClasses: ["global"],
			},
		],
		"selector-type-no-unknown": [
			true,
			{
				...warning,
				ignoreTypes: ["pro"],
			},
		],
		[noHasRuleName]: [true, warning],
		[obsidianBrowserSupportRuleName]: [true, warning],
		[scopedSelectorsRuleName]: [true, warning],
		[noFixedPositionRuleName]: [true, warning],
	},
};
