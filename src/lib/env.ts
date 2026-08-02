export function getEnv(name: string): string | undefined {
  const deno = (globalThis as { Deno?: { env: { get(n: string): string | undefined } } }).Deno;
  if (deno) {
    try {
      return deno.env.get(name);
    } catch {
      // fall through when env permission is not granted
    }
  }
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[name];
}
