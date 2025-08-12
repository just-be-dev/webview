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
import { Message, type Options } from "./schemas";
import type { Simplify } from "type-fest";
export * from "./schemas";
/** The version of the webview binary that's expected */
export declare const BIN_VERSION = "0.3.1";
type WebViewNotification = Extract<Message, {
    $type: "notification";
}>["data"];
/**
 * Creates a new webview window.
 *
 * Will automatically fetch the webview binary if it's not already downloaded
 */
export declare function createWebView(options: Options): Promise<WebView>;
/**
 * A webview window. It's recommended to use the `createWebView` function
 * because it provides a means of automatically fetching the webview binary
 * that's compatible with your OS and architecture.
 *
 * Each instance of `WebView` spawns a new process that governs a single webview window.
 */
export declare class WebView implements Disposable {
    #private;
    /**
     * Creates a new webview window.
     *
     * @param options - The options for the webview.
     * @param webviewBinaryPath - The path to the webview binary.
     */
    constructor(options: Options, webviewBinaryPath: string);
    /**
     * Returns a promise that resolves when the webview window is closed.
     */
    waitUntilClosed(): Promise<void>;
    /**
     * Listens for events emitted by the webview.
     */
    on<E extends WebViewNotification["$type"]>(event: E, callback: (event: Simplify<Omit<Extract<WebViewNotification, {
        $type: E;
    }>, "$type">>) => void): void;
    /**
     * Listens for a single event emitted by the webview.
     */
    once<E extends WebViewNotification["$type"]>(event: E, callback: (event: Simplify<Omit<Extract<WebViewNotification, {
        $type: E;
    }>, "$type">>) => void): void;
    /**
     * Gets the version of the webview binary.
     */
    getVersion(): Promise<string>;
    /**
     * Sets the size of the webview window.
     *
     * Note: this is the logical size of the window, not the physical size.
     * @see https://docs.rs/dpi/0.1.1/x86_64-unknown-linux-gnu/dpi/index.html#position-and-size-types
     */
    setSize(size: {
        width: number;
        height: number;
    }): Promise<void>;
    /**
     * Gets the size of the webview window.
     *
     * Note: this is the logical size of the window, not the physical size.
     * @see https://docs.rs/dpi/0.1.1/x86_64-unknown-linux-gnu/dpi/index.html#position-and-size-types
     */
    getSize(includeDecorations?: boolean): Promise<{
        width: number;
        height: number;
        scaleFactor: number;
    }>;
    /**
     * Enters or exits fullscreen mode for the webview.
     *
     * @param fullscreen - If true, the webview will enter fullscreen mode. If false, the webview will exit fullscreen mode. If not specified, the webview will toggle fullscreen mode.
     */
    fullscreen(fullscreen?: boolean): Promise<void>;
    /**
     * Maximizes or unmaximizes the webview window.
     *
     * @param maximized - If true, the webview will be maximized. If false, the webview will be unmaximized. If not specified, the webview will toggle maximized state.
     */
    maximize(maximized?: boolean): Promise<void>;
    /**
     * Minimizes or unminimizes the webview window.
     *
     * @param minimized - If true, the webview will be minimized. If false, the webview will be unminimized. If not specified, the webview will toggle minimized state.
     */
    minimize(minimized?: boolean): Promise<void>;
    /**
     * Sets the title of the webview window.
     */
    setTitle(title: string): Promise<void>;
    /**
     * Gets the title of the webview window.
     */
    getTitle(): Promise<string>;
    /**
     * Sets the visibility of the webview window.
     */
    setVisibility(visible: boolean): Promise<void>;
    /**
     * Returns true if the webview window is visible.
     */
    isVisible(): Promise<boolean>;
    /**
     * Evaluates JavaScript code in the webview.
     */
    eval(code: string): Promise<void>;
    /**
     * Opens the developer tools for the webview.
     */
    openDevTools(): Promise<void>;
    /**
     * Reloads the webview with the provided html.
     */
    loadHtml(html: string): Promise<void>;
    /**
     * Loads a URL in the webview.
     */
    loadUrl(url: string, headers?: Record<string, string>): Promise<void>;
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
    destroy(): void;
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
    [Symbol.dispose](): void;
}
//# sourceMappingURL=main.d.ts.map