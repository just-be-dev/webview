import { createWebView } from "../main";

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

using webview = await createWebView({
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
});

await webview.waitUntilClosed();
