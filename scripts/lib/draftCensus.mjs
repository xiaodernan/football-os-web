// The quarantine's type census, in one place.
//
// Two gates read the drafts with the TypeScript checker and both have to agree on what the
// app's compiler is and on what a "family" of defect is. M539 measured the quarantine's
// types; M540 asks a second question of the same reading — which of the names the checker
// says are unbound are the APP's own names — and that question needs the same census.
//
// So the reading lives here, once. A change to the app's tsconfig is made in one file and
// both gates see it, and a family means the same thing in both:
//
//   · the app's OPTIONS are the app's own: the same tsconfig, the same `paths`, the same
//     `jsx` mode. A draft is judged the way the app would judge it, not the way a standalone
//     checker would judge it;
//   · a SIGNATURE is the code, plus the NAME the message complains about when the code names
//     one. "cannot find name 'useState'" and "cannot find name 'EmptyState'" are the same code
//     and two different families, and a bound is written against a family.
import { join } from "node:path";
import ts from "typescript";

/** The app's own compiler options, read from the app's own tsconfig. */
export const appOptions = (root) => {
  const cfg = ts.readConfigFile(join(root, "tsconfig.json"), ts.sys.readFile);
  if (cfg.error) throw new Error(`the app's tsconfig does not read: ${ts.flattenDiagnosticMessageText(cfg.error.messageText, " ")}`);
  const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, root);
  if (parsed.errors.length) throw new Error(`the app's tsconfig does not parse: ${parsed.errors.length} error(s)`);
  return { ...parsed.options, noEmit: true };
};

/**
 * The signature of a diagnostic: its code, plus the NAME it complains about when the code
 * names one.
 */
export const signature = (d) => {
  const msg = ts.flattenDiagnosticMessageText(d.messageText, " ");
  const named = /Cannot find name '([^']+)'/.exec(msg);
  return named ? `${d.code}:${named[1]}` : String(d.code);
};

/** The census: the files of a population, and the signatures of the defects the checker finds. */
export const census = (files, options, population) => {
  const program = ts.createProgram(files, options);
  const prefix = population.replace(/\\/g, "/") + "/";
  const perFile = new Map();
  for (const sf of program.getSourceFiles()) {
    const name = sf.fileName.replace(/\\/g, "/");
    if (!name.startsWith(prefix)) continue;
    perFile.set(name.slice(prefix.length), program.getSemanticDiagnostics(sf).map(signature));
  }
  return perFile;
};
