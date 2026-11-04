import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  GraduationCap,
  ImagePlus,
  LineChart,
  LockKeyhole,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Pill } from "@/components/common/ui-bits";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PracTrack AI — Digital Practical Reports for PTI Effurun" },
      {
        name: "description",
        content:
          "Complete practical report booklets online, upload sketches and receive Technologist-approved feedback and grades.",
      },
      { property: "og:title", content: "PracTrack AI — Digital Practical Reports" },
      {
        property: "og:description",
        content: "Digital practical booklets with Technologist-reviewed, rubric-based assessment.",
      },
    ],
  }),
  component: Home,
});

const features = [
  {
    icon: BookOpenCheck,
    title: "Digital Practical Booklets",
    text: "Technologists define the report fields for each experiment; students complete them in a structured online booklet.",
  },
  {
    icon: ImagePlus,
    title: "Sketch & Image Uploads",
    text: "Photograph hand-drawn diagrams and attach them directly to the right section of your report.",
  },
  {
    icon: Sparkles,
    title: "Rubric-Based AI Assessment",
    text: "AI suggestions scored against the Technologist's rubric, never released without human approval.",
  },
  {
    icon: UserCheck,
    title: "Technologist Review",
    text: "Technologists review every report, adjust feedback and approve grades before students see them.",
  },
  {
    icon: LineChart,
    title: "Continuous Assessment Tracking",
    text: "See drafts, submissions and approved grades across all your practicals in one place.",
  },
];

export const steps = [
  {
    icon: FileText,
    title: "Complete your practical report",
    text: "Fill in each booklet section and upload your sketches.",
  },
  {
    icon: Send,
    title: "Submit for review",
    text: "Send the finished report to your Technologist in one click.",
  },
  {
    icon: CheckCircle2,
    title: "Receive approved feedback",
    text: "Get feedback and a grade once the Technologist approves it.",
  },
];

function Home() {
  return (
    <PublicLayout>
      <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -right-36 -top-52 size-[34rem] rounded-full border border-white/10" />
          <div className="absolute -right-20 -top-36 size-[26rem] rounded-full border border-white/10" />
          <div className="absolute -bottom-48 left-[36%] size-[28rem] rounded-full bg-accent-brand/10 blur-3xl" />
          <div className="grid-bg absolute inset-0 opacity-10 [mask-image:linear-gradient(to_right,black,transparent_75%)]" />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-2 text-xs font-semibold tracking-wide text-white/90">
              <span className="size-2 rounded-full bg-accent-brand" />
              BUILT FOR PRACTICAL LEARNING AT PTI EFFURUN
            </div>
            <h1 className="mt-7 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Your practical work,{" "}
              <span className="text-accent-brand">ready for the next step.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
              A clearer way for PTI students to complete practical reports—and for Technologists to
              review work, give feedback and approve results.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-lg bg-white px-6 text-primary shadow-lg hover:bg-white/90"
              >
                <Link to="/register">
                  Get started as a student <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 rounded-lg border-white/25 bg-white/[0.06] px-6 text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/technologist-login">
                  <ShieldCheck /> Technologist portal
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/65">
              <span className="inline-flex items-center gap-2">
                <LockKeyhole className="size-4 text-accent-brand" /> Private student work
              </span>
              <span className="inline-flex items-center gap-2">
                <UserCheck className="size-4 text-accent-brand" /> Human-approved results
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[34rem] lg:ml-auto">
            <div
              className="absolute -inset-5 rounded-[2rem] bg-accent-brand/10 blur-2xl"
              aria-hidden="true"
            />
            <div className="relative rounded-[1.6rem] border border-white/15 bg-white/[0.08] p-3 shadow-2xl backdrop-blur-sm sm:p-4">
              <div className="rounded-[1.15rem] bg-background p-5 text-foreground sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                      <BookOpenCheck className="size-5" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        The practical journey
                      </p>
                      <h2 className="mt-1 font-semibold">From lab to reviewed report</h2>
                    </div>
                  </div>
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                    PTI Effurun
                  </span>
                </div>

                <div className="mt-7 rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">YOUR WORKSPACE</p>
                      <p className="mt-1 text-lg font-semibold">Practical report booklet</p>
                    </div>
                    <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                      <FileText className="size-5" />
                    </span>
                  </div>

                  <div className="mt-6 space-y-4">
                    {[
                      { icon: GraduationCap, label: "Practical assigned", detail: "By your Technologist", active: true },
                      { icon: FileCheck2, label: "Report completed", detail: "Answers and sketches", active: false },
                      { icon: ShieldCheck, label: "Reviewed and approved", detail: "Feedback you can trust", active: false },
                    ].map((item, index) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <span
                          className={`grid size-9 shrink-0 place-items-center rounded-full ${
                            item.active
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <item.icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{item.label}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                        </div>
                        {index < 2 && (
                          <span className="hidden text-xs font-medium text-muted-foreground sm:block">
                            {item.active ? "Start here" : "Next"}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex items-start gap-3 rounded-xl bg-accent/70 p-4">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
                    <p className="text-xs leading-5 text-accent-foreground">
                      AI can assist with marking suggestions. A Technologist reviews and approves
                      every result before it is released.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between px-1 text-xs text-white/70">
                  <span>Structured. Reviewed. Ready to learn.</span>
                  <span className="font-semibold tracking-wide">PRACTRACK AI</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-card">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-7 sm:px-6 md:grid-cols-3 md:px-8">
          {[
            { icon: BookOpenCheck, title: "Made for practical work", text: "A structured digital booklet for each assigned experiment." },
            { icon: ImagePlus, title: "Capture the full picture", text: "Add sketches and images alongside your written answers." },
            { icon: ShieldCheck, title: "Reviewed by a person", text: "Technologists approve marks and feedback before release." },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-4 py-2">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                <item.icon className="size-5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">{item.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Pill tone="success">A better practical workflow</Pill>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything in its right place.
          </h2>
          <p className="mt-4 text-muted-foreground">
            From the report booklet to the final grade, keep each step clear for students and
            Technologists.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-elevated sm:p-7"
            >
              <div className="grid size-12 place-items-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="size-5" />
              </div>
              <h3 className="mt-5 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent-brand">
                Simple from start to finish
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Your report, step by step.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              A practical workflow that keeps students moving and puts Technologists in control of
              assessment.
            </p>
          </div>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="relative rounded-2xl border bg-card p-6 shadow-soft sm:p-7">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <s.icon className="size-5" />
                  </span>
                  <span className="text-4xl font-bold tracking-tight text-muted/80">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-6 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <Button asChild variant="link" className="px-0 text-primary">
              <Link to="/how-it-works">
                See the full workflow <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-primary px-6 py-10 text-primary-foreground shadow-elevated sm:px-10 sm:py-12 lg:px-14">
          <div className="pointer-events-none absolute -right-16 -top-32 size-80 rounded-full border border-white/10" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-2 -top-20 size-52 rounded-full border border-white/10" aria-hidden="true" />
          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent-brand">
                Start your next practical
              </p>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Ready when your Technologist is.
            </h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/70 sm:text-base">
                Create your student account to get started, or sign in to manage practicals and
                review submitted reports.
            </p>
          </div>
            <div className="flex w-full flex-wrap gap-3 md:w-auto md:shrink-0">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-lg bg-white px-5 text-primary hover:bg-white/90"
              >
                <Link to="/register">Student registration <ArrowRight /></Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 rounded-lg border-white/25 bg-white/[0.06] px-5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/technologist-login"><ClipboardCheck /> Sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
