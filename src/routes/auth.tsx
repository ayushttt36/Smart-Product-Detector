import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Dealer Login & Registration — Smart Product Detector" },
      {
        name: "description",
        content:
          "Dealers sign in or create an account to register products and manage their verified product catalogue.",
      },
      { property: "og:title", content: "Dealer Login — Smart Product Detector" },
      {
        property: "og:description",
        content: "Sign in to register products and manage your verified catalogue.",
      },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "register";

function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dealer", replace: true });
  }, [loading, user, navigate]);

  const [form, setForm] = useState({
    email: "",
    password: "",
    dealer_name: "",
    phone: "",
    company_name: "",
    address: "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): string | null {
    if (!form.email.trim() || !form.password) return "Email and password are both required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Enter a valid email address.";
    if (form.password.length < 6) return "Password must be at least 6 characters long.";
    if (mode === "register") {
      if (!form.dealer_name.trim()) return "Dealer name is required.";
      if (!form.company_name.trim()) return "Company / shop name is required.";
      if (!form.address.trim()) return "Address is required.";
      if (form.phone.trim() && !/^[\d+\-\s()]{6,20}$/.test(form.phone.trim()))
        return "Enter a valid phone number.";
    }
    return null;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (signInError) {
          setError(
            signInError.message.toLowerCase().includes("invalid")
              ? "Incorrect email or password. If you have not registered yet, create a dealer account."
              : signInError.message,
          );
          return;
        }
        router.invalidate();
        navigate({ to: "/dealer", replace: true });
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) {
          setError(
            signUpError.message.toLowerCase().includes("already")
              ? "A dealer is already registered with this email address."
              : signUpError.message,
          );
          return;
        }
        if (!data.session) {
          setNotice("Account created. Check your inbox to confirm your email, then log in.");
          setMode("login");
          return;
        }
        const { error: profileError } = await supabase.from("dealers").insert({
          user_id: data.user!.id,
          dealer_name: form.dealer_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          company_name: form.company_name.trim(),
          address: form.address.trim(),
        });
        if (profileError) {
          setError("Your account was created but the dealer profile could not be saved.");
          return;
        }
        router.invalidate();
        navigate({ to: "/dealer", replace: true });
      }
    } catch {
      setError("Something went wrong. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("Google sign-in could not be completed. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dealer", replace: true });
  }

  return (
    <div className="mx-auto max-w-xl py-6">
      <div className="panel p-6 sm:p-9">
        <div className="flex items-center gap-3">
          <span className="btn btn-primary !p-2.5">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">
              {mode === "login" ? "Dealer Login" : "Register as Dealer"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "login"
                ? "Sign in to manage your registered products."
                : "Create a dealer account to register your products."}
            </p>
          </div>
        </div>

        <form className="mt-8 space-y-4" onSubmit={submit}>
          {mode === "register" && (
            <>
              <div>
                <label className="field-label" htmlFor="dealer_name">
                  Dealer Name
                </label>
                <input
                  id="dealer_name"
                  className="field-input"
                  value={form.dealer_name}
                  onChange={(e) => set("dealer_name", e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="company_name">
                    Company / Shop
                  </label>
                  <input
                    id="company_name"
                    className="field-input"
                    value={form.company_name}
                    onChange={(e) => set("company_name", e.target.value)}
                    placeholder="Business name"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="phone">
                    Phone
                  </label>
                  <input
                    id="phone"
                    className="field-input"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+1 555 000 1234"
                  />
                </div>
              </div>
              <div>
                <label className="field-label" htmlFor="address">
                  Address
                </label>
                <textarea
                  id="address"
                  rows={2}
                  className="field-input resize-none"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Street, city, country"
                />
              </div>
            </>
          )}

          <div>
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="field-input"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="dealer@company.com"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="field-input"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {notice && <p className="text-sm text-success">{notice}</p>}

          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : mode === "login" ? (
              <LogIn className="size-4" />
            ) : (
              <UserPlus className="size-4" />
            )}
            {mode === "login" ? "Login" : "Create dealer account"}
          </button>
        </form>

        <button onClick={google} className="btn btn-ghost mt-3 w-full">
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? "New to the platform?" : "Already have an account?"}{" "}
          <button
            className="font-semibold text-primary hover:underline"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
              setNotice(null);
            }}
          >
            {mode === "login" ? "Register as Dealer" : "Login instead"}
          </button>
        </p>
      </div>
    </div>
  );
}
