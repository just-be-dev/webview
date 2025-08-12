import { z } from "zod";
/**
 * Messages that are sent unbidden from the webview to the client.
 */
export type Notification = {
    $type: "started";
    /** The version of the webview binary */
    version: string;
} | {
    $type: "ipc";
    /** The message sent from the webview UI to the client. */
    message: string;
} | {
    $type: "closed";
};
export type SizeWithScale = {
    /** The height of the window in logical pixels. */
    height: number;
    /** The ratio between physical and logical sizes. */
    scaleFactor: number;
    /** The width of the window in logical pixels. */
    width: number;
};
/**
 * Types that can be returned from webview results.
 */
export type ResultType = {
    $type: "string";
    value: string;
} | {
    $type: "boolean";
    value: boolean;
} | {
    $type: "float";
    value: number;
} | {
    $type: "size";
    value: SizeWithScale;
};
/**
 * Responses from the webview to the client.
 */
export type Response = {
    $type: "ack";
    id: number;
} | {
    $type: "result";
    id: number;
    result: ResultType;
} | {
    $type: "err";
    id: number;
    message: string;
};
/**
 * Complete definition of all outbound messages from the webview to the client.
 */
export type Message = {
    $type: "notification";
    data: Notification;
} | {
    $type: "response";
    data: Response;
};
export declare const Notification: z.ZodType<Notification>;
export declare const SizeWithScale: z.ZodType<SizeWithScale>;
export declare const ResultType: z.ZodType<ResultType>;
export declare const Response: z.ZodType<Response>;
export declare const Message: z.ZodType<Message>;
/**
 * The content to load into the webview.
 */
export type Content = {
    /** Optional headers to send with the request. */
    headers?: Record<string, string>;
    /** Url to load in the webview. Note: Don't use data URLs here, as they are not supported. Use the `html` field instead. */
    url: string;
} | {
    /** Html to load in the webview. */
    html: string;
    /** What to set as the origin of the webview when loading html. */
    origin?: string;
};
export type Size = {
    /** The height of the window in logical pixels. */
    height: number;
    /** The width of the window in logical pixels. */
    width: number;
};
export type WindowSizeStates = "maximized" | "fullscreen";
export type WindowSize = WindowSizeStates | Size;
/**
 * Options for creating a webview.
 */
export type Options = {
    /** Sets whether clicking an inactive window also clicks through to the webview. Default is false. */
    acceptFirstMouse?: boolean;
    /** When true, all media can be played without user interaction. Default is false. */
    autoplay?: boolean;
    /**
     * Enables clipboard access for the page rendered on Linux and Windows.
     *
     * macOS doesn’t provide such method and is always enabled by default. But your app will still need to add menu item accelerators to use the clipboard shortcuts.
     */
    clipboard?: boolean;
    /** When true, the window will have a border, a title bar, etc. Default is true. */
    decorations?: boolean;
    /**
     * Enable or disable webview devtools.
     *
     * Note this only enables devtools to the webview. To open it, you can call `webview.open_devtools()`, or right click the page and open it from the context menu.
     */
    devtools?: boolean;
    /** Sets whether the webview should be focused when created. Default is false. */
    focused?: boolean;
    /**
     * Run the WebView with incognito mode. Note that WebContext will be ingored if incognito is enabled.
     *
     * Platform-specific: - Windows: Requires WebView2 Runtime version 101.0.1210.39 or higher, does nothing on older versions, see https://learn.microsoft.com/en-us/microsoft-edge/webview2/release-notes/archive?tabs=dotnetcsharp#10121039
     */
    incognito?: boolean;
    /** Run JavaScript code when loading new pages. When the webview loads a new page, this code will be executed. It is guaranteed that the code is executed before window.onload. */
    initializationScript?: string;
    /** Sets whether host should be able to receive messages from the webview via `window.ipc.postMessage`. */
    ipc?: boolean;
    /** The content to load into the webview. */
    load?: Content;
    /** The size of the window. */
    size?: WindowSize;
    /** Sets the title of the window. */
    title: string;
    /** Sets whether the window should be transparent. */
    transparent?: boolean;
    /** Sets the user agent to use when loading pages. */
    userAgent?: string;
};
export declare const Content: z.ZodType<Content>;
export declare const Size: z.ZodType<Size>;
export declare const WindowSizeStates: z.ZodType<WindowSizeStates>;
export declare const WindowSize: z.ZodType<WindowSize>;
export declare const Options: z.ZodType<Options>;
/**
 * Explicit requests from the client to the webview.
 */
export type Request = {
    $type: "getVersion";
    /** The id of the request. */
    id: number;
} | {
    $type: "eval";
    /** The id of the request. */
    id: number;
    /** The javascript to evaluate. */
    js: string;
} | {
    $type: "setTitle";
    /** The id of the request. */
    id: number;
    /** The title to set. */
    title: string;
} | {
    $type: "getTitle";
    /** The id of the request. */
    id: number;
} | {
    $type: "setVisibility";
    /** The id of the request. */
    id: number;
    /** Whether the window should be visible or hidden. */
    visible: boolean;
} | {
    $type: "isVisible";
    /** The id of the request. */
    id: number;
} | {
    $type: "openDevTools";
    /** The id of the request. */
    id: number;
} | {
    $type: "getSize";
    /** The id of the request. */
    id: number;
    /** Whether to include the title bar and borders in the size measurement. */
    include_decorations?: boolean;
} | {
    $type: "setSize";
    /** The id of the request. */
    id: number;
    /** The size to set. */
    size: Size;
} | {
    $type: "fullscreen";
    /** Whether to enter fullscreen mode. If left unspecified, the window will enter fullscreen mode if it is not already in fullscreen mode or exit fullscreen mode if it is currently in fullscreen mode. */
    fullscreen?: boolean;
    /** The id of the request. */
    id: number;
} | {
    $type: "maximize";
    /** The id of the request. */
    id: number;
    /** Whether to maximize the window. If left unspecified, the window will be maximized if it is not already maximized or restored if it was previously maximized. */
    maximized?: boolean;
} | {
    $type: "minimize";
    /** The id of the request. */
    id: number;
    /** Whether to minimize the window. If left unspecified, the window will be minimized if it is not already minimized or restored if it was previously minimized. */
    minimized?: boolean;
} | {
    $type: "loadHtml";
    /** HTML to set as the content of the webview. */
    html: string;
    /** The id of the request. */
    id: number;
    /** What to set as the origin of the webview when loading html. If not specified, the origin will be set to the value of the `origin` field when the webview was created. */
    origin?: string;
} | {
    $type: "loadUrl";
    /** Optional headers to send with the request. */
    headers?: Record<string, string>;
    /** The id of the request. */
    id: number;
    /** URL to load in the webview. */
    url: string;
};
export declare const Request: z.ZodType<Request>;
//# sourceMappingURL=schemas.d.ts.map