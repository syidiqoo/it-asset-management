"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronDown,
  HardDrive,
  LayoutDashboard,
  LogOut,
  MonitorSmartphone,
  Package,
  Settings2,
  Smartphone,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assets", label: "Data Aset", icon: HardDrive },
  { href: "/sim-cards", label: "SIM Card", icon: Smartphone },
];

const SETTINGS_NAV: NavItem[] = [
  { href: "/users", label: "User", icon: Users },
  { href: "/departments", label: "Department", icon: Building2, adminOnly: true },
  { href: "/types", label: "Kategori Inventaris", icon: Tags, adminOnly: true },
  { href: "/sim-packages", label: "Package SIM", icon: Package, adminOnly: true },
];

type SidebarUser = {
  name: string;
  role: string;
  department: string | null;
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const ITEM_BASE =
  "flex items-center rounded-md font-medium transition-colors";

function DesktopLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={cn(
        ITEM_BASE,
        "gap-2.5 px-3 py-2 text-sm",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      )}
    >
      <Icon className={cn("size-4", active && "text-brand-orange")} />
      {item.label}
    </Link>
  );
}

function MobileLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={cn(
        ITEM_BASE,
        "shrink-0 gap-1.5 px-3 py-1.5 text-xs",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      )}
    >
      <Icon className={cn("size-3.5", active && "text-brand-orange")} />
      {item.label}
    </Link>
  );
}

function SettingsTrigger({
  variant,
  open,
  active,
  onToggle,
}: {
  variant: "desktop" | "mobile";
  open: boolean;
  active: boolean;
  onToggle: () => void;
}) {
  const desktop = variant === "desktop";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={cn(
        ITEM_BASE,
        desktop
          ? "w-full gap-2.5 px-3 py-2 text-sm"
          : "shrink-0 gap-1.5 px-3 py-1.5 text-xs",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      )}
    >
      <Settings2
        className={cn(desktop ? "size-4" : "size-3.5", active && "text-brand-orange")}
      />
      Pengaturan
      <ChevronDown
        className={cn(
          "ml-auto transition-transform",
          desktop ? "size-4" : "size-3.5",
          open && "rotate-180"
        )}
      />
    </button>
  );
}

function SettingsItems({
  variant,
  items,
  pathname,
}: {
  variant: "desktop" | "mobile";
  items: NavItem[];
  pathname: string;
}) {
  const desktop = variant === "desktop";

  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              ITEM_BASE,
              desktop
                ? "gap-2 py-1.5 pr-2 pl-2.5 text-sm"
                : "shrink-0 gap-1.5 px-2.5 py-1 text-xs",
              active
                ? "bg-sidebar-accent/70 text-sidebar-accent-foreground font-semibold"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <Icon
              className={cn(desktop ? "size-4" : "size-3.5", active && "text-brand-orange")}
            />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const visible = (list: NavItem[]) =>
    list.filter((item) => !item.adminOnly || user.role === "ADMIN");
  const mainItems = visible(MAIN_NAV);
  const settingsItems = visible(SETTINGS_NAV);

  const settingsActive = settingsItems.some((item) =>
    isActive(pathname, item.href)
  );
  const [settingsOpen, setSettingsOpen] = useState<boolean | null>(null);
  const open = settingsOpen ?? settingsActive;
  const toggle = () => setSettingsOpen(!open);

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-brand-orange" />

        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b px-5">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <MonitorSmartphone className="size-5" />
          </div>
          <span className="font-heading text-sm font-bold leading-tight tracking-tight">
            IT Helpdesk
            <br />
            Management
          </span>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
          {mainItems.map((item) => (
            <DesktopLink key={item.href} item={item} pathname={pathname} />
          ))}
          {settingsItems.length > 0 ? (
            <>
              <SettingsTrigger
                variant="desktop"
                open={open}
                active={settingsActive}
                onToggle={toggle}
              />
              {open ? (
                <div className="ml-4 flex flex-col gap-0.5 border-l border-sidebar-border pl-2">
                  <SettingsItems
                    variant="desktop"
                    items={settingsItems}
                    pathname={pathname}
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </nav>

        <div className="shrink-0 border-t p-3">
          <div className="mb-2 flex items-start justify-between gap-2 px-2 text-xs">
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="truncate text-muted-foreground">
                {user.role === "ADMIN" ? "Admin" : "Guest"}
                {user.department ? ` • ${user.department}` : ""}
              </p>
            </div>
            <ThemeToggle />
          </div>
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full justify-start"
            >
              <LogOut className="size-4" />
              Keluar
            </Button>
          </form>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b bg-sidebar text-sidebar-foreground md:hidden">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-brand-orange" />
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MonitorSmartphone className="size-5" />
            </div>
            <span className="font-heading text-sm font-bold tracking-tight">
              IT Helpdesk Management
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="icon-sm">
                <LogOut className="size-4" />
                <span className="sr-only">Keluar</span>
              </Button>
            </form>
          </div>
        </div>
        <nav className="flex flex-col gap-1 px-2 pb-2">
          <div className="flex gap-1 overflow-x-auto">
            {mainItems.map((item) => (
              <MobileLink key={item.href} item={item} pathname={pathname} />
            ))}
            {settingsItems.length > 0 ? (
              <SettingsTrigger
                variant="mobile"
                open={open}
                active={settingsActive}
                onToggle={toggle}
              />
            ) : null}
          </div>
          {settingsItems.length > 0 && open ? (
            <div className="flex flex-wrap gap-1 pl-1">
              <SettingsItems
                variant="mobile"
                items={settingsItems}
                pathname={pathname}
              />
            </div>
          ) : null}
        </nav>
      </header>
    </>
  );
}
