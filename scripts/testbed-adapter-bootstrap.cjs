const { JSDOM } = require("jsdom");

const window = new JSDOM("<!doctype html><html><body></body></html>", {
	url: "https://mdbase.test/",
}).window;
for (const key of [
	"window",
	"document",
	"navigator",
	"Node",
	"Document",
	"DocumentFragment",
	"Element",
	"HTMLElement",
	"SVGElement",
	"Event",
	"UIEvent",
	"CustomEvent",
	"MutationObserver",
	"DOMParser",
	"File",
	"Blob",
	"URL",
]) {
	Object.defineProperty(globalThis, key, {
		configurable: true,
		value: key === "window" ? window : window[key],
		writable: true,
	});
}
Object.defineProperty(globalThis, "getComputedStyle", {
	configurable: true,
	value: window.getComputedStyle.bind(window),
	writable: true,
});
const { setup } = require("obsidian-test-mocks/setup");
setup();

require("../.testbed/testbed-adapter.cjs");
