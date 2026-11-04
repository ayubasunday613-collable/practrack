import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/site/PublicLayout";
import { steps } from "./index";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — PracTrack AI" },
      {
        name: "description",
        content:
          "From registration to approved grades: how students and Technologists use PracTrack AI.",
      },
      { property: "og:title", content: "How It Works — PracTrack AI" },
      {
        property: "og:description",
        content:
          "Register, complete your practical booklet, submit and receive Technologist-approved feedback.",
      },
    ],
  }),
  component: HowItWorks,
});

function HowItWorks() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight">How PracTrack AI works</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A clear path for students, with Technologists in control of every assessment.
        </p>

        <div className="mt-12 rounded-2xl border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <UserPlus className="size-5 text-accent-brand" />
            <h2 className="font-semibold">Before you start: account approval</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Students register with their matriculation number. A Technologist verifies and approves
            each account before the portal is unlocked.
          </p>
        </div>

        <ol className="mt-8 space-y-4">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-5 rounded-2xl border bg-card p-6 shadow-soft">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
                <s.icon className="size-5" />
              </span>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-accent-brand">
                  Step {i + 1}
                </div>
                <h2 className="mt-1 text-lg font-semibold">{s.title}</h2>
                <p className="mt-1 text-muted-foreground">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-2xl border border-dashed bg-card p-6">
          <div className="flex flex-wrap items-center gap-3">
            <ShieldCheck className="size-5 text-primary" />
            <h2 className="font-semibold">Where AI fits in</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            After submission, AI suggests marks for each field using the Technologist's criteria. A
            Technologist reviews or adjusts every mark and approves the assessment before final
            grades and feedback are released to the student.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild variant="hero" size="lg">
            <Link to="/register">
              Register as a student <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/booklet-preview">Preview the booklet</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
