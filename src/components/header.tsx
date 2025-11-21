"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "/", label: "Home" },
  { href: "/chat", label: "Chat" },
  { href: "/portofolio-crypto", label: "Portofolio Crypto" },
  { href: "/simulator", label: "Simulator" },
  { href: "/analyze", label: "Analyze" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 supports-[backdrop-filter]:dark:bg-gray-950/60">
      <div className="container mx-auto px-3 sm:px-4 h-auto py-2 sm:h-14 sm:py-0 flex items-center justify-between gap-4">
        <Link href="/" className="font-semibold tracking-tight text-sm sm:text-base">Personal Dashboard</Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <nav className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs sm:text-sm">
            {links.map((link) => {
              const active = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    "transition-colors hover:text-foreground/80",
                    active ? "text-foreground" : "text-foreground/60",
                  ].join(" ")}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
