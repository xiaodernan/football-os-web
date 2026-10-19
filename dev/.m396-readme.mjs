// Land the M396 README section: insert dev/.m396-section.md immediately before `### M395` and move the
// roadmap pointer to M396. The README is CRLF on disk, so the file is read as LF, edited, and re-encoded to
// the file's own EOL; the CR/LF counts are asserted equal before AND after so a mixed-EOL README (which the
// next append-only gate punishes) cannot be shipped. Every number this script checks is derived from
// the bytes it is about to write, not hand-typed.
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "README.md";
const raw = readFileSync(FILE, "utf8");
const crlf = (raw.match(/\r\n/g) || []).length;
const bareLf = (raw.match(/\n/g) || []).length - crlf;
if (crlf === 0 || bareLf !== 0) throw new Error(`README is not pure CRLF (crlf ${crlf}, bare LF ${bareLf}) — refusing`);

const section = readFileSync("dev/.m396-section.md", "utf8")
  .replace(/\r\n/g, "\n")
  .replace(/\s+$/, "\n\n"); // the section must hand the next heading a blank line, whatever the editor left
if (!section.startsWith("### M396 ")) throw new Error("section does not start with the M396 heading");

const text = raw.replace(/\r\n/g, "\n");
const anchor = "### M395 — the marker's own population went behind the door";
const at = text.indexOf(anchor);
if (at < 0) throw new Error("M395 heading not found — refusing to write");
if (text.indexOf("### M396 ") !== -1) throw new Error("M396 already present — refusing to duplicate");

// The pointer line may have been manually bumped ahead; replace whatever "currently at M<number>" reads.
const POINTER_OLD = /Work ships one milestone per commit and is currently at M\d+/;
const POINTER_NEW = "Work ships one milestone per commit and is currently at M396";
const pointerMatch = text.match(POINTER_OLD);
if (!pointerMatch) throw new Error("pointer line not found");
const oldPtr = pointerMatch[0];

const inserted = text.slice(0, at) + section + text.slice(at);
const out = inserted.replace(oldPtr, POINTER_NEW);

const lfCount = (out.match(/\n/g) || []).length;
const wrote = out.replace(/\n/g, "\r\n");
const crOut = (wrote.match(/\r/g) || []).length;
const heads = ["### M396 ", "### M395 ", "### M394 "].map((h) =>
  `${h}${(wrote.match(new RegExp("^" + h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gm")) || []).length}`).join(" ");
const sectionLines = section.split("\n").length - 1;
const grew = lfCount - (raw.match(/\n/g) || []).length;
if (crOut !== lfCount) throw new Error(`inserted bytes are not pure CRLF (CR ${crOut} vs LF ${lfCount})`);
if (grew !== sectionLines) throw new Error(`README grew ${grew} lines but the section is ${sectionLines} — expected exact`);
if (!/^### M396 /m.test(wrote) || !/currently at M396/.test(wrote)) throw new Error("post-write self-check failed");
console.log(`section ${sectionLines} lines inserted before M395; README grew exactly ${grew} lines; CR/LF ${crOut}/${lfCount}; headings ${heads}`);
writeFileSync(FILE, wrote, "utf8");