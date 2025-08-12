/**
 * A library for creating and interacting with native webview windows.
 *
 * @module
 *
 * @example
 * ```ts
 * import { createWebView } from "@justbe/webview";
 *
 * using webview = await createWebView({
 *  title: "Example",
 *  load: { html: "<h1>Hello, World!</h1>" },
 *  devtools: true
 * });
 *
 * webview.on("started", async () => {
 *  await webview.openDevTools();
 *  await webview.eval("console.log('This is printed from eval!')");
 * });
 *
 * await webview.waitUntilClosed();
 * ```
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { EventEmitter } from "node:events";
import { spawn } from "node:child_process";
import { writeFile, access, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { platform, arch, homedir } from "node:os";
import { constants } from "node:fs";
import { Message, Response as WebViewResponse, } from './schemas.js';
const logger = {
    trace: (message, data) => {
        if (process.env.LOG_LEVEL === 'trace' || process.env.LOG_LEVEL === 'debug') {
            console.log(`[TRACE] ${message}`, data ? JSON.stringify(data) : '');
        }
    },
    warn: (message) => {
        console.warn(`[WARN] ${message}`);
    },
    error: (message, data) => {
        console.error(`[ERROR] ${message}`, data ? JSON.stringify(data) : '');
    }
};
// Decorator replacement
function instrument() {
    return function (_target, _propertyKey, descriptor) {
        return descriptor;
    };
}
import { match } from "ts-pattern";
export * from './schemas.js';
// Logging is now handled by the logger object above
// Should match the cargo package version
/** The version of the webview binary that's expected */
export const BIN_VERSION = "0.3.1";
/**
 * A helper function for extracting the result from a webview response.
 * Throws if the response includes unexpected results.
 *
 * @param result - The result of the webview request.
 * @param expectedType - The format of the expected result.
 */
function returnResult(result, expectedType) {
    if (result.$type === "result") {
        if (result.result.$type === expectedType) {
            // @ts-expect-error TS doesn't correctly narrow this type, but it's correct
            return result.result.value;
        }
        throw new Error(`unexpected result type: ${result.result.$type}`);
    }
    throw new Error(`unexpected response: ${result.$type}`);
}
/**
 * A helper function for acknowledging a webview response.
 * Throws if the response includes unexpected results.
 */
const returnAck = (result) => {
    return match(result)
        .with({ $type: "ack" }, () => undefined)
        .with({ $type: "err" }, (err) => {
        throw new Error(err.message);
    })
        .otherwise(() => {
        throw new Error(`unexpected response: ${result.$type}`);
    });
};
async function getWebViewBin(options) {
    // Check for WEBVIEW_BIN environment variable
    const binPath = process.env.WEBVIEW_BIN;
    if (binPath)
        return binPath;
    const currentPlatform = platform();
    const flags = options.devtools
        ? "-devtools"
        : options.transparent && currentPlatform === "darwin"
            ? "-transparent"
            : "";
    const cacheDir = getCacheDir();
    const fileName = `webview-${BIN_VERSION}${flags}${currentPlatform === "win32" ? ".exe" : ""}`;
    const filePath = join(cacheDir, fileName);
    // Check if the file already exists in cache
    if (await fileExists(filePath)) {
        return filePath;
    }
    // If not in cache, download it
    let url = `https://github.com/zephraph/webview/releases/download/webview-v${BIN_VERSION}/webview`;
    url += match(currentPlatform)
        .with("darwin", () => "-mac" + (arch() === "arm64" ? "-arm64" : "") + flags)
        .with("linux", () => "-linux" + flags)
        .with("win32", () => "-windows" + flags + ".exe")
        .otherwise(() => {
        // Default to linux for unknown platforms
        logger.warn(`Unknown platform: ${currentPlatform}, defaulting to linux binary`);
        return "-linux" + flags;
    });
    const res = await fetch(url);
    // Ensure the cache directory exists
    await ensureDir(cacheDir);
    // Write the binary to disk
    const arrayBuffer = await res.arrayBuffer();
    await writeFile(filePath, new Uint8Array(arrayBuffer), { mode: 0o755 });
    return filePath;
}
// Helper function to get the OS-specific cache directory
function getCacheDir() {
    const currentPlatform = platform();
    return match(currentPlatform)
        .with("darwin", () => join(homedir(), "Library", "Caches", "webview"))
        .with("linux", () => join(homedir(), ".cache", "webview"))
        .with("win32", () => join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "webview", "Cache"))
        .otherwise(() => {
        // Default to a .cache directory in home for unknown platforms
        logger.warn(`Unknown platform: ${currentPlatform}, using default cache directory`);
        return join(homedir(), ".cache", "webview");
    });
}
// Helper function to check if file exists
async function fileExists(filePath) {
    try {
        await access(filePath, constants.F_OK);
        return true;
    }
    catch {
        return false;
    }
}
// Helper function to ensure directory exists
async function ensureDir(dirPath) {
    try {
        await mkdir(dirPath, { recursive: true });
    }
    catch (err) {
        if (err.code !== "EEXIST") {
            throw err;
        }
    }
}
/**
 * Creates a new webview window.
 *
 * Will automatically fetch the webview binary if it's not already downloaded
 */
export async function createWebView(options) {
    const binPath = await getWebViewBin(options);
    return new WebView(options, binPath);
}
/**
 * A webview window. It's recommended to use the `createWebView` function
 * because it provides a means of automatically fetching the webview binary
 * that's compatible with your OS and architecture.
 *
 * Each instance of `WebView` spawns a new process that governs a single webview window.
 */
export class WebView {
    #process;
    #buffer = "";
    #internalEvent = new EventEmitter();
    #externalEvent = new EventEmitter();
    #messageLoop;
    #options;
    #messageId = 0;
    /**
     * Creates a new webview window.
     *
     * @param options - The options for the webview.
     * @param webviewBinaryPath - The path to the webview binary.
     */
    constructor(options, webviewBinaryPath) {
        this.#options = options;
        this.#process = spawn(webviewBinaryPath, [JSON.stringify(options)], {
            stdio: ["pipe", "pipe", "inherit"],
        });
        this.#messageLoop = this.#processMessageLoop();
    }
    #send(request) {
        const id = this.#messageId++;
        return new Promise((resolve) => {
            // Setup listener before sending the message to avoid race conditions
            this.#internalEvent.once(id.toString(), (event) => {
                const result = WebViewResponse.safeParse(event);
                if (result.success) {
                    resolve(result.data);
                }
                else {
                    resolve({ $type: "err", id, message: result.error.message });
                }
            });
            this.#process.stdin?.write(JSON.stringify({ ...request, id }));
        });
    }
    async #processMessageLoop() {
        return new Promise((resolve) => {
            this.#process.stdout?.on('data', (chunk) => {
                this.#buffer += chunk.toString();
                let newlineIndex;
                while ((newlineIndex = this.#buffer.indexOf('\n')) !== -1) {
                    const messageStr = this.#buffer.slice(0, newlineIndex);
                    this.#buffer = this.#buffer.slice(newlineIndex + 1);
                    try {
                        logger.trace("buffer", { buffer: messageStr });
                        const result = Message.safeParse(JSON.parse(messageStr));
                        if (result.success) {
                            this.#handleMessage(result.data);
                        }
                        else {
                            logger.error("Error parsing message", { error: result.error });
                        }
                    }
                    catch (parseError) {
                        logger.error("Error parsing JSON", { error: parseError });
                    }
                }
            });
            this.#process.stdout?.on('end', () => {
                resolve();
            });
            this.#process.on('exit', () => {
                resolve();
            });
        });
    }
    #handleMessage(result) {
        match(result)
            .with({ $type: "notification" }, ({ data }) => {
            const { $type, ...body } = data;
            this.#externalEvent.emit($type, body);
            if (data.$type === "started" && data.version !== BIN_VERSION) {
                logger.warn(`Expected webview to be version ${BIN_VERSION} but got ${data.version}. Some features may not work as expected.`);
            }
        })
            .with({ $type: "response" }, ({ data }) => {
            this.#internalEvent.emit(data.id.toString(), data);
        })
            .exhaustive();
    }
    /**
     * Returns a promise that resolves when the webview window is closed.
     */
    async waitUntilClosed() {
        await this.#messageLoop;
    }
    /**
     * Listens for events emitted by the webview.
     */
    on(event, callback) {
        if (event === "ipc" && !this.#options.ipc) {
            throw new Error("IPC is not enabled for this webview");
        }
        this.#externalEvent.on(event, callback);
    }
    /**
     * Listens for a single event emitted by the webview.
     */
    once(event, callback) {
        if (event === "ipc" && !this.#options.ipc) {
            throw new Error("IPC is not enabled for this webview");
        }
        this.#externalEvent.once(event, callback);
    }
    /**
     * Gets the version of the webview binary.
     */
    async getVersion() {
        const result = await this.#send({ $type: "getVersion" });
        return returnResult(result, "string");
    }
    /**
     * Sets the size of the webview window.
     *
     * Note: this is the logical size of the window, not the physical size.
     * @see https://docs.rs/dpi/0.1.1/x86_64-unknown-linux-gnu/dpi/index.html#position-and-size-types
     */
    async setSize(size) {
        const result = await this.#send({ $type: "setSize", size });
        return returnAck(result);
    }
    /**
     * Gets the size of the webview window.
     *
     * Note: this is the logical size of the window, not the physical size.
     * @see https://docs.rs/dpi/0.1.1/x86_64-unknown-linux-gnu/dpi/index.html#position-and-size-types
     */
    async getSize(includeDecorations) {
        const request = {
            $type: "getSize",
        };
        if (includeDecorations !== undefined) {
            request.include_decorations = includeDecorations;
        }
        const result = await this.#send(request);
        return returnResult(result, "size");
    }
    /**
     * Enters or exits fullscreen mode for the webview.
     *
     * @param fullscreen - If true, the webview will enter fullscreen mode. If false, the webview will exit fullscreen mode. If not specified, the webview will toggle fullscreen mode.
     */
    async fullscreen(fullscreen) {
        const request = { $type: "fullscreen" };
        if (fullscreen !== undefined) {
            request.fullscreen = fullscreen;
        }
        const result = await this.#send(request);
        return returnAck(result);
    }
    /**
     * Maximizes or unmaximizes the webview window.
     *
     * @param maximized - If true, the webview will be maximized. If false, the webview will be unmaximized. If not specified, the webview will toggle maximized state.
     */
    async maximize(maximized) {
        const request = { $type: "maximize" };
        if (maximized !== undefined) {
            request.maximized = maximized;
        }
        const result = await this.#send(request);
        return returnAck(result);
    }
    /**
     * Minimizes or unminimizes the webview window.
     *
     * @param minimized - If true, the webview will be minimized. If false, the webview will be unminimized. If not specified, the webview will toggle minimized state.
     */
    async minimize(minimized) {
        const request = { $type: "minimize" };
        if (minimized !== undefined) {
            request.minimized = minimized;
        }
        const result = await this.#send(request);
        return returnAck(result);
    }
    /**
     * Sets the title of the webview window.
     */
    async setTitle(title) {
        const result = await this.#send({
            $type: "setTitle",
            title,
        });
        return returnAck(result);
    }
    /**
     * Gets the title of the webview window.
     */
    async getTitle() {
        const result = await this.#send({ $type: "getTitle" });
        return returnResult(result, "string");
    }
    /**
     * Sets the visibility of the webview window.
     */
    async setVisibility(visible) {
        const result = await this.#send({ $type: "setVisibility", visible });
        return returnAck(result);
    }
    /**
     * Returns true if the webview window is visible.
     */
    async isVisible() {
        const result = await this.#send({ $type: "isVisible" });
        return returnResult(result, "boolean");
    }
    /**
     * Evaluates JavaScript code in the webview.
     */
    async eval(code) {
        const result = await this.#send({ $type: "eval", js: code });
        return returnAck(result);
    }
    /**
     * Opens the developer tools for the webview.
     */
    async openDevTools() {
        const result = await this.#send({ $type: "openDevTools" });
        return returnAck(result);
    }
    /**
     * Reloads the webview with the provided html.
     */
    async loadHtml(html) {
        const result = await this.#send({ $type: "loadHtml", html });
        return returnAck(result);
    }
    /**
     * Loads a URL in the webview.
     */
    async loadUrl(url, headers) {
        const request = { $type: "loadUrl", url };
        if (headers !== undefined) {
            request.headers = headers;
        }
        const result = await this.#send(request);
        return returnAck(result);
    }
    /**
     * Destroys the webview and cleans up resources.
     *
     * Alternatively you can use the disposible interface.
     *
     * @example
     * ```ts
     * // The `using` keyword will automatically call `destroy` on the webview when
     * // the webview goes out of scope.
     * using webview = await createWebView({ title: "My Webview" });
     * ```
     */
    destroy() {
        this[Symbol.dispose]();
    }
    /**
     * Part of the explicit resource management feature added in TS 5.2
     *
     * When a reference to the webview is stored with `using` this method
     * will be called automatically when the webview goes out of scope.
     *
     * @example
     *
     * ```ts
     * {
     *  using webview = await createWebView({ title: "My Webview" });
     * } // Webview will be cleaned up here
     *
     * ```
     *
     * @see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#using-declarations-and-explicit-resource-management
     */
    [Symbol.dispose]() {
        this.#internalEvent.removeAllListeners();
        this.#externalEvent.removeAllListeners();
        try {
            this.#process.kill();
        }
        catch (_) {
            // Ignore errors when killing process
        }
    }
}
__decorate([
    instrument(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WebView.prototype, "getVersion", null);
__decorate([
    instrument(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WebView.prototype, "setSize", null);
__decorate([
    instrument(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", Promise)
], WebView.prototype, "getSize", null);
__decorate([
    instrument(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", Promise)
], WebView.prototype, "fullscreen", null);
__decorate([
    instrument(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", Promise)
], WebView.prototype, "maximize", null);
__decorate([
    instrument(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", Promise)
], WebView.prototype, "minimize", null);
__decorate([
    instrument(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WebView.prototype, "setTitle", null);
__decorate([
    instrument(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WebView.prototype, "getTitle", null);
__decorate([
    instrument(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", Promise)
], WebView.prototype, "setVisibility", null);
__decorate([
    instrument(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WebView.prototype, "isVisible", null);
__decorate([
    instrument(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WebView.prototype, "eval", null);
__decorate([
    instrument(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WebView.prototype, "openDevTools", null);
__decorate([
    instrument(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WebView.prototype, "loadHtml", null);
__decorate([
    instrument(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WebView.prototype, "loadUrl", null);
__decorate([
    instrument(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WebView.prototype, "destroy", null);
//# sourceMappingURL=main.js.map