// Generates short, stable, human-readable ids like "r1", "q7", "f3".
// A counter per-prefix is enough since ids only need to be stable and
// unique *within a single kit*, not globally.
export function makeIdGenerator(prefix: string) {
  let counter = 0;
  return function nextId(): string {
    counter += 1;
    return `${prefix}${counter}`;
  };
}

export function hashString(input: string): string {
  // Small, dependency-free string hash (djb2). Good enough for a
  // dedupe key - not used for anything security-sensitive.
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}
