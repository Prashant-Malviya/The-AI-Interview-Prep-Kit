
export function makeIdGenerator(prefix: string) {
  let counter = 0;
  return function nextId(): string {
    counter += 1;
    return `${prefix}${counter}`;
  };
}

export function hashString(input: string): string {
 
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}
