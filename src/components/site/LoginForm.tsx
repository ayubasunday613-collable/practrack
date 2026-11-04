import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, PasswordInput, PrototypeNotice } from "@/components/common/ui-bits";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export function LoginForm({ role }: { role: "student" | "admin" }) {
  const navigate = useNavigate();
  const admin = role === "admin";
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [errors, setErrors] = useState<{ id?: string; pw?: string }>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!id.trim())
      errs.id = admin ? "Enter your email address" : "Enter your email or matriculation number";
    else if (admin && !/^\S+@\S+\.\S+$/.test(id)) errs.id = "Enter a valid email address";
    if (!pw) errs.pw = "Enter your password";
    else if (pw.length < 8) errs.pw = "Passwords are at least 8 characters";
    setErrors(errs);
    setFormError("");
    if (Object.keys(errs).length) {
      setFormError("Please fix the highlighted fields.");
      return;
    }
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      setFormError(
        "Supabase is not configured. Add your project URL and public anon key to .env.local.",
      );
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: id.trim(),
        password: pw,
      });
      if (error) throw error;

      const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("role,status")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile)
        throw new Error(
          "Your account profile could not be verified. Contact a Technologist for help.",
        );
      if (profile.role !== (admin ? "technologist" : "student")) {
        await client.auth.signOut();
        throw new Error(
          admin
            ? "This account does not have Technologist access."
            : "Use the Technologist sign-in for this account.",
        );
      }
      if (profile.status !== "approved") {
        if (!admin && profile.status === "pending") {
          await navigate({ to: "/awaiting-approval" });
          return;
        }
        await client.auth.signOut();
        throw new Error("This account is not approved for portal access.");
      }

      await navigate({ to: admin ? "/technologist" : "/student" });
    } catch (error) {
      console.error("Supabase sign-in failed.", error);
      setFormError(error instanceof Error ? error.message : "Sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <PrototypeNotice>
        Sign-in is verified by Supabase. Student access remains pending until a Technologist
        approves the account.
      </PrototypeNotice>
      {formError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="size-4" />
          {formError}
        </div>
      )}
      <div>
        <Label htmlFor="id">Email address</Label>
        <Input
          id="id"
          type={admin ? "email" : "text"}
          value={id}
          onChange={(e) => setId(e.target.value)}
          autoComplete={admin ? "email" : "username"}
          aria-invalid={!!errors.id}
          className="mt-1.5"
        />
        <FieldError msg={errors.id} />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="pw">Password</Label>
          <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="pw"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="current-password"
          aria-invalid={!!errors.pw}
          className="mt-1.5"
        />
        <FieldError msg={errors.pw} />
      </div>
      <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
        {loading && <Loader2 className="animate-spin" />}
        {admin ? "Sign in as Technologist" : "Sign in"}
      </Button>
    </form>
  );
}
