# @justbe/webview TypeScript Client

A light, cross-platform library for building web-based desktop apps with
[Node](https://nodejs.org/) (>= 20.9), [Deno](https://deno.com/), or
[Bun](https://bun.sh/).

## Installation

> [!NOTE]
> The package name differs slightly by registry: it's
> [`@justbe/webview` on JSR](https://jsr.io/@justbe/webview) and
> [`@just-be/webview` on npm](https://www.npmjs.com/package/@just-be/webview).

### Node

```sh
npm install @just-be/webview
```

```typescript
import { createWebView } from "@just-be/webview";
```

### Bun

```sh
bun add @just-be/webview
```

```typescript
import { createWebView } from "@just-be/webview";
```

### Deno

```typescript
import { createWebView } from "jsr:@justbe/webview";
```

## Example

```typescript
import { createWebView } from "@just-be/webview"; // or "jsr:@justbe/webview" on Deno

using webview = await createWebView({
  title: "Example",
  html: "<h1>Hello, World!</h1>",
  devtools: true,
});

webview.on("started", async () => {
  await webview.openDevTools();
  await webview.eval("console.log('This is printed from eval!')");
});

await webview.waitUntilClosed();
```

Check out the [examples directory](examples/) for more examples.

## Binary Management

When executing this package, it checks to see if you have the required binary
for interfacing with the OS's webview. If it doesn't exist, it downloads it to a
cache directory and executes it.

You can specify a custom binary path using the `WEBVIEW_BIN` environment
variable. When set, this will bypass the default binary resolution process.

## Deno Permissions

On Deno, the binary management above yields a few different permission code
paths to be aware of. Node and Bun don't have a permission system, so none of
this applies there.

### Binary not in cache

This will be true of a first run of the package. These are the following
permission requests you can expect to see:

- Read HOME env -- Used to locate the cache directory
- Read <cache>/webview/webview-<version> -- Tries to read the binary from cache
- net to github.com:443 -- Connects to GitHub releases to try to download the
  binary (will be redirected)
- net to objects.githubusercontent.com:443 -- GitHub's CDN for the actual
  download
- Read <cache>/webview/ -- Reads the cache directory
- Write <cache>/webview/webview-<version> -- Writes the binary
- Run <cache>/webview/webview-<version> -- Runs the binary

### Binary cached

On subsequent runs you can expect fewer permission requests:

- Read HOME env -- Use to locate the cache directory
- Read <cache>/webview/webview-<version>
- Run <cache>/webview/webview-<version>

### Using a Custom Binary

When `WEBVIEW_BIN` is set and allowed, only one permission is needed:

- Run <WEBVIEW_BIN>

Note that this environment variable will never be _explicitly_ requested. If the
script detects it's not allowed to read this env var it just skips this code
path altogether.

## Logging

Set the `LOG_LEVEL` environment variable
(`trace | debug | info | warn | error | fatal`) to control the client's log
output.
