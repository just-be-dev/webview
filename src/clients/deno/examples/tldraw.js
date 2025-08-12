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
// Note: This example has been simplified for Node.js compatibility
// For full functionality, you'll need to use a bundler like esbuild, webpack, or vite
const tldrawApp = `
import { Tldraw } from "tldraw";
import { createRoot } from "react-dom/client";

function App() {
  return (
    <>
      <div style={{ position: "absolute", inset: 0 }}>
        <Tldraw persistenceKey="tldraw-example" cameraOptions={{ wheelBehavior: "zoom" }} onMount={(editor) => { editor.updateInstanceState({ isFocusMode: true })}} />
      </div>
    </>
  );
}

createRoot(document.querySelector("main")).render(<App />);
`;
// Pre-compiled version for demo purposes
const app = { code: tldrawApp.replace(/<App \/>/g, 'React.createElement(App)') };
var webview;
const env_1 = { stack: [], error: void 0, hasError: false };
try {
    webview = __addDisposableResource(env_1, await createWebView({
        title: "TLDraw",
        load: {
            html: `
    <!DOCTYPE html>
    <html lang="en">
      <head>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700&display=swap"/>
        <link rel="stylesheet" href="https://esm.sh/tldraw@2.3.0/tldraw.css"/>
        <style> body { font-family: "Inter"; } </style>
      </head>
      <body>
        <main></main>
        <script type="importmap">
          {
            "imports": {
              "tldraw": "https://esm.sh/tldraw@2.3.0?bundle-deps",
              "react/jsx-runtime": "https://esm.sh/react@18.3.1/jsx-runtime?bundle-deps",
              "react-dom/client": "https://esm.sh/react-dom@18.3.1/client?bundle-deps"
            }
          }
        </script>
        <script type="module">
          ${app.code}
        </script>
      </body>
    </html>
  `,
        },
    }), false);
    await webview.waitUntilClosed();
}
catch (e_1) {
    env_1.error = e_1;
    env_1.hasError = true;
}
finally {
    __disposeResources(env_1);
}
//# sourceMappingURL=tldraw.js.map