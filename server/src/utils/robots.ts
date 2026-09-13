import axios from "axios";


export async function loadDisallowedPaths(siteUrl: string): Promise<string[]> {
  try {
    const robotsUrl = new URL("/robots.txt", siteUrl).toString();
    const res = await axios.get<string>(robotsUrl, { timeout: 5000, responseType: "text" });
    const lines = res.data.split("\n").map((l) => l.trim());

    const disallowed: string[] = [];
    let inWildcardGroup = false;
    for (const line of lines) {
      if (/^user-agent:\s*\*/i.test(line)) inWildcardGroup = true;
      else if (/^user-agent:/i.test(line)) inWildcardGroup = false;
      else if (inWildcardGroup && /^disallow:/i.test(line)) {
        const path = line.split(":")[1]?.trim();
        if (path) disallowed.push(path);
      }
    }
    return disallowed;
  } catch {
    
    return [];
  }
}

export function isPathAllowed(url: string, disallowedPaths: string[]): boolean {
  const path = new URL(url).pathname;
  return !disallowedPaths.some((rule) => rule !== "" && path.startsWith(rule));
}
