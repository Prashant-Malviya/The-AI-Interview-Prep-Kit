import axios from "axios";

// A deliberately small robots.txt reader: it only understands the
// "User-agent: *" group and its "Disallow" rules, which is enough to be
// a polite, well-behaved crawler without pulling in a full robots parser
// library for a beginner-scale project.
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
    // No robots.txt, or it failed to load - treat as "nothing disallowed".
    return [];
  }
}

export function isPathAllowed(url: string, disallowedPaths: string[]): boolean {
  const path = new URL(url).pathname;
  return !disallowedPaths.some((rule) => rule !== "" && path.startsWith(rule));
}
