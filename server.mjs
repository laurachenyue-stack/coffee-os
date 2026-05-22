import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || 5173);
const root = process.cwd();

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://localhost:${port}`);
    const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const safePath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
    const filePath = join(root, safePath);
    const body = await readFile(filePath);

    response.writeHead(200, {
      "Content-Type": types[extname(filePath)] || "application/octet-stream",
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Coffee OS running at http://localhost:${port}`);
});
