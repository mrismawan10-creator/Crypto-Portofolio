"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

const ANALYZE_URL = "https://financial-dashboard-private.vercel.app/";

export default function AnalyzePage() {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950 py-6 sm:py-10">
      <div className="container mx-auto px-3 sm:px-4 space-y-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-500">
            Analyze
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-white">
            Financial Dashboard
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Lihat ringkasan performa finansial yang di-host secara privat dalam satu
            tampilan terintegrasi.
          </p>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/95 p-4 shadow-2xl backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/80">
          <div className="flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 dark:text-white">
                Embedded Private Dashboard
              </span>
              {!isLoaded && <span className="text-xs text-slate-500">Loading…</span>}
            </div>
            <a
              href={ANALYZE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-500"
            >
              Open in new tab
              <ExternalLink size={16} />
            </a>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 shadow-inner dark:border-slate-800">
            <iframe
              src={ANALYZE_URL}
              title="Financial Dashboard"
              className="h-[75vh] w-full"
              loading="lazy"
              onLoad={() => setIsLoaded(true)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
