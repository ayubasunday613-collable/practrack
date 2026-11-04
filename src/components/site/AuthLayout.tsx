import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Logo, Pill } from "@/components/common/ui-bits";

export function AuthLayout({ title, subtitle, badge, admin, children }: { title: string; subtitle: ReactNode; badge?: string; admin?: boolean; children: ReactNode }) {
  return (
    <div className={cn("flex min-h-screen flex-col", admin ? "bg-admin" : "bg-background")}>
      <header className="mx-auto flex w-full max-w-6xl items-center px-4 py-5 sm:px-6"><Logo inverted={admin} /></header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:items-center">
        <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-elevated sm:p-8">
          {badge && <Pill tone={admin ? "info" : "success"} className="mb-4 uppercase tracking-wide text-[10px]">{badge}</Pill>}
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
