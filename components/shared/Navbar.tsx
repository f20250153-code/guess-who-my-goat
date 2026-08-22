"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Users2 } from "lucide-react";
import clsx from "clsx";

const NAV_LINKS = [
  { href: "/play", label: "Play" },
  { href: "/categories", label: "Categories" },
  { href: "/create", label: "Create Pack" },
  { href: "/stats", label: "Stats" },
  { href: "/how-to-play", label: "How to Play" },
];

export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isGameplay = pathname === "/play";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-primary text-primary-foreground">
            <Users2 className="h-4.5 w-4.5" strokeWidth={2.5} aria-hidden="true" />
          </span>
          GUESS WHO
        </Link>

        {!isGameplay && (
          <>
            <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "rounded-[8px] px-3 py-2 text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-bg-elevated text-text"
                      : "text-text-muted hover:text-text hover:bg-bg-elevated",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-[8px] text-text-muted hover:bg-bg-elevated hover:text-text md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </>
        )}

        {isGameplay && (
          <Link
            href="/"
            className="rounded-[8px] px-3 py-2 text-sm font-medium text-text-muted hover:bg-bg-elevated hover:text-text"
          >
            Exit
          </Link>
        )}
      </div>

      {!isGameplay && menuOpen && (
        <nav id="mobile-nav" className="border-t border-border px-4 py-2 md:hidden" aria-label="Mobile">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={clsx(
                "block rounded-[8px] px-3 py-2.5 text-sm font-medium",
                pathname === link.href ? "bg-bg-elevated text-text" : "text-text-muted hover:text-text",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
