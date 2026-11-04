import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardCheck } from "lucide-react";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/booklet-preview")({
  head: () => ({
    meta: [
      { title: "Report Booklet — PracTrack AI" },
      {
        name: "description",
        content: "Report booklets are created from practicals configured by a Technologist.",
      },
    ],
  }),
  component: () => (
    <PublicLayout>
      <section className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <ClipboardCheck className="size-7" />
        </span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight">
          Report booklets are practical-specific
        </h1>
        <p className="mt-3 text-muted-foreground">
          There are no preset experiments or sample reports. A Technologist creates the practical
          and its report fields; assigned students then open their own report sheet.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/login">Student sign in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/technologist-login">Technologist sign in</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  ),
});
