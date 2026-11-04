import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/site/AuthLayout";
import { FieldError, PasswordInput, PrototypeNotice } from "@/components/common/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const adminEmail = "discipleshipayubasunday2026@gmail.com";

export const Route = createFileRoute("/technologist-register")({
  head: () => ({
    meta: [
      { title: "Technologist Registration — PracTrack AI" },
      {
        name: "description",
        content: "Create the verified administrator account for PracTrack AI.",
      },
    ],
  }),
  component: TechnologistRegister,
});

function TechnologistRegister() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ fullName?: string; password?: string; confirm?: string }>(
    {},
  );
  const [formError, setFormError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (fullName.trim().length < 3) nextErrors.fullName = "Enter your full name";
    if (password.length < 8) nextErrors.password = "Use at least 8 characters";
    if (confirmPassword !== password) nextErrors.confirm = "Passwords do not match";
    setErrors(nextErrors);
    setFormError("");
    setStatusMessage("");
    if (Object.keys(nextErrors).length > 0) return;

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      setFormError(
        "Supabase is not configured. Add your project URL and public anon key to .env.local.",
      );
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await client.auth.signUp({
        email: adminEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/technologist-login`,
          data: { full_name: fullName.trim() },
        },
      });
      if (error) throw error;
      setPassword("");
      setConfirmPassword("");

      if (data.session) {
        const { data: profile, error: profileError } = await client
          .from("profiles")
          .select("role,status")
          .eq("user_id", data.session.user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        if (profile?.role !== "technologist" || profile.status !== "approved") {
          const { error: signOutError } = await client.auth.signOut();
          if (signOutError) throw signOutError;
          throw new Error(
            "The account was created, but administrator access was not activated. Confirm the email and apply the verified Technologist registration migration.",
          );
        }
        await navigate({ to: "/technologist" });
        return;
      }

      setStatusMessage(
        `Check ${adminEmail} for a confirmation link. Your Technologist access activates after you verify the email.`,
      );
    } catch (error) {
      console.error("Technologist registration failed.", error);
      setFormError(error instanceof Error ? error.message : "Registration could not be completed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      admin
      title="Create your Technologist account"
      badge="Administrator registration"
      subtitle={
        <>
          Already registered?{" "}
          <Link to="/technologist-login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="mb-5">
        <PrototypeNotice>
          Registration is restricted to {adminEmail}. Supabase email confirmation must be enabled;
          access is granted only after this address is verified.
        </PrototypeNotice>
      </div>
      <form onSubmit={submit} noValidate className="space-y-4">
        {formError && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <AlertCircle className="size-4" />
            {formError}
          </div>
        )}
        {statusMessage && (
          <div role="status" className="rounded-lg bg-success-soft px-3 py-2 text-sm">
            <p>{statusMessage}</p>
            <p className="mt-2">
              Already registered?{" "}
              <Link to="/technologist-login" className="font-medium underline">
                Sign in
              </Link>{" "}
              or{" "}
              <Link to="/forgot-password" className="font-medium underline">
                reset your password
              </Link>
              .
            </p>
          </div>
        )}
        <div>
          <Label htmlFor="full-name">Full name</Label>
          <Input
            id="full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            className="mt-1.5"
          />
          {errors.fullName && <FieldError msg={errors.fullName} />}
        </div>
        <div>
          <Label htmlFor="admin-email">Email address</Label>
          <Input
            id="admin-email"
            type="email"
            value={adminEmail}
            readOnly
            autoComplete="email"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            className="mt-1.5"
          />
          {errors.password && <FieldError msg={errors.password} />}
        </div>
        <div>
          <Label htmlFor="confirm-password">Confirm password</Label>
          <PasswordInput
            id="confirm-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            aria-invalid={!!errors.confirm}
            className="mt-1.5"
          />
          {errors.confirm && <FieldError msg={errors.confirm} />}
        </div>
        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          Create Technologist account
        </Button>
      </form>
    </AuthLayout>
  );
}
