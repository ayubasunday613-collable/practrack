import { createFileRoute } from "@tanstack/react-router";
import { Building2, GraduationCap, Lock, Users } from "lucide-react";
import { PublicLayout } from "@/components/site/PublicLayout";
import { PrototypeNotice } from "@/components/common/ui-bits";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — PracTrack AI" },
      { name: "description", content: "Why PracTrack AI exists and how it supports practical training at PTI Effurun." },
      { property: "og:title", content: "About PracTrack AI" },
      { property: "og:description", content: "Digitising practical report booklets for technical education in Nigeria." },
    ],
  }),
  component: About,
});

const values = [
  { icon: GraduationCap, title: "Student first", text: "Clear structure and quick feedback help students focus on learning, not paperwork." },
  { icon: Users, title: "Technologist led", text: "Assessment decisions stay with the Technologists who supervise each practical." },
  { icon: Lock, title: "Secure by design", text: "Built to support role-based access and secure storage of reports and sketches." },
  { icon: Building2, title: "Ready to grow", text: "Structured so more departments and institutions can be supported over time." },
];

function About() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight">About PracTrack AI</h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Practical classes are central to technical training at the Petroleum Training Institute, Effurun. Students record each experiment in a printed report booklet, and Technologists assess them by hand. PracTrack AI brings that booklet online — keeping its familiar sections while making submission, review and tracking easier.
        </p>
        <div className="mt-6"><PrototypeNotice>PracTrack AI is an independent Stage 1 prototype. It is not an official PTI service and does not imply institutional endorsement.</PrototypeNotice></div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {values.map((v) => (
            <div key={v.title} className="rounded-2xl border bg-card p-6 shadow-soft">
              <v.icon className="size-6 text-accent-brand" />
              <h2 className="mt-4 font-semibold">{v.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{v.text}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
