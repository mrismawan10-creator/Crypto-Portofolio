"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const simulatorLinks = [
  {
    href: "/simulator/fire-achievement",
    label: "FIRE Achievement",
    description: "Hitung timeline kebebasan finansial",
  },
];

export default function SimulatorSubnav() {
  const pathname = usePathname();

  return (
    <div className="overflow-x-auto">
      <div className="flex flex-nowrap gap-3 rounded-2xl border border-white/60 bg-white/70 p-2 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/60">
        {simulatorLinks.map((link) => {
          const active = pathname?.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={[
                "flex min-w-[220px] flex-col rounded-xl border px-4 py-3 transition-colors",
                active
                  ? "border-blue-500/60 bg-blue-500/10 text-blue-600 dark:border-blue-400/70 dark:bg-blue-400/10 dark:text-blue-200"
                  : "border-transparent text-slate-600 hover:border-blue-500/40 hover:bg-blue-500/5 dark:text-slate-300",
              ].join(" ")}
            >
              <span className="text-sm font-semibold">{link.label}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {link.description}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
