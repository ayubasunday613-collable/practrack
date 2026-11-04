import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/site/AuthLayout";
import { LoginForm } from "@/components/site/LoginForm";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Student Login — PracTrack AI" },
      { name: "description", content: "Sign in to your PracTrack AI student portal." },
      { property: "og:title", content: "Student Login — PracTrack AI" },
      { property: "og:description", content: "Access your practical reports, submissions and grades." },
    ],
  }),
  component: () => (
    <AuthLayout title="Welcome back" badge="Student portal" subtitle={<>New here? <Link to="/register" className="font-medium text-primary hover:underline">Create a student account</Link></>}>
      <LoginForm role="student" />
      <p className="mt-6 text-center text-xs text-muted-foreground">Are you a Technologist? <Link to="/technologist-login" className="font-medium text-primary hover:underline">Use the Technologist login</Link></p>
    </AuthLayout>
  ),
});
