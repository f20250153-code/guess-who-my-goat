"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  if (pathname === "/play") return null;

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-display text-sm font-bold tracking-tight">GUESS WHO</p>
          <p className="mt-1 text-sm text-text-muted">Ask smart. Eliminate faster. Guess right.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-muted" aria-label="Footer">
          <Link href="/categories" className="hover:text-text">
            Categories
          </Link>
          <Link href="/create" className="hover:text-text">
            Create a Pack
          </Link>
          <Link href="/how-to-play" className="hover:text-text">
            How to Play
          </Link>
          <Link href="/stats" className="hover:text-text">
            Your Stats
          </Link>
        </nav>
        <p className="text-xs text-text-faint">© {new Date().getFullYear()} Guess Who. For friends, everywhere.</p>
      </div>
    </footer>
  );
}
