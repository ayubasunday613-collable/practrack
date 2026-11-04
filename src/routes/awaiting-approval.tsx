import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/site/AuthLayout";

export const Route = createFileRoute("/awaiting-approval")({
  validateSearch: (s: Record<string, unknown>) => ({
    name: typeof s.name === "string" ? s.name.slice(0, 40) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Awaiting Approval — PracTrack AI" },
      { name: "description", content: "Your student account is awaiting Technologist approval." },
      { property: "og:title", content: "Awaiting Approval — PracTrack AI" },
      {
        property: "og:description",
        content: "Student accounts are enabled after Technologist approval.",
      },
    ],
  }),
  component: Awaiting,
});

function Awaiting() {
  const { name } = Route.useSearch();
  const items = [
    {
      icon: CheckCircle2,
      title: "Registration details received",
      text: "Your form passed validation. Check your inbox and confirm your email before signing in.",
      done: true,
    },
    {
      icon: ShieldCheck,
      title: "Technologist verification",
      text: "A Technologist confirms your matriculation number and department.",
      done: false,
    },
    {
      icon: Clock,
      title: "Portal access enabled",
      text: "You can sign in and start your practical reports.",
      done: false,
    },
  ];
  return (
    <AuthLayout
      title={name ? `Thanks, ${name} — you're almost in` : "Awaiting Technologist approval"}
      subtitle="Confirm your email address first, then your account will be enabled once a Technologist approves it."
      badge="Awaiting approval"
    >
      <ol className="space-y-3">
        {items.map((i) => (
          <li key={i.title} className="flex gap-3 rounded-xl border p-4">
            <i.icon
              className={`mt-0.5 size-5 shrink-0 ${i.done ? "text-accent-brand" : "text-muted-foreground"}`}
            />
            <div>
              <div className="font-medium">{i.title}</div>
              <div className="text-sm text-muted-foreground">{i.text}</div>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button asChild variant="outline" className="flex-1">
          <Link to="/">Back to home</Link>
        </Button>
        <Button asChild className="flex-1">
          <Link to="/login">Student sign in</Link>
        </Button>
      </div>
    </AuthLayout>
  );
}
