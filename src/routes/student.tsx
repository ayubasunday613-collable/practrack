import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { studentNav } from "@/lib/nav";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";

export const Route = createFileRoute("/student")({
  head: () => ({
    meta: [
      { title: "Student Dashboard — PracTrack AI" },
      { name: "description", content: "Your practicals, reports, submissions and grades." },
      { property: "og:title", content: "Student Dashboard — PracTrack AI" },
      { property: "og:description", content: "Track your practical reports in one place." },
    ],
  }),
  component: StudentArea,
});

function StudentArea() {
  const { profile } = useAuth();
  return (
    <ProtectedRoute role="student">
      <AppShell
        variant="student"
        nav={studentNav}
        user={{ name: profile?.full_name ?? "Student", sub: profile?.matric_number ?? "" }}
      >
        <Outlet />
      </AppShell>
    </ProtectedRoute>
  );
}
