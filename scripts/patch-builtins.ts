// Rewrites bare Node builtin imports in the nitro server output to the
// node:-prefixed form. Deno Deploy isolates reject bare specifiers like
// "perf_hooks" (postgres.js uses several); full Deno accepts both forms,
// so this is safe for Railway and local runs too. Runs as part of
// `deno task build`.
const BUILTINS = [
  "assert",
  "buffer",
  "child_process",
  "crypto",
  "dns",
  "events",
  "fs",
  "http",
  "https",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "querystring",
  "stream",
  "string_decoder",
  "tls",
  "url",
  "util",
  "worker_threads",
  "zlib",
];

const pattern = new RegExp(
  `(from\\s*|import\\s*\\(\\s*|require\\s*\\(\\s*)(["'])(${
    BUILTINS.join("|")
  })(/promises)?\\2`,
  "g",
);

let patchedFiles = 0;
for await (const entry of walk(".output/server")) {
  const text = await Deno.readTextFile(entry);
  const next = text.replace(pattern, (_m, lead, q, mod, sub) =>
    `${lead}${q}node:${mod}${sub ?? ""}${q}`);
  if (next !== text) {
    await Deno.writeTextFile(entry, next);
    patchedFiles++;
  }
}
console.log(`patch-builtins: ${patchedFiles} file(s) patched`);

async function* walk(dir: string): AsyncGenerator<string> {
  for await (const e of Deno.readDir(dir)) {
    const path = `${dir}/${e.name}`;
    if (e.isDirectory) yield* walk(path);
    else if (/\.(mjs|js|cjs)$/.test(e.name)) yield path;
  }
}
