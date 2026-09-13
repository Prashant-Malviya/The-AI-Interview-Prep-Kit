// A deliberately tiny static file server (no Express) so it has zero
// dependency on the app's build. Serves ./acme-site at
// http://localhost:8099/acme/, which fixtures/cases.json points at.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "acme-site");
const PORT = 8099;

const server = http.createServer((req, res) => {
  let urlPath = req.url.replace(/^\/acme\/?/, "") || "index.html";
  if (urlPath.endsWith("/")) urlPath += "index.html";
  const filePath = path.join(ROOT, urlPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`[fixture-server] serving fake company site at http://localhost:${PORT}/acme/`);
});
