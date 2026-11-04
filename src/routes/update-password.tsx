import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/site/AuthLayout";
import { FieldError, PasswordInput } from "@/components/common/ui-bits";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/update-password")({
  head: () => ({ meta: [{ title: "Choose a New Password — PracTrack AI" }] }),
  component: UpdatePassword,
});

function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) return setError("Supabase is not configured.");

    setSaving(true);
    setError("");
    try {
      const { error: updateError } = await client.auth.updateUser({ password });
      if (updateError) throw updateError;
      await client.auth.signOut();
      await navigate({ to: "/login" });
    } catch (updateError) {
      console.error("Could not update account password.", updateError);
      setError(
        updateError instanceof Error ? updateError.message : "Password could not be updated.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle={
        <>
          Back to{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            student sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={updatePassword}>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div>
          <Label htmlFor="new-password">New password</Label>
          <PasswordInput
            id="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            className="mt-1.5"
          />
          <FieldError
            msg={
              password.length > 0 && password.length < 8 ? "Use at least 8 characters." : undefined
            }
          />
        </div>
        <div>
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <PasswordInput
            id="confirm-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            className="mt-1.5"
          />
        </div>
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthLayout>
  );
}
