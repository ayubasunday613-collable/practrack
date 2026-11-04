import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/site/AuthLayout";
import { LoginForm } from "@/components/site/LoginForm";

export const Route = createFileRoute("/technologist-login")({
  head: () => ({
    meta: [
      { title: "Technologist Login — PracTrack AI" },
      {
        name: "description",
        content: "Administrator sign-in for Technologists reviewing practical reports.",
      },
      { property: "og:title", content: "Technologist Login — PracTrack AI" },
      {
        property: "og:description",
        content: "Administrator access for reviewing and approving assessments.",
      },
    ],
  }),
  component: () => (
    <AuthLayout
      admin
      title="Technologist sign-in"
      badge="Administrator access"
      subtitle={
        <>
          For Technologists who manage practicals, approve students and review assessments. New to
          the portal?{" "}
          <Link to="/technologist-register" className="font-medium text-primary hover:underline">
            Create the administrator account
          </Link>
        </>
      }
    >
      <LoginForm role="admin" />
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Student?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Go to the student login
        </Link>
      </p>
    </AuthLayout>
  ),
});
