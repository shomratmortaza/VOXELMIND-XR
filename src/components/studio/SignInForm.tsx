import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Cloud, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import "@lovable.dev/cloud-auth-js/styles.css";

/** Current signed-in user, kept in sync with auth state changes. */
export function useSessionUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => { setUser(data.user); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  return { user, ready };
}

export type AuthMode = "signin" | "signup" | "reset" | "recover";

/** Shared email/password + Google/Lovable sign-in used by Account and AI prompts. */
export function SignInForm({ mode: initialMode = "signin", onSignedIn, beforeRedirect }: { mode?: AuthMode; onSignedIn?: () => void; beforeRedirect?: () => void }) {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  useEffect(() => setAuthMode(initialMode), [initialMode]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const running = useRef(false);
  const run = async (action: () => Promise<void>) => {
    if (running.current) return;
    running.current = true; setBusy(true); setError(""); setNotice("");
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); }
    finally { running.current = false; setBusy(false); }
  };
  const submit = () => run(async () => {
    if (authMode === "recover") {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setNotice("Password updated."); setPassword(""); setAuthMode("signin");
    } else if (authMode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/studio` });
      if (error) throw error;
      setNotice("Check your email for the password reset link.");
    } else if (authMode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/studio` } });
      if (error) throw error;
      if (data.session) { setPassword(""); onSignedIn?.(); }
      else setNotice("Check your email to confirm your account, then sign in here.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setPassword(""); onSignedIn?.();
    }
  });
  const social = (provider: "google" | "lovable") => run(async () => {
    beforeRedirect?.();
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/studio` });
    if (result.error) throw result.error;
    if (!result.redirected) onSignedIn?.();
  });
  return <div className="space-y-3">
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="text-sm text-accent">{notice}</p>}
    {authMode !== "recover" && <>
      <Button className="w-full" variant="outline" disabled={busy} onClick={() => void social("google")}>Continue with Google</Button>
      <Button className="lovable-auth-button w-full" disabled={busy} onClick={() => void social("lovable")}>Continue with Lovable</Button>
      <p className="label-mono text-center">or with email</p>
    </>}
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-3">
      {authMode !== "recover" && <label className="block text-sm">Email<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block h-10 w-full rounded border border-input bg-secondary px-3 text-base" /></label>}
      {authMode !== "reset" && <label className="block text-sm">Password<input type="password" required minLength={8} autoComplete={authMode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block h-10 w-full rounded border border-input bg-secondary px-3 text-base" /></label>}
      <Button className="w-full" variant="signal" disabled={busy} type="submit">{busy ? <Loader2 className="animate-spin" /> : <Cloud />}{authMode === "signup" ? "Create account" : authMode === "reset" ? "Send reset link" : authMode === "recover" ? "Update password" : "Sign in"}</Button>
    </form>
    {authMode !== "recover" && <div className="flex flex-wrap gap-1"><Button variant="link" size="sm" onClick={() => setAuthMode(authMode === "signup" ? "signin" : "signup")}>{authMode === "signup" ? "Already have an account?" : "Create an account"}</Button><Button variant="link" size="sm" onClick={() => setAuthMode(authMode === "reset" ? "signin" : "reset")}>{authMode === "reset" ? "Back to sign in" : "Forgot password?"}</Button></div>}
  </div>;
}
