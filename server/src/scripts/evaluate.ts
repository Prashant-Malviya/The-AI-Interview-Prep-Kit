import fs from "fs";
import path from "path";
import { batchEntrySchema } from "../services/validation.service";
import { runKitPipeline } from "../services/kitPipeline.service";
import { BatchCase, BatchKitResult, BatchOutput } from "../types/kit.types";

// Usage: npm run evaluate -- --input <cases.json> --output <kits.json>
//
// Deliberately standalone: no DB connection, no HTTP server. It calls
// exactly the same runKitPipeline() function the API uses (see
// kitPipeline.service.ts), so there is no parallel implementation to
// keep in sync.

function parseArgs(argv: string[]): { input: string; output: string } {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--input") args.input = argv[i + 1];
    if (argv[i] === "--output") args.output = argv[i + 1];
  }
  if (!args.input || !args.output) {
    console.error("Usage: npm run evaluate -- --input <cases.json> --output <kits.json>");
    process.exit(1);
  }
  return { input: args.input, output: args.output };
}

// Process a small, fixed number of cases at a time rather than all at
// once, so we don't slam a free-tier LLM/scraping provider with a burst
// of concurrent requests (their per-minute token limits are the whole
// reason we need this).
const CONCURRENCY = 2;

async function processCase(c: BatchCase): Promise<BatchKitResult> {
  try {
    const kit = await runKitPipeline(
      { jd: c.jd, companyUrl: c.company_url, days: c.days },
      (step) => console.log(`[case ${c.id}] ${step}`)
    );
    return { id: c.id, status: "ok", kit, error: null };
  } catch (err) {
    const message = (err as Error).message || "Unknown error";
    console.error(`[case ${c.id}] FAILED: ${message}`);
    return {
      id: c.id,
      status: "failed",
      kit: null,
      error: { code: "PIPELINE_FAILED", message },
    };
  }
}

async function runWithConcurrency(cases: BatchCase[], limit: number): Promise<BatchKitResult[]> {
  const results: BatchKitResult[] = new Array(cases.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < cases.length) {
      const current = nextIndex++;
      results[current] = await processCase(cases[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, cases.length) }, () => worker()));
  return results;
}

async function main() {
  const { input, output } = parseArgs(process.argv.slice(2));

  const raw = JSON.parse(fs.readFileSync(path.resolve(input), "utf-8"));
  const parsed = batchEntrySchema.safeParse(raw);
  if (!parsed.success) {
    console.error("Invalid input file:", parsed.error.issues);
    process.exit(1);
  }

  console.log(`[evaluate] running ${parsed.data.length} case(s) with concurrency ${CONCURRENCY}`);
  const kits = await runWithConcurrency(parsed.data, CONCURRENCY);

  const outputData: BatchOutput = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    kits,
  };

  fs.writeFileSync(path.resolve(output), JSON.stringify(outputData, null, 2));
  console.log(`[evaluate] wrote ${kits.length} result(s) to ${output}`);

  const failed = kits.filter((k) => k.status === "failed").length;
  console.log(`[evaluate] ${kits.length - failed} ok, ${failed} failed`);
}

main().catch((err) => {
  console.error("[evaluate] fatal error:", err);
  process.exit(1);
});
