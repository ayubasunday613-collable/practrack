import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, FlaskConical, Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { statusMeta, type SubmissionStatus } from "@/lib/sample-data";

export function Logo({ inverted = false, className }: { inverted?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5 font-semibold", className)} aria-label="PracTrack AI home">
      <span className={cn("grid size-9 place-items-center rounded-xl", inverted ? "bg-accent-brand text-accent-brand-foreground" : "bg-primary text-primary-foreground")}>
        <FlaskConical className="size-5" />
      </span>
      <span className={cn("text-lg tracking-tight", inverted ? "text-admin-foreground" : "text-foreground")}>
        PracTrack<span className="text-accent-brand"> AI</span>
      </span>
    </Link>
  );
}

const toneClass = {
  muted: "bg-muted text-muted-foreground",
  info: "bg-info-soft text-info-foreground",
  warning: "bg-warning-soft text-warning-foreground",
  success: "bg-success-soft text-success-foreground",
  danger: "bg-destructive/10 text-destructive",
};

export function Pill({ tone = "muted", children, className }: { tone?: keyof typeof toneClass; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", toneClass[tone], className)}>{children}</span>;
}

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  const m = statusMeta[status];
  return <Pill tone={m.tone}>{m.label}</Pill>;
}

export function DemoTag({ children = "Sample data" }: { children?: ReactNode }) {
  return <Pill tone="warning" className="uppercase tracking-wide text-[10px]">{children}</Pill>;
}

export function UpcomingTag() {
  return <Pill tone="info" className="uppercase tracking-wide text-[10px]">Upcoming</Pill>;
}

export function PrototypeNotice({ children }: { children: ReactNode }) {
  return (
    <div role="note" className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning-foreground">
      <Info className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, hint, inverted }: { icon: LucideIcon; label: string; value: string | number; hint?: string; inverted?: boolean }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-elevated">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className={cn("grid size-9 place-items-center rounded-lg", inverted ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground")}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground"><Icon className="size-6" /></span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionCard({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border bg-card shadow-soft", className)}>
      <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold">{title}</h2>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className={cn("pr-10", props.className)} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p role="alert" className="mt-1 text-xs text-destructive">{msg}</p>;
}
