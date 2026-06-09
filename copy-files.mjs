#!/usr/bin/env node

import { access, constants, copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pluginId = "canvas-bases";
const defaultPaths = [
	join(homedir(), "testvault", "test", ".obsidian", "plugins", pluginId),
	join(homedir(), "testvault", "public_test", ".obsidian", "plugins", pluginId),
	join(__dirname, "..", "tasknotes", "tasknotes-e2e-vault", ".obsidian", "plugins", pluginId),
];

function expandTilde(value) {
	return value.startsWith("~/") ? join(homedir(), value.slice(2)) : value;
}

async function copyPaths() {
	if (process.env.OBSIDIAN_PLUGIN_PATH) {
		return [process.env.OBSIDIAN_PLUGIN_PATH];
	}

	try {
		const local = await readFile(".copy-files.local", "utf8");
		const paths = local
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0 && !line.startsWith("#"))
			.map(expandTilde);
		return paths.length > 0 ? paths : defaultPaths;
	} catch {
		return defaultPaths;
	}
}

async function copyToDestination(destPath) {
	const resolvedPath = resolve(destPath);
	await mkdir(resolvedPath, { recursive: true });

	for (const file of ["main.js", "styles.css", "manifest.json"]) {
		await access(file, constants.F_OK);
		await copyFile(file, join(resolvedPath, file));
	}

	console.log(`Files copied to: ${resolvedPath}`);
}

try {
	const destinations = await copyPaths();
	for (const destination of destinations) {
		await copyToDestination(destination);
	}
	console.log(`Copied plugin files to ${destinations.length} destination(s)`);
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}
