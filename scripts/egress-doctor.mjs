#!/usr/bin/env node
// Offline egress doctor. Prints a short, honest report — no network calls to any model,
// no secrets. Run with: npm run doctor
import net from "node:net";
import http from "node:http";

const results = [];
const say = (name, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
};

const tcpFree = (port) => new Promise((resolve) => {
  const server = net.createServer();
  server.once("error", () => resolve(false));
  server.once("listening", () => server.close(() => resolve(true)));
  server.listen(port, "127.0.0.1");
});

const httpStatus = (port, path = "/") => new Promise((resolve) => {
  const req = http.get({ host: "127.0.0.1", port, path, timeout: 4000 }, (res) => {
    res.resume();
    resolve(res.statusCode ?? 0);
  });
  req.on("error", () => resolve(0));
  req.on("timeout", () => { req.destroy(); resolve(0); });
});

const clashFree = await tcpFree(7897);
say("Clash port 7897 is free", clashFree, clashFree ? "no local proxy binding" : "something is listening");

const proxyVars = ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"]
  .filter((k) => process.env[k] && process.env[k].trim());
say("no inherited proxy environment", proxyVars.length === 0, proxyVars.length ? proxyVars.join(",") : "direct egress");

const status = await httpStatus(5199);
say("dev server on 127.0.0.1:5199 answers", status === 200, `HTTP ${status}`);

console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
if (status === 200) console.log("Open: http://127.0.0.1:5199/");
process.exit(results.every(Boolean) ? 0 : 1);
