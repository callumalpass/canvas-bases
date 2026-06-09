#!/usr/bin/env node

import { createRequire } from "node:module";
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("/home/calluma/projects/tasknotes/node_modules/@playwright/test");

const CANVAS_BASES_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const TASKNOTES_ROOT = "/home/calluma/projects/tasknotes";
const UNPACKED_DIR = path.join(TASKNOTES_ROOT, ".obsidian-unpacked");
const OBSIDIAN_BINARY =
	process.env.CANVAS_BASES_DEMO_OBSIDIAN_BINARY ??
	path.join(TASKNOTES_ROOT, ".obsidian-unpacked", "obsidian");
const UPDATED_OBSIDIAN_ASAR = "/home/calluma/.config/obsidian/obsidian-1.13.0.asar";
const VAULT_DIR = path.join(TASKNOTES_ROOT, "tasknotes-e2e-vault");
const USER_DATA_DIR = path.join(TASKNOTES_ROOT, ".obsidian-config-canvas-bases-demo");
const OUTPUT_DIR =
	process.env.CANVAS_BASES_DEMO_OUTPUT_DIR ??
	path.join(CANVAS_BASES_ROOT, "media", "canvas-bases-demo");
const FRAME_DIR = path.join(OUTPUT_DIR, "frames");
const GIF_PATH = path.join(OUTPUT_DIR, "canvas-bases-active-groups-demo.gif");
const MP4_PATH = path.join(OUTPUT_DIR, "canvas-bases-active-groups-demo.mp4");
const PALETTE_PATH = path.join(OUTPUT_DIR, "palette.png");
const REMOTE_DEBUGGING_PORT = 9327;
const VIEWPORT = { width: 1440, height: 940 };
const RECORD_FPS = Number(process.env.CANVAS_BASES_DEMO_FPS ?? 18);
const WRITE_GIF = process.env.CANVAS_BASES_DEMO_SKIP_GIF !== "1";
const LEGACY_HOLD_FPS = 6;

const BASE_PATH = "TaskNotes/Views/canvas-bases-demo-active-groups.base";
const CANVAS_PATH = "Canvas Bases/Canvas Bases demo.canvas";
const DEMO_TASKS = [
	{
		title: "Plan onboarding",
		path: "Tasks/Plan onboarding.md",
		stage: "Backlog",
		priority: "High",
		y: 110,
	},
	{
		title: "Draft release notes",
		path: "Tasks/Draft release notes.md",
		stage: "Backlog",
		priority: "Normal",
		y: 470,
	},
	{
		title: "Book design review",
		path: "Book design review.md",
		stage: "Backlog",
		priority: "Normal",
		y: 660,
	},
	{
		title: "Clean up board notes",
		path: "Clean up board notes.md",
		stage: "Backlog",
		priority: "Low",
		y: 820,
	},
	{
		title: "Review launch checklist",
		path: "Review launch checklist.md",
		stage: "Backlog",
		priority: "High",
		y: 980,
	},
	{
		title: "Draft partner update",
		path: "Draft partner update.md",
		stage: "Backlog",
		priority: "Normal",
		y: 1140,
	},
];
const DEMO_TASK_TITLES = DEMO_TASKS.map((task) => task.title);
const STALE_DEMO_TASK_PATHS = [
	"Tasks/Review sample board.md",
	"Tasks/Publish changelog.md",
];

let frameIndex = 0;
let activeRecorder = null;

async function main() {
	if (!fs.existsSync(OBSIDIAN_BINARY)) {
		throw new Error(`Missing Obsidian test binary: ${OBSIDIAN_BINARY}`);
	}

	resetOutput();
	writeDemoFiles();

	const obsidian = await launchObsidian();
	const { browser, page, process: obsidianProcess } = obsidian;

	try {
		await page.setViewportSize(VIEWPORT);
		await sizeElectronWindow(page);
		await waitForWorkspace(page);
		await enablePluginsIfPrompted(page);
		await focusMainWindow(page);
		await setDemoSettings(page);
		await openCanvasBasesInNewLeaf(page);
		await waitForCanvasBases(page);
		await focusMainWindow(page);
		await injectRecordingCursor(page);

		activeRecorder = createFrameRecorder(page);
		await activeRecorder.start();
		await capture(page, 12);

		await createCustomActiveZone(page, "Doing", "Doing", { x: 470, y: 92 });
		await capture(page, 8);
		await createCustomActiveZone(page, "Done", "Done", { x: 560, y: 390 });
		await capture(page, 8);
		await dragCardIntoGroup(page, "Plan onboarding", "Doing", "Doing");
		await capture(page, 12);
		await dragCardIntoGroup(page, "Draft release notes", "Done", "Done");
		await capture(page, 10);
		await arrangeCardsForLinkDemo(page);
		await capture(page, 6);
		await performLinkDemo(page);
		await capture(page, 10);
		await updateAndOpenLinkedCanvas(page);
		await capture(page, 16);

		await activeRecorder.stop();
		activeRecorder = null;

		encodeOutputs();
		console.log(JSON.stringify({ gif: GIF_PATH, mp4: MP4_PATH, frames: FRAME_DIR }, null, 2));
	} finally {
		if (activeRecorder) {
			await activeRecorder.stop().catch(() => {});
			activeRecorder = null;
		}
		await browser.close().catch(() => {});
		obsidianProcess.kill("SIGTERM");
	}
}

function resetOutput() {
	frameIndex = 0;
	fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
	fs.mkdirSync(FRAME_DIR, { recursive: true });
}

function writeDemoFiles() {
	writeObsidianJson(".obsidian/community-plugins.json", ["tasknotes", "canvas-bases"]);
	writeObsidianJson(".obsidian/core-plugins.json", [
		"file-explorer",
		"global-search",
		"switcher",
		"graph",
		"backlink",
		"canvas",
		"outgoing-link",
		"tag-pane",
		"page-preview",
		"daily-notes",
		"templates",
		"note-composer",
		"command-palette",
		"editor-status",
		"bookmarks",
		"markdown-importer",
		"zk-prefixer",
		"random-note",
		"outline",
		"word-count",
		"slides",
		"audio-recorder",
		"workspaces",
		"file-recovery",
		"publish",
		"sync",
		"properties",
		"bases",
	]);

	fs.rmSync(path.join(VAULT_DIR, CANVAS_PATH), { force: true });
	for (const taskPath of [...DEMO_TASKS.map((task) => task.path), ...STALE_DEMO_TASK_PATHS]) {
		fs.rmSync(path.join(VAULT_DIR, taskPath), { force: true });
	}

	const nodePositionsYaml = DEMO_TASKS.map(
		(task) => `      ${getFileNodeId(task.path)}:
        x: 78
        y: ${task.y}
        width: 324
        height: 144
`
	).join("");

	writeVaultFile(
		BASE_PATH,
		`filters:
  and:
    - file.hasTag("canvas-bases-active-demo")
views:
  - type: canvas-bases
    name: "Canvas Bases"
    order:
      - stage
      - status
      - blockedBy
      - priority
      - due
      - file.name
    sort:
      - column: file.name
        direction: ASC
    canvasBasesLayout: grid
    canvasBasesNodeWidth: 324
    canvasBasesNodeHeight: 144
    canvasBasesShowBodyEditor: false
    canvasBasesTaskNotesMode: auto
    canvasBasesTaskNotesShowBadges: true
    canvasBasesTaskNotesShowActions: true
    canvasBasesTaskNotesRelationships: dependencies
    canvasBasesLinkedCanvasPath: "${CANVAS_PATH}"
    canvasBasesPreservePositions: true
    canvasBasesRemoveMissingNodes: true
    canvasBasesNodePositions:
${nodePositionsYaml}`
	);

	for (const task of DEMO_TASKS) {
		writeVaultFile(
			task.path,
			`---
tags:
  - task
  - canvas-bases-active-demo
status: open
stage: ${task.stage}
priority: ${task.priority.toLowerCase()}
due: 2026-06-09
scheduled: 2026-06-09
dateCreated: 2026-06-09T09:00:00.000+10:00
dateModified: 2026-06-09T09:00:00.000+10:00
---

# ${task.title}

This demo note is used by the Canvas Bases recording.
`
		);
	}
}

function writeVaultFile(relativePath, content) {
	const fullPath = path.join(VAULT_DIR, relativePath);
	fs.mkdirSync(path.dirname(fullPath), { recursive: true });
	fs.writeFileSync(fullPath, content);
}

function writeObsidianJson(relativePath, value) {
	writeVaultFile(relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function hashString(value) {
	let hash = 0x811c9dc5;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193);
	}
	return (hash >>> 0).toString(36);
}

function getFileNodeId(filePath) {
	return `canvas-bases-file-${hashString(filePath)}`;
}

async function launchObsidian() {
	fs.rmSync(path.join(VAULT_DIR, ".obsidian", "workspace.json"), { force: true });
	fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
	fs.mkdirSync(USER_DATA_DIR, { recursive: true });
	if (fs.existsSync(UPDATED_OBSIDIAN_ASAR)) {
		fs.copyFileSync(
			UPDATED_OBSIDIAN_ASAR,
			path.join(USER_DATA_DIR, path.basename(UPDATED_OBSIDIAN_ASAR))
		);
	}
	fs.writeFileSync(
		path.join(USER_DATA_DIR, "obsidian.json"),
		JSON.stringify({
			vaults: {
				"tasknotes-e2e": {
					path: VAULT_DIR,
					ts: Date.now(),
					open: true,
				},
			},
		})
	);

	const args = [
		"--no-sandbox",
		`--remote-debugging-port=${REMOTE_DEBUGGING_PORT}`,
		`--user-data-dir=${USER_DATA_DIR}`,
		VAULT_DIR,
	];
	const launchWithoutDisplay = !process.env.DISPLAY;
	const command = launchWithoutDisplay ? "xvfb-run" : OBSIDIAN_BINARY;
	const commandArgs = launchWithoutDisplay ? ["-a", OBSIDIAN_BINARY, ...args] : args;
	const obsidianProcess = spawn(command, commandArgs, {
		cwd: fs.existsSync(UNPACKED_DIR) ? UNPACKED_DIR : CANVAS_BASES_ROOT,
		stdio: ["ignore", "pipe", "pipe"],
		env: {
			...process.env,
			OBSIDIAN_CONFIG_DIR: USER_DATA_DIR,
		},
	});

	const cdpUrl = await waitForCdpUrl(obsidianProcess);
	const browser = await chromium.connectOverCDP(cdpUrl);
	const page = await firstPage(browser);
	page.on("console", (message) => {
		console.log(`[browser:${message.type()}] ${message.text()}`);
	});
	page.on("pageerror", (error) => {
		console.log(`[browser:pageerror] ${error.stack ?? error.message}`);
	});
	await page.waitForLoadState("domcontentloaded");
	await page.waitForTimeout(3200);

	return { browser, page, process: obsidianProcess };
}

function waitForCdpUrl(obsidianProcess) {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => reject(new Error("Timed out waiting for DevTools")), 60000);
		const finish = (url) => {
			clearTimeout(timeout);
			obsidianProcess.stdout.off("data", onData);
			obsidianProcess.stderr.off("data", onData);
			resolve(url);
		};
		const onData = (data) => {
			const match = data.toString().match(/DevTools listening on (ws:\/\/[^\s]+)/);
			if (match) finish(match[1]);
		};
		obsidianProcess.stdout.on("data", onData);
		obsidianProcess.stderr.on("data", onData);
		const poll = setInterval(() => {
			http
				.get(`http://127.0.0.1:${REMOTE_DEBUGGING_PORT}/json/version`, (res) => {
					let body = "";
					res.on("data", (chunk) => {
						body += chunk;
					});
					res.on("end", () => {
						try {
							const url = JSON.parse(body).webSocketDebuggerUrl;
							if (url) {
								clearInterval(poll);
								finish(url);
							}
						} catch {
							// Keep polling.
						}
					});
				})
				.on("error", () => {});
		}, 500);
		timeout.unref();
	});
}

async function firstPage(browser) {
	const context = browser.contexts()[0] ?? (await browser.newContext());
	return context.pages()[0] ?? (await context.waitForEvent("page"));
}

async function waitForWorkspace(page) {
	await enablePluginsIfPrompted(page);
	await page.waitForSelector(".workspace", { timeout: 30000 });
	await page.waitForTimeout(2500);
}

async function enablePluginsIfPrompted(page) {
	for (const text of [
		"Trust author and enable plugins",
		"Trust",
		"Turn on community plugins",
		"Enable community plugins",
	]) {
		const button = page.locator(`button:has-text("${text}")`).first();
		if (await button.isVisible({ timeout: 1200 }).catch(() => false)) {
			await button.click();
			await page.waitForTimeout(1200);
		}
	}
}

async function setDemoSettings(page) {
	await page.evaluate(async () => {
		const app = window.app;
		if (!app.internalPlugins?.getEnabledPluginById?.("bases")) {
			await app.internalPlugins?.enablePlugin?.("bases");
		}
		if (app.plugins.manifests.tasknotes && !app.plugins.plugins.tasknotes) {
			await app.plugins.enablePlugin("tasknotes");
		}
		if (!app.plugins.plugins["canvas-bases"]) {
			try {
				await app.plugins.enablePlugin("canvas-bases");
				const loaded = await app.plugins.loadPlugin("canvas-bases");
				console.log(`loadPlugin(canvas-bases) -> ${loaded}`);
			} catch (error) {
				console.error("enablePlugin(canvas-bases) failed", error);
			}
		}
		for (let attempt = 0; attempt < 20 && !app.plugins.plugins["canvas-bases"]; attempt += 1) {
			await new Promise((resolve) => window.setTimeout(resolve, 250));
		}
		const canvasBases = app.plugins.plugins["canvas-bases"];
		if (!canvasBases) {
			throw new Error(
				`Canvas Bases plugin not loaded. methods=${JSON.stringify(Object.getOwnPropertyNames(Object.getPrototypeOf(app.plugins)))} enabled=${JSON.stringify([...app.plugins.enabledPlugins])} manifests=${JSON.stringify(Object.keys(app.plugins.manifests ?? {}))}`
			);
		}

		const tasknotes = app.plugins.plugins.tasknotes;
		if (tasknotes) {
			tasknotes.settings.enableNaturalLanguageInput = true;
			tasknotes.settings.useDefaultsOnInstantConvert = true;
			tasknotes.settings.defaultTaskPriority = "normal";
			tasknotes.settings.inlineTaskConvertFolder = "{{currentNotePath}}";
			await tasknotes.saveSettings?.();
		}

		canvasBases.settings.defaultTaskNotesMode = "auto";
		canvasBases.settings.defaultTaskNotesShowBadges = true;
		canvasBases.settings.defaultTaskNotesShowActions = true;
		canvasBases.settings.nodeWidth = 324;
		canvasBases.settings.nodeHeight = 144;
		await canvasBases.saveData?.(canvasBases.settings);
	});
}

async function focusMainWindow(page) {
	await page
		.evaluate(() => {
			window.activeWindow = window;
			window.activeDocument = document;
			const electron = window.require?.("electron");
			const currentWindow = electron?.remote?.getCurrentWindow?.();
			currentWindow?.focus?.();
		})
		.catch(() => {});
	await page.waitForTimeout(250);
}

async function openFileByPath(page, relativePath) {
	const opened = await page.evaluate(async (targetPath) => {
		const app = window.app;
		const file = app.vault.getAbstractFileByPath(targetPath);
		if (!file) return false;
		const leaf = app.workspace.getLeaf(true);
		await leaf.openFile(file, { state: { mode: "source" } });
		return true;
	}, relativePath);
	if (!opened) throw new Error(`Could not open ${relativePath}`);
	await page.waitForTimeout(1400);
}

async function runCommand(page, command) {
	await page.keyboard.press("Escape");
	await page.waitForTimeout(250);
	const workspace = page.locator(".workspace").first();
	if (await workspace.isVisible({ timeout: 1000 }).catch(() => false)) {
		await workspace.click({ position: { x: 160, y: 120 } }).catch(() => {});
		await page.waitForTimeout(150);
	}
	await page.keyboard.press("Control+p");
	await page.waitForSelector(".prompt", { timeout: 5000 });
	const prompt = page.locator(".prompt-input").first();
	await prompt.fill(command);
	await page.waitForTimeout(700);
	const suggestion = page.locator(".suggestion-item").first();
	await suggestion.waitFor({ state: "visible", timeout: 5000 });
	await page.keyboard.press("Enter");
	await page.waitForTimeout(500);
}

async function executeCommand(page, commandId) {
	const executed = await page.evaluate(async (id) => {
		const command = window.app.commands.commands[id];
		if (!command) return false;
		await window.app.commands.executeCommandById(id);
		return true;
	}, commandId);
	if (!executed) throw new Error(`Command not found: ${commandId}`);
}

async function switchToReadingView(page) {
	await page.evaluate(async () => {
		const app = window.app;
		const leaf = app.workspace.getMostRecentLeaf();
		await leaf.setViewState({
			type: "markdown",
			state: { file: "2026-06-08.md", mode: "preview" },
		});
	});
	await page.waitForTimeout(2600);
}

async function waitForCanvasBases(page) {
	await page.waitForFunction(
		() =>
			Array.from(document.querySelectorAll(".canvas-bases-canvas-file")).some((element) => {
				const rect = element.getBoundingClientRect();
				return rect.width > 20 && rect.height > 20;
			}),
		undefined,
		{ timeout: 20000 }
	);
	await page.waitForTimeout(1600);
}

async function sizeElectronWindow(page) {
	await page
		.evaluate(({ width, height }) => {
			const electron = window.require?.("electron");
			const currentWindow = electron?.remote?.getCurrentWindow?.();
			currentWindow?.setSize?.(width, height);
			currentWindow?.center?.();
		}, VIEWPORT)
		.catch(() => {});
	await page.waitForTimeout(500);
}

async function openCanvasBasesInNewLeaf(page) {
	const opened = await page.evaluate(async (basePath) => {
		const app = window.app;
		const file = app.vault.getAbstractFileByPath(basePath);
		if (!file) return false;
		const leaf = app.workspace.getLeaf(true);
		await leaf.openFile(file);
		return true;
	}, BASE_PATH);
	if (!opened) throw new Error("Could not open Canvas Bases base");
	await page.waitForTimeout(2600);
}

async function createCustomActiveZone(page, groupLabel, groupValue, position) {
	await focusMainWindow(page);
	await clickToolbarButton(page, "Add zone");
	if (!(await page.locator(".canvas-bases-modal").isVisible({ timeout: 1500 }).catch(() => false))) {
		const opened = await page.evaluate(() => {
			window.activeWindow = window;
			window.activeDocument = document;
			const plugin = window.app.plugins.plugins["canvas-bases"];
			const view = plugin?.activeView ?? plugin?.views?.values?.().next?.().value;
			if (!view?.openCreateCustomZoneModal) return false;
			view.openCreateCustomZoneModal();
			return true;
		});
		if (!opened) throw new Error("Could not open custom zone modal");
	}
	await page.waitForSelector(".canvas-bases-modal", { timeout: 5000 });
	await capture(page, 4);

	const modal = page.locator(".canvas-bases-modal").last();
	const inputs = modal.locator('input[type="text"]');
	const labelInput = inputs.nth(0);
	const propertyInput = inputs.nth(1);
	const valueInput = inputs.nth(2);

	await clickLocator(page, labelInput);
	await labelInput.fill(groupLabel);
	await page.waitForTimeout(250);
	await capture(page, 2);
	await clickLocator(page, propertyInput);
	await propertyInput.fill("note.stage");
	await page.waitForTimeout(250);
	await capture(page, 2);

	await clickLocator(page, valueInput);
	await valueInput.fill(groupValue);
	await page.waitForTimeout(250);
	await capture(page, 2);

	await clickLocator(page, modal.locator("button.mod-cta").first());
	await page.waitForSelector(".canvas-bases-modal", { state: "detached", timeout: 5000 });
	await page.waitForTimeout(700);
	await positionCustomZone(page, groupLabel, position);

	const group = page
		.locator(".workspace-leaf.mod-active .canvas-bases-canvas-group")
		.filter({ hasText: groupLabel })
		.first();
	await group.locator(".canvas-bases-canvas-group__active-badge").waitFor({
		state: "visible",
		timeout: 5000,
	});
	await capture(page, 6);
}

async function positionCustomZone(page, groupLabel, position) {
	const positioned = await page.evaluate(
		({ label, nextPosition }) => {
			const plugin = window.app?.plugins?.plugins?.["canvas-bases"];
			const view = plugin?.activeView ?? plugin?.views?.values?.().next?.().value;
			const config = view?.config;
			if (!config) return false;

			const zones = Array.isArray(config.get("canvasBasesZones"))
				? config.get("canvasBasesZones")
				: [];
			const zone = [...zones]
				.reverse()
				.find((candidate) => candidate?.origin === "custom" && candidate?.label === label);
			if (!zone?.id) return false;

			const hashString = (value) => {
				let hash = 0x811c9dc5;
				for (let index = 0; index < value.length; index += 1) {
					hash ^= value.charCodeAt(index);
					hash = Math.imul(hash, 0x01000193);
				}
				return (hash >>> 0).toString(36);
			};
			const nodeId = `canvas-bases-manual-group-${hashString(zone.id)}`;
			const positions = view.getNodePositions?.() ?? config.get("canvasBasesNodePositions") ?? {};
			positions[nodeId] = {
				x: nextPosition.x,
				y: nextPosition.y,
				width: 360,
				height: 220,
			};
			if (view.setNodePositions) {
				view.setNodePositions(positions);
			} else {
				config.set("canvasBasesNodePositions", positions);
			}
			view.scheduleRender?.();
			return true;
		},
		{ label: groupLabel, nextPosition: position }
	);
	if (!positioned) throw new Error(`Could not position custom zone: ${groupLabel}`);
	await page.waitForTimeout(800);
}

async function moveGroupNextToCard(page, groupLabel, anchorCardTitle, yOffset) {
	const anchorCard = page
		.locator(".workspace-leaf.mod-active .canvas-bases-canvas-file")
		.filter({ hasText: anchorCardTitle })
		.first();
	await anchorCard.waitFor({ state: "visible", timeout: 10000 });
	const anchorBox = await anchorCard.boundingBox();
	if (!anchorBox) throw new Error(`Could not locate anchor card: ${anchorCardTitle}`);
	await moveGroupByLabel(page, groupLabel, {
		x: anchorBox.x + anchorBox.width + 54,
		y: anchorBox.y + yOffset,
	});
}

async function moveGroupByLabel(page, label, targetTopLeft) {
	const group = page
		.locator(".workspace-leaf.mod-active .canvas-bases-canvas-group")
		.filter({ hasText: label })
		.first();
	await group.waitFor({ state: "visible", timeout: 10000 });
	const box = await group.boundingBox();
	if (!box) throw new Error(`Could not locate group: ${label}`);

	const start = {
		x: box.x + Math.min(84, box.width / 2),
		y: box.y + 16,
	};
	const end = {
		x: start.x + (targetTopLeft.x - box.x),
		y: start.y + (targetTopLeft.y - box.y),
	};

	await moveMouse(page, start.x, start.y);
	await page.mouse.down();
	await moveMouse(page, end.x, end.y, { steps: 18 });
	await page.mouse.up();
	await page.waitForTimeout(500);
}

async function dragCardIntoGroup(page, title, groupLabel, expectedStage) {
	const card = page
		.locator(".workspace-leaf.mod-active .canvas-bases-canvas-file")
		.filter({ hasText: title })
		.first();
	const group = page
		.locator(".workspace-leaf.mod-active .canvas-bases-canvas-group")
		.filter({ hasText: groupLabel })
		.first();
	await card.waitFor({ state: "visible", timeout: 10000 });
	await group.waitFor({ state: "visible", timeout: 10000 });

	const cardBox = await card.boundingBox();
	const groupBox = await group.boundingBox();
	if (!cardBox || !groupBox) throw new Error(`Could not locate ${title} or ${groupLabel}`);

	const start = { x: cardBox.x + cardBox.width / 2, y: cardBox.y + 22 };
	const midpoint = {
		x: (start.x + groupBox.x + groupBox.width * 0.32) / 2,
		y: (start.y + groupBox.y + groupBox.height * 0.52) / 2,
	};
	const end = {
		x: groupBox.x + groupBox.width * 0.34,
		y: groupBox.y + groupBox.height * 0.56,
	};

	await moveMouse(page, start.x, start.y);
	await page.mouse.down();
	await moveMouse(page, midpoint.x, midpoint.y, { steps: 16 });
	await capture(page, 2);
	await moveMouse(page, end.x, end.y, { steps: 18 });
	await capture(page, 3);
	await page.mouse.up();
	await waitForCardStage(page, title, expectedStage);
	await capture(page, 8);
}

async function waitForCardStage(page, title, expectedStage) {
	await page.waitForFunction(
		({ cardTitle, stage }) => {
			const cards = Array.from(
				document.querySelectorAll(".workspace-leaf.mod-active .canvas-bases-canvas-file")
			);
			const card = cards.find((element) => element.textContent?.includes(cardTitle));
			return Boolean(
				card &&
					card.textContent?.includes("stage") &&
					card.textContent?.includes(stage)
			);
		},
		{ cardTitle: title, stage: expectedStage },
		{ timeout: 10000 }
	);
}

async function dragFirstCards(page, limit = 3) {
	const boxes = await page.evaluate(() =>
		Array.from(document.querySelectorAll(".canvas-bases-canvas-file"))
			.map((element) => {
				const rect = element.getBoundingClientRect();
				return {
					x: rect.x,
					y: rect.y,
					width: rect.width,
					height: rect.height,
				};
			})
			.filter(
				(rect) =>
					rect.width > 50 &&
					rect.height > 50 &&
					rect.x >= 0 &&
					rect.y >= 0 &&
					rect.x < window.innerWidth &&
					rect.y < window.innerHeight
			)
	);
	for (let i = 0; i < Math.min(limit, boxes.length); i += 1) {
		const box = boxes[i];
		if (!box) continue;
		await moveMouse(page, box.x + box.width / 2, box.y + 22);
		await page.mouse.down();
		await moveMouse(page, box.x + box.width / 2 + 34 + i * 18, box.y + 78 + i * 24, {
			steps: 10,
		});
		await page.waitForTimeout(100);
		await capture(page, 1);
		await moveMouse(page, box.x + box.width / 2 + 110 + i * 30, box.y + 92 + i * 36, {
			steps: 12,
		});
		await page.mouse.up();
		await page.waitForTimeout(350);
		await capture(page, 2);
	}
}

async function convertTaskLine(page, line) {
	const positioned = await page.evaluate((targetLine) => {
		const app = window.app;
		const leaf = app.workspace.getMostRecentLeaf();
		const view = leaf?.view;
		const editor = view?.editor;
		if (!editor?.setCursor) return false;
		editor.focus?.();
		editor.setCursor({ line: targetLine, ch: 0 });
		return true;
	}, line);
	if (!positioned) throw new Error(`Could not position editor cursor on line ${line}`);
	await executeCommand(page, "tasknotes:convert-to-tasknote");
}

async function waitForDemoTaskFiles(page) {
	await page.waitForFunction(
		(titles) => {
			const app = window.app;
			return titles.every((title) => app.vault.getAbstractFileByPath(`${title}.md`));
		},
		DEMO_TASK_TITLES,
		{ timeout: 15000 }
	);
	await page.waitForTimeout(700);
}

async function performLinkDemo(page) {
	const sourceTitle = "Review launch checklist";
	const targetTitle = "Draft release notes";
	const sourceCard = page
		.locator(".workspace-leaf.mod-active .canvas-bases-canvas-file")
		.filter({ hasText: sourceTitle })
		.first();
	const targetCard = page
		.locator(".workspace-leaf.mod-active .canvas-bases-canvas-file")
		.filter({ hasText: targetTitle })
		.first();
	await sourceCard.waitFor({ state: "attached", timeout: 10000 });
	await targetCard.waitFor({ state: "attached", timeout: 10000 });

	const handleBox = await sourceCard.locator(".canvas-bases-canvas-link-handle").first().boundingBox();
	const targetBox = await targetCard.boundingBox();
	if (!handleBox || !targetBox) throw new Error("Could not locate link demo cards");

	const start = {
		x: handleBox.x + handleBox.width / 2,
		y: handleBox.y + handleBox.height / 2,
	};
	const end = {
		x: targetBox.x + targetBox.width / 2,
		y: targetBox.y + targetBox.height / 2,
	};

	await moveMouse(page, start.x, start.y);
	await page.mouse.down();
	await moveMouse(page, (start.x + end.x) / 2, (start.y + end.y) / 2, { steps: 10 });
	await capture(page, 2);
	await moveMouse(page, end.x, end.y, { steps: 14 });
	await capture(page, 2);
	await page.mouse.up();
	await page.waitForTimeout(500);
	await capture(page, 4);

	const menuItem = page
		.locator(".menu-item")
		.filter({ hasText: sourceTitle })
		.filter({ hasText: targetTitle })
		.filter({ hasText: "blocks" })
		.first();
	if (!(await menuItem.isVisible({ timeout: 5000 }).catch(() => false))) {
		const menuTexts = await page.locator(".menu-item").allTextContents();
		throw new Error(`Could not find dependency menu item. Items: ${JSON.stringify(menuTexts)}`);
	}
	await clickLocator(page, menuItem);
	await page.waitForTimeout(1800);
	await waitForRelationshipEdge(page);
	await waitForCardAnyText(page, targetTitle, [
		"blockedBy",
		"blocked by",
		"blocked",
		"Review launch checklist",
	]);
	await capture(page, 6);
}

async function arrangeCardsForLinkDemo(page) {
	await positionFileCards(page, [
		{ path: "Review launch checklist.md", x: 8, y: 360 },
		{ path: "Tasks/Draft release notes.md", x: 590, y: 500 },
	]);
	await page.waitForTimeout(900);
}

async function positionFileCards(page, cards) {
	const positioned = await page.evaluate((updates) => {
		const plugin = window.app?.plugins?.plugins?.["canvas-bases"];
		const view = plugin?.activeView ?? plugin?.views?.values?.().next?.().value;
		const config = view?.config;
		if (!config) return false;

		const hashString = (value) => {
			let hash = 0x811c9dc5;
			for (let index = 0; index < value.length; index += 1) {
				hash ^= value.charCodeAt(index);
				hash = Math.imul(hash, 0x01000193);
			}
			return (hash >>> 0).toString(36);
		};
		const positions = view.getNodePositions?.() ?? config.get("canvasBasesNodePositions") ?? {};
		for (const update of updates) {
			positions[`canvas-bases-file-${hashString(update.path)}`] = {
				x: update.x,
				y: update.y,
				width: 324,
				height: 144,
			};
		}
		if (view.setNodePositions) {
			view.setNodePositions(positions);
		} else {
			config.set("canvasBasesNodePositions", positions);
		}
		view.scheduleRender?.();
		return true;
	}, cards);
	if (!positioned) throw new Error("Could not position link demo cards");
}

async function dragBlockedTaskRight(page) {
	await moveCardByTitle(page, "Draft partner update", { x: 850, y: 340 });
	await page.waitForTimeout(500);
}

async function moveCardByTitle(page, title, targetTopLeft) {
	const card = page
		.locator(".workspace-leaf.mod-active .canvas-bases-canvas-file")
		.filter({ hasText: title })
		.first();
	await card.waitFor({ state: "attached", timeout: 10000 });
	const box = await card.boundingBox();
	if (!box) throw new Error(`Could not locate card: ${title}`);

	const start = {
		x: box.x + box.width / 2,
		y: box.y + 22,
	};
	const end = {
		x: start.x + (targetTopLeft.x - box.x),
		y: start.y + (targetTopLeft.y - box.y),
	};

	await moveMouse(page, start.x, start.y);
	await page.mouse.down();
	await moveMouse(page, end.x, end.y, { steps: 18 });
	await page.mouse.up();
	await page.waitForTimeout(400);
}

async function waitForRelationshipEdge(page) {
	await page.waitForFunction(
		() =>
			Array.from(document.querySelectorAll(".canvas-bases-canvas-edge__path")).some(
				(element) => element.getBoundingClientRect().width > 0 || element.getAttribute("d")
			),
		undefined,
		{ timeout: 10000 }
	);
}

async function waitForCardAnyText(page, title, fragments) {
	await page.waitForFunction(
		({ cardTitle, textFragments }) => {
			const cards = Array.from(
				document.querySelectorAll(".workspace-leaf.mod-active .canvas-bases-canvas-file")
			);
			const card = cards.find((element) => element.textContent?.includes(cardTitle));
			if (!card) return false;
			const text = card.textContent?.toLowerCase() ?? "";
			return textFragments.some((fragment) => text.includes(fragment.toLowerCase()));
		},
		{ cardTitle: title, textFragments: fragments },
		{ timeout: 10000 }
	);
}

async function capture(page, holdFrames = 1) {
	if (activeRecorder) {
		await activeRecorder.hold((holdFrames / LEGACY_HOLD_FPS) * 1000);
		return;
	}

	const buffer = await captureElectronScreenshot(page);
	for (let i = 0; i < holdFrames; i += 1) {
		writeFrame(buffer);
	}
}

function createFrameRecorder(page) {
	let running = false;
	let loopPromise = null;
	let error = null;
	const intervalMs = 1000 / RECORD_FPS;

	async function loop() {
		while (running) {
			const startedAt = Date.now();
			try {
				writeFrame(await captureElectronScreenshot(page));
			} catch (captureError) {
				error = captureError;
				running = false;
				break;
			}

			const elapsed = Date.now() - startedAt;
			await delay(Math.max(0, intervalMs - elapsed));
		}
	}

	return {
		async start() {
			if (running) return;
			running = true;
			loopPromise = loop();
		},
		async stop() {
			running = false;
			if (loopPromise) {
				await loopPromise;
				loopPromise = null;
			}
			if (error) throw error;
		},
		async hold(ms) {
			await delay(ms);
			if (error) throw error;
		},
	};
}

function writeFrame(buffer) {
	const framePath = path.join(FRAME_DIR, `frame-${String(frameIndex).padStart(4, "0")}.png`);
	fs.writeFileSync(framePath, buffer);
	frameIndex += 1;
}

function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function injectRecordingCursor(page) {
	await page.evaluate(() => {
		document.getElementById("canvas-bases-demo-cursor")?.remove();
		const cursorEl = document.createElement("div");
		cursorEl.id = "canvas-bases-demo-cursor";
		cursorEl.style.cssText = [
			"position:fixed",
			"left:0",
			"top:0",
			"width:18px",
			"height:18px",
			"border-radius:999px",
			"border:2px solid var(--interactive-accent)",
			"background:rgba(var(--mono-rgb-100),0.96)",
			"box-shadow:0 0 0 4px rgba(var(--interactive-accent-rgb),0.18),0 3px 10px rgba(0,0,0,0.22)",
			"transform:translate(-50%,-50%)",
			"z-index:2147483647",
			"pointer-events:none",
			"opacity:0",
		].join(";");
		document.body.appendChild(cursorEl);

		window.__canvasBasesDemoSetCursor = (x, y) => {
			cursorEl.style.opacity = "1";
			cursorEl.style.left = `${x}px`;
			cursorEl.style.top = `${y}px`;
		};

		document.addEventListener(
			"pointermove",
			(event) => {
				window.__canvasBasesDemoSetCursor?.(event.clientX, event.clientY);
			},
			true
		);
	});
}

async function moveMouse(page, x, y, options = {}) {
	await page.mouse.move(x, y, options);
	await page.evaluate(
		({ cursorX, cursorY }) => window.__canvasBasesDemoSetCursor?.(cursorX, cursorY),
		{ cursorX: x, cursorY: y }
	);
}

async function clickLocator(page, locator) {
	const box = await locator.boundingBox();
	if (!box) throw new Error("Could not click locator without a bounding box");
	await moveMouse(page, box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
	await page.mouse.down();
	await page.waitForTimeout(90);
	await page.mouse.up();
}

async function updateAndOpenLinkedCanvas(page) {
	await clickToolbarButton(page, "Update canvas");
	await page.waitForTimeout(1500);
	await clickToolbarButton(page, "Open canvas");
	await waitForCanvasView(page);
}

async function clickToolbarButton(page, label) {
	const button = page
		.locator(".workspace-leaf.mod-active .canvas-bases-view__button")
		.filter({ hasText: label })
		.first();
	await button.waitFor({ state: "visible", timeout: 10000 });
	const box = await button.boundingBox();
	if (!box) throw new Error(`Could not click toolbar button: ${label}`);
	await moveMouse(page, box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
	await button.click();
}

async function waitForCanvasView(page) {
	await page.waitForFunction(
		() =>
			Array.from(
				document.querySelectorAll(".canvas-wrapper, .canvas-node-container, .canvas-node")
			).some((element) => {
				const rect = element.getBoundingClientRect();
				return rect.width > 20 && rect.height > 20;
			}),
		undefined,
		{ timeout: 15000 }
	);
	await page.waitForTimeout(1800);
}

async function captureElectronScreenshot(page) {
	const data = await page.evaluate(async ({ width, height }) => {
		const electron = window.require?.("electron");
		const currentWindow = electron?.remote?.getCurrentWindow?.();
		if (!currentWindow) return null;
		const bounds = currentWindow.getBounds?.() ?? { width, height };
		const image = await currentWindow.capturePage({
			x: 0,
			y: 0,
			width: Math.min(width, bounds.width),
			height: Math.min(height, bounds.height),
		});
		return image.toPNG().toString("base64");
	}, VIEWPORT);
	if (!data) return page.screenshot({ fullPage: false });
	return Buffer.from(data, "base64");
}

function encodeOutputs() {
	const inputPattern = path.join(FRAME_DIR, "frame-%04d.png");
	if (WRITE_GIF) {
		execFileSync("ffmpeg", [
			"-y",
			"-framerate",
			String(RECORD_FPS),
			"-i",
			inputPattern,
			"-vf",
			"fps=12,scale=1280:-1:flags=lanczos,palettegen",
			PALETTE_PATH,
		]);
		execFileSync("ffmpeg", [
			"-y",
			"-framerate",
			String(RECORD_FPS),
			"-i",
			inputPattern,
			"-i",
			PALETTE_PATH,
			"-lavfi",
			"fps=12,scale=1280:-1:flags=lanczos[x];[x][1:v]paletteuse",
			GIF_PATH,
		]);
	}
	execFileSync("ffmpeg", [
		"-y",
		"-framerate",
		String(RECORD_FPS),
		"-i",
		inputPattern,
		"-vf",
		"fps=30,scale=1280:-2:flags=lanczos,format=yuv420p",
		"-r",
		"30",
		"-g",
		"30",
		"-keyint_min",
		"30",
		"-movflags",
		"+faststart",
		MP4_PATH,
	]);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
