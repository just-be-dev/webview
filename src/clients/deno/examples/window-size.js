var __addDisposableResource = (this && this.__addDisposableResource) || function (env, value, async) {
    if (value !== null && value !== void 0) {
        if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
        var dispose, inner;
        if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
        }
        if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
            if (async) inner = dispose;
        }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        if (inner) dispose = function() { try { inner.call(this); } catch (e) { return Promise.reject(e); } };
        env.stack.push({ value: value, dispose: dispose, async: async });
    }
    else if (async) {
        env.stack.push({ async: true });
    }
    return value;
};
var __disposeResources = (this && this.__disposeResources) || (function (SuppressedError) {
    return function (env) {
        function fail(e) {
            env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
            env.hasError = true;
        }
        var r, s = 0;
        function next() {
            while (r = env.stack.pop()) {
                try {
                    if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
                    if (r.dispose) {
                        var result = r.dispose.call(r.value);
                        if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                    }
                    else s |= 1;
                }
                catch (e) {
                    fail(e);
                }
            }
            if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
            if (env.hasError) throw env.error;
        }
        return next();
    };
})(typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
import { createWebView } from '../main.js';
var webview;
const env_1 = { stack: [], error: void 0, hasError: false };
try {
    webview = __addDisposableResource(env_1, await createWebView({
        title: "Window Size",
        load: {
            html: `
    <h1>Window Sizes</h1>
    <div style="display: flex; gap: 10px;">
      <button onclick="window.ipc.postMessage('maximize')">Maximize</button>
      <button onclick="window.ipc.postMessage('minimize')">Minimize</button>
      <button onclick="window.ipc.postMessage('fullscreen')">Fullscreen</button>
    </div>
  `,
        },
        size: {
            height: 200,
            width: 800,
        },
        ipc: true,
    }), false);
    webview.on("ipc", ({ message }) => {
        switch (message) {
            case "maximize":
                webview.maximize();
                break;
            case "minimize":
                webview.minimize();
                break;
            case "fullscreen":
                webview.fullscreen();
                break;
            default:
                console.error("Unknown message", message);
        }
    });
    await webview.waitUntilClosed();
}
catch (e_1) {
    env_1.error = e_1;
    env_1.hasError = true;
}
finally {
    __disposeResources(env_1);
}
//# sourceMappingURL=window-size.js.map