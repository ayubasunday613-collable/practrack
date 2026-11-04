import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, LogOut, Menu, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Logo, Pill } from "@/components/common/ui-bits";
import { useAuth } from "@/components/auth/AuthProvider";

export type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean };

type Props = {
  variant: "student" | "admin";
  nav: NavItem[];
  user: { name: string; sub: string };
  children: ReactNode;
};

export function AppShell({ variant, nav, user, children }: Props) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const admin = variant === "admin";

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out");
      navigate({ to: "/" });
    } catch (error) {
      console.error("Could not sign out.", error);
      toast.error("Sign out failed", { description: "Please try again." });
    }
  };

  const sidebar = (
    <div
      className={cn(
        "flex h-full flex-col",
        admin ? "bg-admin text-admin-foreground" : "bg-sidebar",
      )}
    >
      <div className="flex h-16 items-center gap-2 px-5">
        <Logo inverted={admin} />
      </div>
      <div className="px-5 pb-3">
        <Pill tone={admin ? "info" : "success"} className="uppercase tracking-wide text-[10px]">
          {admin ? "Technologist · Administrator" : "Student Portal"}
        </Pill>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2" aria-label="Dashboard">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to as "/"}
            activeOptions={{ exact: item.exact }}
            onClick={() => setOpen(false)}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              admin
                ? "text-admin-muted hover:bg-admin-active hover:text-admin-foreground data-[status=active]:bg-admin-active data-[status=active]:text-admin-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className={cn("border-t p-3", admin && "border-admin-active")}>
        <button
          onClick={handleSignOut}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            admin
              ? "text-admin-muted hover:bg-admin-active hover:text-admin-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          <LogOut className="size-4" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden w-64 border-r lg:block",
          admin && "border-admin-active",
        )}
      >
        {sidebar}
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </Button>
          <Pill tone="success" className="hidden sm:inline-flex">
            Signed-in workspace
          </Pill>
          <div className="ml-auto flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              onClick={() =>
                toast("No new notifications", {
                  description: "Live notifications arrive in a later stage.",
                })
              }
            >
              <Bell />
            </Button>
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-full text-sm font-semibold",
                  admin ? "bg-admin text-admin-foreground" : "bg-accent text-accent-foreground",
                )}
              >
                {user.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div className="hidden text-sm leading-tight sm:block">
                <div className="font-medium">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.sub}</div>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
