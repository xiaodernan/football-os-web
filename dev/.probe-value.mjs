import { createServer } from "vite";
const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true, include: [] } });
const svc = await server.ssrLoadModule("/data/footballService.ts");
const ps = svc.footballProvider.players().slice().sort((a, b) => b.value - a.value);
const fmt = (v) => (v / 1e6).toFixed(1) + "M";
console.log("top5:", ps.slice(0, 5).map((p) => `${p.name} ${fmt(p.value)} ovr${p.overall} age${p.age}`).join(" | "));
console.log("median:", fmt(ps[Math.floor(ps.length / 2)].value), "min:", fmt(ps[ps.length - 1].value));
await server.close();
