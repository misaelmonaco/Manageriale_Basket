"use client";

import type { Role } from "@basket/contracts";
import { LogOut, Menu, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, clientAuth, logout } from "@/lib/api";
import { cn } from "@/lib/utils";
import { navForRole } from "@/lib/navigation";

type BrandingSettings = {
  logoUrl?: string;
  primaryRgb?: string;
  accentRgb?: string;
};

type OrganizationBranding = {
  id: string;
  name: string;
  settings?: { branding?: BrandingSettings };
};

const defaultTheme = {
  primary: "9 82% 56%",
  accent: "214 20% 87%",
};

function roleLabel(role: Role) {
  const labels: Record<Role, string> = {
    SUPER_ADMIN: "Super admin",
    DIRECTOR: "Dirigente",
    COACH: "Allenatore",
    PLAYER: "Giocatore",
    PARENT: "Genitore",
  };
  return labels[role];
}

function rgbToHsl(value?: string) {
  if (!value) return undefined;
  const parts = value.match(/\d+/g)?.map(Number).slice(0, 3);
  if (!parts || parts.length !== 3 || parts.some((part) => part < 0 || part > 255)) return undefined;

  const [r, g, b] = parts.map((part) => part / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === r) h = (g - b) / delta + (g < b ? 6 : 0);
    if (max === g) h = (b - r) / delta + 2;
    if (max === b) h = (r - g) / delta + 4;
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyBranding(settings?: BrandingSettings) {
  const root = document.documentElement;
  const primary = rgbToHsl(settings?.primaryRgb);
  const accent = rgbToHsl(settings?.accentRgb);
  root.style.setProperty("--primary", primary ?? defaultTheme.primary);
  root.style.setProperty("--ring", primary ?? defaultTheme.primary);
  root.style.setProperty("--accent", accent ?? defaultTheme.accent);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [userLabel, setUserLabel] = useState("Signed in");
  const [organizationName, setOrganizationName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [loggingOut, setLoggingOut] = useState(false);
  const items = useMemo(() => navForRole(role ?? "DIRECTOR"), [role]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const storedRole = localStorage.getItem("role") as Role | null;

    if (!token || !storedRole) {
      router.replace("/login");
      return;
    }

    setRole(storedRole);
    const firstName = localStorage.getItem("firstName");
    const lastName = localStorage.getItem("lastName");
    const email = localStorage.getItem("email");
    setUserLabel([firstName, lastName].filter(Boolean).join(" ") || email || storedRole.replace("_", " "));
  }, [router]);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") === "dark" ? "dark" : "light";
    setTheme(storedTheme);
    document.documentElement.classList.toggle("dark", storedTheme === "dark");
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }

  useEffect(() => {
    async function loadBranding() {
      if (!role) return;
      const organizationId =
        role === "SUPER_ADMIN"
          ? localStorage.getItem("selectedOrganizationId") || localStorage.getItem("organizationId")
          : localStorage.getItem("organizationId");
      if (!organizationId) return;

      try {
        const organization = await apiFetch<OrganizationBranding>(`/organizations/${organizationId}/branding`, clientAuth());
        const branding = organization.settings?.branding;
        setOrganizationName(organization.name);
        setLogoUrl(branding?.logoUrl ?? "");
        applyBranding(branding);
      } catch {
        setOrganizationName("");
        setLogoUrl("");
        applyBranding();
      }
    }

    void loadBranding();
    window.addEventListener("branding-updated", loadBranding);
    return () => window.removeEventListener("branding-updated", loadBranding);
  }, [role]);

  async function handleLogout() {
    const token = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");
    setLoggingOut(true);

    try {
      if (token && refreshToken) await logout(refreshToken, token);
    } catch {
      // Local sign-out should still complete if the server token was already invalid.
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("role");
      localStorage.removeItem("organizationId");
      localStorage.removeItem("selectedOrganizationId");
      localStorage.removeItem("selectedOrganizationSlug");
      localStorage.removeItem("selectedOrganizationName");
      localStorage.removeItem("firstName");
      localStorage.removeItem("lastName");
      localStorage.removeItem("email");
      router.replace("/login");
      router.refresh();
    }
  }

  if (!role) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading</main>;
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      {open && <button type="button" className="fixed inset-0 z-30 bg-foreground/35 lg:hidden" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-40 w-[min(18rem,82vw)] border-r border-border bg-card p-4 transition lg:static lg:block lg:w-auto", open ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
        {logoUrl && (
          <div className="mb-8">
            <img src={logoUrl} alt={organizationName || "Organization logo"} className="max-h-14 max-w-[180px] object-contain" />
          </div>
        )}
        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                onClick={() => setOpen(false)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-primary bg-primary px-3 py-2 text-primary-foreground sm:px-4 lg:px-8" style={{ borderTop: "3px solid hsl(var(--accent))" }}>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="hidden text-xs uppercase text-primary-foreground/75 sm:block">Signed in as</p>
            <p className="truncate text-sm font-medium">{userLabel}</p>
            <p className="text-xs text-primary-foreground/75">{roleLabel(role)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="flex h-9 items-center gap-1 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-2 text-primary-foreground transition hover:bg-primary-foreground/15 sm:gap-2"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            >
              <Sun className="h-4 w-4" />
              <span className="relative hidden h-5 w-10 rounded-full bg-muted sm:block">
                <span
                  className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-primary-foreground transition",
                    theme === "dark" ? "left-5" : "left-0.5"
                  )}
                />
              </span>
              <Moon className="h-4 w-4" />
            </button>
            <Button
              variant="outline"
              size="sm"
              className="border-primary-foreground/30 bg-primary-foreground/10 px-2 text-primary-foreground hover:bg-primary-foreground/15 sm:px-3"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{loggingOut ? "Logging out" : "Logout"}</span>
            </Button>
          </div>
        </header>
        <main className="p-3 sm:p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
