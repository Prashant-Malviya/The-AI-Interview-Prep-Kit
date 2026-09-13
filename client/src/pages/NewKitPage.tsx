import { useState, FormEvent, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { api, ApiError } from "@/lib/api";
import { KitRecord } from "@/lib/types";

type Mode = "single" | "bulk";

export default function NewKitPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("single");

  // Single-kit form state
  const [jd, setJd] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [days, setDays] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Bulk form state
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);
  const [bulkItems, setBulkItems] = useState<{ jd: string; companyUrl: string; days: number }[] | null>(null);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  async function handleSingleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<{ kit: KitRecord }>("/kits", { jd, companyUrl, days: Number(days) });
      navigate(`/kits/${res.kit._id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the kit");
    } finally {
      setSubmitting(false);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFileName(file.name);
    setBulkResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed)) throw new Error("File must contain a JSON array");
        setBulkItems(parsed);
        setError(null);
      } catch (err) {
        setError(`Could not read that file: ${(err as Error).message}`);
        setBulkItems(null);
      }
    };
    reader.readAsText(file);
  }

  async function handleBulkSubmit() {
    if (!bulkItems) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<{ results: { ok: boolean; kitId?: string; error?: string }[] }>("/kits/bulk", {
        items: bulkItems,
      });
      const okCount = res.results.filter((r) => r.ok).length;
      setBulkResult(`Queued ${okCount} of ${res.results.length} role(s). They'll appear on your dashboard shortly.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit the batch");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
        <h1 className="font-display text-2xl font-semibold text-ink mb-1">Create a prep kit</h1>
        <p className="text-ink/60 mb-6 text-sm">
          Paste a job description and the company's website - we'll research the company and build a full kit.
        </p>

        <div className="mb-6 inline-flex rounded-md border border-ink/15 bg-white p-1 text-sm">
          <button
            onClick={() => setMode("single")}
            className={`px-3 py-1.5 rounded ${mode === "single" ? "bg-accent text-paper" : "text-ink/60"}`}
          >
            One role
          </button>
          <button
            onClick={() => setMode("bulk")}
            className={`px-3 py-1.5 rounded ${mode === "bulk" ? "bg-accent text-paper" : "text-ink/60"}`}
          >
            Multiple roles (upload file)
          </button>
        </div>

        {error && <p className="text-warn text-sm mb-4">{error}</p>}

        {mode === "single" && (
          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div>
              <label htmlFor="jd" className="block text-sm font-medium text-ink/80 mb-1">
                Job description
              </label>
              <textarea
                id="jd"
                required
                rows={10}
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the full job posting here…"
                className="w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-ink focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="companyUrl" className="block text-sm font-medium text-ink/80 mb-1">
                Company website
              </label>
              <input
                id="companyUrl"
                type="url"
                required
                placeholder="https://acme.com"
                value={companyUrl}
                onChange={(e) => setCompanyUrl(e.target.value)}
                className="w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-ink focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="days" className="block text-sm font-medium text-ink/80 mb-1">
                Days until the interview
              </label>
              <input
                id="days"
                type="number"
                min={1}
                max={90}
                required
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-32 rounded-md border border-ink/20 bg-white px-3 py-2 text-ink focus:border-accent focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-accent px-5 py-2.5 font-medium text-paper hover:bg-accent/90 disabled:opacity-60"
            >
              {submitting ? "Starting…" : "Generate kit"}
            </button>
          </form>
        )}

        {mode === "bulk" && (
          <div className="space-y-4">
            <div className="rounded-md border border-ink/15 bg-white p-4 text-sm text-ink/70">
              Upload a JSON file: an array of objects, each with{" "}
              <code className="bg-ink/5 px-1 rounded">jd</code>,{" "}
              <code className="bg-ink/5 px-1 rounded">companyUrl</code> and{" "}
              <code className="bg-ink/5 px-1 rounded">days</code>. Example:
              <pre className="mt-2 overflow-x-auto rounded bg-ink/5 p-2 text-xs">
{`[
  { "jd": "...", "companyUrl": "https://acme.com", "days": 5 },
  { "jd": "...", "companyUrl": "https://other.com", "days": 3 }
]`}
              </pre>
            </div>

            <input type="file" accept="application/json" onChange={handleFileChange} className="text-sm" />
            {bulkFileName && bulkItems && (
              <p className="text-sm text-ink/60">
                Loaded <strong>{bulkFileName}</strong> - {bulkItems.length} role(s) found.
              </p>
            )}

            {bulkResult && <p className="text-sm text-accent">{bulkResult}</p>}

            <button
              onClick={handleBulkSubmit}
              disabled={!bulkItems || submitting}
              className="rounded-md bg-accent px-5 py-2.5 font-medium text-paper hover:bg-accent/90 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Generate all"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
