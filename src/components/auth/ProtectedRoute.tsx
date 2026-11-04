import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { PrototypeNotice } from "@/components/common/ui-bits";

export function ProtectedRoute({
  role,
  children,
}: {
  role: "student" | "technologist";
  children: ReactNode;
}) {
  const { configured, loading, profileLoading, session, profile } = useAuth();

  if (!configured) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <PrototypeNotice>
          Supabase is not configured. Add the project URL and public anon key to `.env.local` and
          restart the app.
        </PrototypeNotice>
      </div>
    );
  }
  if (loading || (session && profileLoading)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin" aria-label="Loading account" />
      </div>
    );
  }
  if (!session) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <AlertCircle className="mx-auto size-8 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-semibold">Sign in to continue</h1>
        <Button asChild className="mt-5">
          <Link to={role === "technologist" ? "/technologist-login" : "/login"}>Go to sign in</Link>
        </Button>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center" role="alert">
        Your account profile is not available. Contact a Technologist for help.
      </div>
    );
  }
  if (profile.role !== role || profile.status !== "approved") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">
          {profile.status === "pending"
            ? "Awaiting Technologist approval"
            : "This account cannot open this workspace"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {profile.status === "pending"
            ? "A Technologist must approve your student account before you can access reports."
            : "Sign in with the account type assigned to your profile."}
        </p>
        <Button asChild className="mt-5">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    );
  }
  return children;
}
