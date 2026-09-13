import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import KitCard from "@/components/KitCard";
import { api } from "@/lib/api";
import { KitRecord } from "@/lib/types";

export default function DashboardPage() {
  const [kits, setKits] = useState<KitRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    try {
      const res = await api.get<{ kits: KitRecord[] }>("/kits");
      setKits(res.kits);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => {
      // Keep polling as long as anything is still generating, so the
      // dashboard's status pills update without a manual refresh.
      load();
    }, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">Your prep kits</h1>
            <p className="text-ink/60 mt-1 text-sm">Every kit you've generated, in one place.</p>
          </div>
          <Link
            to="/kits/new"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-paper hover:bg-accent/90"
          >
            + New kit
          </Link>
        </div>

        {error && <p className="text-warn text-sm mb-4">{error}</p>}

        {kits === null && <p className="text-ink/50">Loading…</p>}

        {kits && kits.length === 0 && (
          <div className="rounded-lg border border-dashed border-ink/20 p-10 text-center">
            <p className="text-ink/60">You don't have any kits yet.</p>
            <Link to="/kits/new" className="mt-3 inline-block text-accent font-medium hover:underline">
              Create your first one
            </Link>
          </div>
        )}

        {kits && kits.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {kits.map((kit) => (
              <KitCard key={kit._id} kit={kit} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
