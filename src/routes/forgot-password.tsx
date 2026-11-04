import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/site/AuthLayout";
import { FieldError, PrototypeNotice } from "@/components/common/ui-bits";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — PracTrack AI" },
      {
        name: "description",
        content: "Request a password reset link for your PracTrack AI account.",
      },
      { property: "og:title", content: "Reset Password — PracTrack AI" },
      { property: "og:description", content: "Recover access to your PracTrack AI account." },
    ],
  }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  return (
    <AuthLayout
      title="Reset your password"
      subtitle={
        <>
          Remembered it?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="text-center">
          <MailCheck className="mx-auto size-10 text-accent-brand" />
          <p className="mt-3 font-medium">Check your inbox</p>
          <p className="mt-1 text-sm text-muted-foreground">
            If an account exists for {email}, Supabase has sent a password reset link.
          </p>
        </div>
      ) : (
        <form
          noValidate
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email address");
            const client = getSupabaseClient();
            if (!client || !isSupabaseConfigured())
              return setErr(
                "Supabase is not configured. Add its URL and public anon key to .env.local.",
              );
            setErr("");
            setSending(true);
            const { error } = await client.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/update-password`,
            });
            setSending(false);
            if (error) return setErr(error.message);
            setSent(true);
          }}
        >
          <PrototypeNotice>
            Password reset links are sent by Supabase. Use the same email address you registered
            with.
          </PrototypeNotice>
          <div>
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!err}
              className="mt-1.5"
            />
            <FieldError msg={err} />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={sending}>
            {sending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
