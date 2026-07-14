"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface NavLink {
  href: string;
  label: string;
}

interface ResponsiveNavProps {
  title: string;
  subtitle: string;
  links: NavLink[];
  maxWidth: "max-w-3xl" | "max-w-6xl";
  onSignOut: () => void | Promise<void>;
  trailing?: ReactNode;
}

export function ResponsiveNav({
  title,
  subtitle,
  links,
  maxWidth,
  onSignOut,
  trailing,
}: ResponsiveNavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className={cn("mx-auto px-4 py-4", maxWidth)}>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {title}
            </p>
            <p className="truncate text-sm text-slate-500">{subtitle}</p>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 md:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <nav className="hidden items-center gap-2 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium",
                  pathname === link.href || pathname.startsWith(`${link.href}/`)
                    ? "bg-emerald-700 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {link.label}
              </Link>
            ))}
            {trailing}
            <Button variant="outline" size="sm" onClick={onSignOut}>
              Sign out
            </Button>
          </nav>
        </div>

        {menuOpen && (
          <nav className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 md:hidden">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-2.5 text-sm font-medium",
                  pathname === link.href || pathname.startsWith(`${link.href}/`)
                    ? "bg-emerald-700 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {link.label}
              </Link>
            ))}
            {trailing && <div className="px-3 py-1">{trailing}</div>}
            <Button variant="outline" className="w-full" onClick={onSignOut}>
              Sign out
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
}
