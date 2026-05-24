import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { useAuthSession } from "@/hooks/useAuthSession";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface AccountPanelProps {
  onClose: () => void;
}

export function AccountPanel({ onClose }: AccountPanelProps) {
  const auth = useAuthSession();
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  useEffect(() => {
    setAuthEmail(auth.user?.email ?? "");
    setAuthPassword("");
  }, [auth.user]);

  const welcomeName =
    auth.user?.fullName?.trim() || auth.user?.email || "operator";

  const handleAuthSubmit = async () => {
    setAuthSubmitting(true);
    try {
      if (authMode === "login") {
        const user = await auth.login(authEmail.trim(), authPassword);
        toast({
          title: "Signed in",
          description: `Welcome back, ${user.fullName || user.email}.`,
        });
      } else {
        const user = await auth.register(
          authEmail.trim(),
          authPassword,
          authFullName.trim(),
        );
        toast({
          title: "Account created",
          description: `Welcome, ${user.fullName || user.email}.`,
        });
      }
      setAuthPassword("");
      onClose();
    } catch (error) {
      toast({
        title: authMode === "login" ? "Sign in failed" : "Sign up failed",
        description:
          error instanceof Error
            ? error.message
            : "Authentication request failed.",
        variant: "destructive",
      });
    } finally {
      setAuthSubmitting(false);
    }
  };

  if (auth.isLoadingUser) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-6 text-sm text-muted-foreground">
        Loading current session...
      </div>
    );
  }

  if (auth.user) {
    return (
      <div className="space-y-4 rounded-lg border border-border bg-card/70 p-6 shadow-none backdrop-blur-sm">
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-200/70">
            Welcome
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-foreground">
            {welcomeName}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Signed in as {auth.user.email}
          </p>
        </div>
        <Button
          variant="outline"
          className="border-border bg-transparent text-foreground hover:bg-accent"
          onClick={() => {
            auth.logout();
            toast({
              title: "Signed out",
              description: "Your local operator session was cleared.",
            });
          }}
        >
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4 rounded-lg border border-border bg-card/70 p-5">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={authMode === "login" ? "default" : "outline"}
            className={cn(
              authMode !== "login" &&
                "border-border bg-transparent text-foreground hover:bg-accent",
            )}
            onClick={() => setAuthMode("login")}
          >
            Login
          </Button>
          <Button
            type="button"
            variant={authMode === "signup" ? "default" : "outline"}
            className={cn(
              authMode !== "signup" &&
                "border-border bg-transparent text-foreground hover:bg-accent",
            )}
            onClick={() => setAuthMode("signup")}
          >
            Sign Up
          </Button>
        </div>

        {authMode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="auth-full-name">Full name</Label>
            <Input
              id="auth-full-name"
              value={authFullName}
              onChange={(event) => setAuthFullName(event.target.value)}
              placeholder="Full Name"
              className="border-border bg-background"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="auth-email">Email</Label>
          <Input
            id="auth-email"
            type="email"
            value={authEmail}
            onChange={(event) => setAuthEmail(event.target.value)}
            placeholder="operator@example.com"
            className="border-border bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="auth-password">Password</Label>
          <Input
            id="auth-password"
            type="password"
            value={authPassword}
            onChange={(event) => setAuthPassword(event.target.value)}
            placeholder="At least 8 characters"
            className="border-border bg-background"
          />
        </div>

        <Button
          type="button"
          onClick={() => void handleAuthSubmit()}
          disabled={
            authSubmitting ||
            !authEmail.trim() ||
            !authPassword ||
            (authMode === "signup" && !authFullName.trim())
          }
        >
          {authSubmitting
            ? authMode === "login"
              ? "Signing In..."
              : "Creating Account..."
            : authMode === "login"
              ? "Login"
              : "Create Account"}
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-200/70">
          Why sign in
        </p>
        <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
          <li>Keep your operator identity available across sessions.</li>
          <li>Unlock security management from the same control dialog.</li>
          <li>Prepare the UI for future model and training ownership views.</li>
        </ul>
      </div>
    </div>
  );
}
