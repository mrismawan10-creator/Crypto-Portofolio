import { ReactNode } from "react";
import SimulatorSubnav from "@/components/simulator/simulator-subnav";

export default function SimulatorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900/60 py-6 sm:py-10">
      <div className="container mx-auto px-3 sm:px-4 space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-500">
            Simulator
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-white">
            Financial Independence Lab
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Eksplorasi berbagai skenario untuk mencapai tujuan finansial Anda.
          </p>
        </div>
        <SimulatorSubnav />
        {children}
      </div>
    </div>
  );
}
