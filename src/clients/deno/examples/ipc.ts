import { createWebView } from "../main";

using webview = await createWebView({
  title: "Simple",
  load: {
    html:
      '<button onclick="window.ipc.postMessage(`button clicked ${Date.now()}`)">Click me</button>',
  },
  ipc: true,
});

webview.on("ipc", ({ message }) => {
  console.log(message);
});

await webview.waitUntilClosed();
