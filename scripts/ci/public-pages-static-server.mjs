import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

// CI-only loopback server for built public pages. No external listener or network calls.
const root = resolve(process.cwd());
const port = Number(process.env.PUBLIC_PAGES_PORT ?? "4310");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
};

const server = createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url ?? "/", "http://127.0.0.1").pathname);
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }
  if (pathname.includes("\0")) {
    res.writeHead(400);
    res.end();
    return;
  }
  let filename = resolve(root, `.${pathname}`);
  if (filename !== root && !filename.startsWith(`${root}${sep}`)) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const entry = await stat(filename);
    if (entry.isDirectory()) {
      if (!pathname.endsWith("/")) {
        res.writeHead(301, { Location: `${pathname}/` });
        res.end();
        return;
      }
      filename = join(filename, "index.html");
    }
    const contents = await readFile(filename);
    res.writeHead(200, {
      "Content-Type": mime[extname(filename).toLowerCase()] ?? "application/octet-stream",
      "Content-Length": contents.length,
      "Cache-Control": "no-store",
    });
    if (req.method === "GET") res.end(contents);
    else res.end();
  } catch (error) {
    res.writeHead(error?.code === "ENOENT" || error?.code === "EISDIR" ? 404 : 500);
    res.end();
  }
});
server.listen(port, "127.0.0.1", () => {
  console.log(`Public acceptance fixture serving on 127.0.0.1:${port}`);
});