import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { adminNav } from "@/lib/nav";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";

export const Route = createFileRoute("/technologist")({
  head: () => ({
    meta: [
      { title: "Technologist Dashboard — PracTrack AI" },
      {
        name: "description",
        content: "Manage students, practicals, submissions and grade approvals.",
      },
      { property: "og:title", content: "Technologist Dashboard — PracTrack AI" },
      { property: "og:description", content: "Administrator workspace for practical assessment." },
    ],
  }),
  component: TechnologistArea,
});

function TechnologistArea() {
  const { profile } = useAuth();
  return (
    <ProtectedRoute role="technologist">
      <AppShell
        variant="admin"
        nav={adminNav}
        user={{ name: profile?.full_name ?? "Technologist", sub: "Administrator" }}
      >
        <Outlet />
      </AppShell>
    </ProtectedRoute>
  );
}
