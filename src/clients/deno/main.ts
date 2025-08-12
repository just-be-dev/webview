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

import { EventEmitter } from "node:events";
import { spawn } from "node:child_process";
import { writeFile, access, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { platform, arch, homedir } from "node:os";
import { constants } from "node:fs";
import {
  Message,
  type Options,
  type Request as WebViewRequest,
  Response as WebViewResponse,
} from "./schemas";
import type { Except, Simplify } from "type-fest";

// Simple logging interface to replace tracing
interface Logger {
  trace: (message: string, data?: any) => void;
  warn: (message: string) => void;
  error: (message: string, data?: any) => void;
}

const logger: Logger = {
  trace: (message: string, data?: any) => {
    if (process.env.LOG_LEVEL === 'trace' || process.env.LOG_LEVEL === 'debug') {
      console.log(`[TRACE] ${message}`, data ? JSON.stringify(data) : '');
    }
  },
  warn: (message: string) => {
    console.warn(`[WARN] ${message}`);
  },
  error: (message: string, data?: any) => {
    console.error(`[ERROR] ${message}`, data ? JSON.stringify(data) : '');
  }
};

// Decorator replacement
function instrument() {
  return function(_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    return descriptor;
  };
}

import { match } from "ts-pattern";

export * from "./schemas";

// Logging is now handled by the logger object above

// Should match the cargo package version
/** The version of the webview binary that's expected */
export const BIN_VERSION = "0.3.1";

type WebViewNotification = Extract<
  Message,
  { $type: "notification" }
>["data"];

type ResultType = Extract<WebViewResponse, { $type: "result" }>;

/**
 * A helper function for extracting the result from a webview response.
 * Throws if the response includes unexpected results.
 *
 * @param result - The result of the webview request.
 * @param expectedType - The format of the expected result.
 */
function returnResult<
  Response extends WebViewResponse,
  E extends ResultType["result"]["$type"],
>(
  result: Response,
  expectedType: E,
): Extract<ResultType["result"], { $type: E }>["value"] {
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
const returnAck = (result: WebViewResponse) => {
  return match(result)
    .with({ $type: "ack" }, () => undefined)
    .with({ $type: "err" }, (err) => {
      throw new Error(err.message);
    })
    .otherwise(() => {
      throw new Error(`unexpected response: ${result.$type}`);
    });
};

async function getWebViewBin(options: Options) {
  // Check for WEBVIEW_BIN environment variable
  const binPath = process.env.WEBVIEW_BIN;
  if (binPath) return binPath;

  const currentPlatform = platform();
  const flags = options.devtools
    ? "-devtools"
    : options.transparent && currentPlatform === "darwin"
    ? "-transparent"
    : "";

  const cacheDir = getCacheDir();
  const fileName = `webview-${BIN_VERSION}${flags}${
    currentPlatform === "win32" ? ".exe" : ""
  }`;
  const filePath = join(cacheDir, fileName);

  // Check if the file already exists in cache
  if (await fileExists(filePath)) {
    return filePath;
  }

  // If not in cache, download it
  let url =
    `https://github.com/zephraph/webview/releases/download/webview-v${BIN_VERSION}/webview`;
  url += match(currentPlatform)
    .with(
      "darwin",
      () => "-mac" + (arch() === "arm64" ? "-arm64" : "") + flags,
    )
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
function getCacheDir(): string {
  const currentPlatform = platform();
  return match(currentPlatform)
    .with(
      "darwin",
      () => join(homedir(), "Library", "Caches", "webview"),
    )
    .with("linux", () => join(homedir(), ".cache", "webview"))
    .with(
      "win32",
      () => join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "webview", "Cache"),
    )
    .otherwise(() => {
      // Default to a .cache directory in home for unknown platforms
      logger.warn(`Unknown platform: ${currentPlatform}, using default cache directory`);
      return join(homedir(), ".cache", "webview");
    });
}

// Helper function to check if file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// Helper function to ensure directory exists
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (err: any) {
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
export async function createWebView(options: Options): Promise<WebView> {
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
export class WebView implements Disposable {
  #process: ReturnType<typeof spawn>;
  #buffer = "";
  #internalEvent = new EventEmitter();
  #externalEvent = new EventEmitter();
  #messageLoop: Promise<void>;
  #options: Options;
  #messageId = 0;

  /**
   * Creates a new webview window.
   *
   * @param options - The options for the webview.
   * @param webviewBinaryPath - The path to the webview binary.
   */
  constructor(options: Options, webviewBinaryPath: string) {
    this.#options = options;
    this.#process = spawn(webviewBinaryPath, [JSON.stringify(options)], {
      stdio: ["pipe", "pipe", "inherit"],
    });
    this.#messageLoop = this.#processMessageLoop();
  }

  #send(request: Except<WebViewRequest, "id">): Promise<WebViewResponse> {
    const id = this.#messageId++;
    return new Promise((resolve) => {
      // Setup listener before sending the message to avoid race conditions
      this.#internalEvent.once(id.toString(), (event) => {
        const result = WebViewResponse.safeParse(event);
        if (result.success) {
          resolve(result.data);
        } else {
          resolve({ $type: "err", id, message: result.error.message });
        }
      });
      this.#process.stdin?.write(
        JSON.stringify({ ...request, id }),
      );
    });
  }

  async #processMessageLoop() {
    return new Promise<void>((resolve) => {
      this.#process.stdout?.on('data', (chunk: Buffer) => {
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
            } else {
              logger.error("Error parsing message", { error: result.error });
            }
          } catch (parseError) {
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

  #handleMessage(result: Message) {
    match(result)
      .with({ $type: "notification" }, ({ data }) => {
        const { $type, ...body } = data;
        this.#externalEvent.emit($type, body);
        if (data.$type === "started" && data.version !== BIN_VERSION) {
          logger.warn(
            `Expected webview to be version ${BIN_VERSION} but got ${data.version}. Some features may not work as expected.`,
          );
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
  on<E extends WebViewNotification["$type"]>(
    event: E,
    callback: (
      event: Simplify<
        Omit<Extract<WebViewNotification, { $type: E }>, "$type">
      >,
    ) => void,
  ) {
    if (event === "ipc" && !this.#options.ipc) {
      throw new Error("IPC is not enabled for this webview");
    }
    this.#externalEvent.on(event, callback);
  }

  /**
   * Listens for a single event emitted by the webview.
   */
  once<E extends WebViewNotification["$type"]>(
    event: E,
    callback: (
      event: Simplify<
        Omit<Extract<WebViewNotification, { $type: E }>, "$type">
      >,
    ) => void,
  ) {
    if (event === "ipc" && !this.#options.ipc) {
      throw new Error("IPC is not enabled for this webview");
    }
    this.#externalEvent.once(event, callback);
  }

  /**
   * Gets the version of the webview binary.
   */
  @instrument()
  async getVersion(): Promise<string> {
    const result = await this.#send({ $type: "getVersion" });
    return returnResult(result, "string");
  }

  /**
   * Sets the size of the webview window.
   *
   * Note: this is the logical size of the window, not the physical size.
   * @see https://docs.rs/dpi/0.1.1/x86_64-unknown-linux-gnu/dpi/index.html#position-and-size-types
   */
  @instrument()
  async setSize(size: { width: number; height: number }): Promise<void> {
    const result = await this.#send({ $type: "setSize", size });
    return returnAck(result);
  }

  /**
   * Gets the size of the webview window.
   *
   * Note: this is the logical size of the window, not the physical size.
   * @see https://docs.rs/dpi/0.1.1/x86_64-unknown-linux-gnu/dpi/index.html#position-and-size-types
   */
  @instrument()
  async getSize(
    includeDecorations?: boolean,
  ): Promise<{ width: number; height: number; scaleFactor: number }> {
    const request: any = {
      $type: "getSize",
    };
    if (includeDecorations !== undefined) {
      request.include_decorations = includeDecorations;
    }
    const result = await this.#send(request);
    return returnResult(
      result,
      "size",
    );
  }

  /**
   * Enters or exits fullscreen mode for the webview.
   *
   * @param fullscreen - If true, the webview will enter fullscreen mode. If false, the webview will exit fullscreen mode. If not specified, the webview will toggle fullscreen mode.
   */
  @instrument()
  async fullscreen(fullscreen?: boolean): Promise<void> {
    const request: any = { $type: "fullscreen" };
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
  @instrument()
  async maximize(maximized?: boolean): Promise<void> {
    const request: any = { $type: "maximize" };
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
  @instrument()
  async minimize(minimized?: boolean): Promise<void> {
    const request: any = { $type: "minimize" };
    if (minimized !== undefined) {
      request.minimized = minimized;
    }
    const result = await this.#send(request);
    return returnAck(result);
  }

  /**
   * Sets the title of the webview window.
   */
  @instrument()
  async setTitle(title: string): Promise<void> {
    const result = await this.#send({
      $type: "setTitle",
      title,
    });
    return returnAck(result);
  }

  /**
   * Gets the title of the webview window.
   */
  @instrument()
  async getTitle(): Promise<string> {
    const result = await this.#send({ $type: "getTitle" });
    return returnResult(result, "string");
  }

  /**
   * Sets the visibility of the webview window.
   */
  @instrument()
  async setVisibility(visible: boolean): Promise<void> {
    const result = await this.#send({ $type: "setVisibility", visible });
    return returnAck(result);
  }

  /**
   * Returns true if the webview window is visible.
   */
  @instrument()
  async isVisible(): Promise<boolean> {
    const result = await this.#send({ $type: "isVisible" });
    return returnResult(result, "boolean");
  }

  /**
   * Evaluates JavaScript code in the webview.
   */
  @instrument()
  async eval(code: string): Promise<void> {
    const result = await this.#send({ $type: "eval", js: code });
    return returnAck(result);
  }

  /**
   * Opens the developer tools for the webview.
   */
  @instrument()
  async openDevTools(): Promise<void> {
    const result = await this.#send({ $type: "openDevTools" });
    return returnAck(result);
  }

  /**
   * Reloads the webview with the provided html.
   */
  @instrument()
  async loadHtml(html: string): Promise<void> {
    const result = await this.#send({ $type: "loadHtml", html });
    return returnAck(result);
  }

  /**
   * Loads a URL in the webview.
   */
  @instrument()
  async loadUrl(url: string, headers?: Record<string, string>): Promise<void> {
    const request: any = { $type: "loadUrl", url };
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
  @instrument()
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
  [Symbol.dispose](): void {
    this.#internalEvent.removeAllListeners();
    this.#externalEvent.removeAllListeners();
    try {
      this.#process.kill();
    } catch (_) {
      // Ignore errors when killing process
    }
  }
}