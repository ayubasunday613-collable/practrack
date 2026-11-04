import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthLayout } from "@/components/site/AuthLayout";
import { FieldError, PasswordInput, PrototypeNotice } from "@/components/common/ui-bits";
import { departments, levels, programmes } from "@/lib/sample-data";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Student Registration — PracTrack AI" },
      {
        name: "description",
        content:
          "Register for a PracTrack AI student account. Accounts are activated after Technologist approval.",
      },
      { property: "og:title", content: "Student Registration — PracTrack AI" },
      {
        property: "og:description",
        content: "Create your student account for digital practical reports.",
      },
    ],
  }),
  component: Register,
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(3, "Enter your full name").max(100),
    matric: z.string().trim().min(4, "Enter your matriculation number").max(30),
    department: z.string().min(1, "Select your department"),
    programme: z.string().min(1, "Select your programme"),
    level: z.string().min(1, "Select your level"),
    email: z.string().trim().email("Enter a valid email address").max(255),
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .regex(/[0-9]/, "Include at least one number"),
    confirm: z.string(),
    terms: z.literal(true, {
      errorMap: () => ({ message: "Please acknowledge the terms to continue" }),
    }),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

type Form = Record<string, string | boolean>;

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState<Form>({
    fullName: "",
    matric: "",
    department: "",
    programme: "",
    level: "",
    email: "",
    password: "",
    confirm: "",
    terms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = registerSchema.safeParse(form);
    if (!r.success) {
      const errs: Record<string, string> = {};
      r.error.issues.forEach((i) => {
        errs[String(i.path[0])] ??= i.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    setFormError("");
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      setFormError(
        "Supabase is not configured. Add your project URL and public anon key to .env.local.",
      );
      return;
    }

    setLoading(true);
    try {
      const { error } = await client.auth.signUp({
        email: r.data.email,
        password: r.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/awaiting-approval`,
          data: {
            full_name: r.data.fullName,
            matric_number: r.data.matric,
            department: r.data.department,
            programme: r.data.programme,
            level: r.data.level,
          },
        },
      });
      if (error) throw error;
      await navigate({ to: "/awaiting-approval", search: { name: r.data.fullName.split(" ")[0] } });
    } catch (error) {
      console.error("Student registration failed.", error);
      setFormError(error instanceof Error ? error.message : "Registration could not be completed.");
    } finally {
      setLoading(false);
    }
  };

  const text = (k: string, label: string, type = "text", auto?: string) => (
    <div>
      <Label htmlFor={k}>{label}</Label>
      <Input
        id={k}
        type={type}
        autoComplete={auto}
        value={form[k] as string}
        onChange={(e) => set(k, e.target.value)}
        aria-invalid={!!errors[k]}
        className="mt-1.5"
      />
      <FieldError msg={errors[k]} />
    </div>
  );
  const select = (k: string, label: string, opts: string[]) => (
    <div>
      <Label htmlFor={k}>{label}</Label>
      <Select value={form[k] as string} onValueChange={(v) => set(k, v)}>
        <SelectTrigger id={k} className="mt-1.5 w-full" aria-invalid={!!errors[k]}>
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {opts.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError msg={errors[k]} />
    </div>
  );

  return (
    <AuthLayout
      title="Create your student account"
      subtitle={
        <>
          Already registered?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
      badge="Student registration"
    >
      <div className="mb-5">
        <PrototypeNotice>
          Registration creates a Supabase student account. A Technologist must approve it before
          portal access is enabled.
        </PrototypeNotice>
      </div>
      <form onSubmit={submit} noValidate className="space-y-4">
        {formError && (
          <div
            role="alert"
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {formError}
          </div>
        )}
        {text("fullName", "Full name", "text", "name")}
        {text("matric", "Matriculation number")}
        {select("department", "Department", departments)}
        <div className="grid gap-4 sm:grid-cols-2">
          {select("programme", "Programme / course", programmes)}
          {select("level", "Level", levels)}
        </div>
        {text("email", "Email address", "email", "email")}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              value={form.password as string}
              onChange={(e) => set("password", e.target.value)}
              aria-invalid={!!errors.password}
              className="mt-1.5"
            />
            <FieldError msg={errors.password} />
          </div>
          <div>
            <Label htmlFor="confirm">Confirm password</Label>
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              value={form.confirm as string}
              onChange={(e) => set("confirm", e.target.value)}
              aria-invalid={!!errors.confirm}
              className="mt-1.5"
            />
            <FieldError msg={errors.confirm} />
          </div>
        </div>
        <div>
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="terms"
              checked={form.terms as boolean}
              onCheckedChange={(v) => set("terms", v === true)}
              className="mt-0.5"
            />
            <Label
              htmlFor="terms"
              className="text-sm font-normal leading-snug text-muted-foreground"
            >
              I confirm my details are accurate and understand my account must be approved by a
              Technologist before use.
            </Label>
          </div>
          <FieldError msg={errors.terms} />
        </div>
        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
