import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { useAuthSession } from "@/hooks/useAuthSession";
import { cn } from "@/lib/utils";
import {
  changePassword,
  requestPasswordOtp,
  resetPasswordWithOtp,
} from "@/services/authApi";
import { useEffect, useState } from "react";

interface AccountPanelProps {
  onClose: () => void;
}

export function AccountPanel({ onClose }: AccountPanelProps) {
  const auth = useAuthSession();
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot">(
    "login",
  );
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  useEffect(() => {
    setAuthEmail(auth.user?.email ?? "");
    setAuthPassword("");
    setResetOtp("");
    setResetNewPassword("");
    setResetConfirmPassword("");
    setResetOtpSent(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
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

  const handleRequestPasswordOtp = async () => {
    setResetSubmitting(true);
    try {
      const result = await requestPasswordOtp(authEmail.trim());
      setResetOtpSent(true);
      toast({
        title: "OTP sent",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "OTP request failed",
        description:
          error instanceof Error ? error.message : "Failed to send OTP.",
        variant: "destructive",
      });
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (resetOtp.length !== 6 || !/^\d{6}$/.test(resetOtp)) {
      toast({
        title: "Invalid OTP",
        description: "Enter the 6-digit OTP from your email.",
        variant: "destructive",
      });
      return;
    }

    if (resetNewPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "New password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Confirm password must match the new password.",
        variant: "destructive",
      });
      return;
    }

    setResetSubmitting(true);
    try {
      await resetPasswordWithOtp({
        email: authEmail.trim(),
        otp: resetOtp,
        newPassword: resetNewPassword,
      });
      setAuthMode("login");
      setAuthPassword("");
      setResetOtp("");
      setResetNewPassword("");
      setResetConfirmPassword("");
      setResetOtpSent(false);
      toast({
        title: "Password reset",
        description: "Your password has been updated. You can log in now.",
      });
    } catch (error) {
      toast({
        title: "Password reset failed",
        description:
          error instanceof Error ? error.message : "Failed to reset password.",
        variant: "destructive",
      });
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "New password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Passwords do not match",
        description: "Confirm password must match the new password.",
        variant: "destructive",
      });
      return;
    }

    setPasswordSubmitting(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Password change failed",
        description:
          error instanceof Error ? error.message : "Failed to change password.",
        variant: "destructive",
      });
    } finally {
      setPasswordSubmitting(false);
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

        <div className="space-y-4 rounded-lg border border-border bg-background/50 p-5">
          <p className="text-sm font-medium text-foreground">Change Password</p>

          <div className="space-y-2">
            <Label htmlFor="account-current-password">Current password</Label>
            <Input
              id="account-current-password"
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="border-border bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-new-password">New password</Label>
            <Input
              id="account-new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="At least 8 characters"
              className="border-border bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-confirm-new-password">
              Confirm new password
            </Label>
            <Input
              id="account-confirm-new-password"
              type="password"
              placeholder="At least 8 characters"
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              className="border-border bg-background"
            />
          </div>

          <Button
            type="button"
            onClick={() => void handleChangePassword()}
            disabled={
              passwordSubmitting ||
              !currentPassword ||
              !newPassword ||
              !confirmNewPassword
            }
          >
            {passwordSubmitting ? "Changing..." : "Change Password"}
          </Button>
        </div>
      </div>
    );
  }

  return (
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

      {authMode === "forgot" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              value={authEmail}
              onChange={(event) => setAuthEmail(event.target.value)}
              placeholder="operator@example.com"
              className="border-border bg-background"
            />
          </div>

          <Button
            type="button"
            onClick={() => void handleRequestPasswordOtp()}
            disabled={resetSubmitting || !authEmail.trim()}
          >
            {resetSubmitting && !resetOtpSent ? "Sending..." : "Send OTP"}
          </Button>

          {resetOtpSent && (
            <>
              <div className="space-y-2">
                <Label htmlFor="reset-otp">6-digit OTP</Label>
                <Input
                  id="reset-otp"
                  value={resetOtp}
                  onChange={(event) =>
                    setResetOtp(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  className="border-border bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reset-new-password">New password</Label>
                <Input
                  id="reset-new-password"
                  type="password"
                  value={resetNewPassword}
                  onChange={(event) => setResetNewPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  className="border-border bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reset-confirm-password">
                  Confirm new password
                </Label>
                <Input
                  id="reset-confirm-password"
                  type="password"
                  value={resetConfirmPassword}
                  onChange={(event) =>
                    setResetConfirmPassword(event.target.value)
                  }
                  className="border-border bg-background"
                />
              </div>

              <Button
                type="button"
                onClick={() => void handleResetPassword()}
                disabled={
                  resetSubmitting ||
                  !authEmail.trim() ||
                  resetOtp.length !== 6 ||
                  !resetNewPassword ||
                  !resetConfirmPassword
                }
              >
                {resetSubmitting ? "Resetting..." : "Reset Password"}
              </Button>
            </>
          )}

          <Button
            type="button"
            variant="ghost"
            className="w-fit px-0 text-primary hover:bg-transparent hover:text-primary/80"
            onClick={() => setAuthMode("login")}
          >
            Back to login
          </Button>
        </>
      ) : (
        <>
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
          </Button>{" "}
          {authMode === "login" && (
            <Button
              type="button"
              variant="ghost"
              className="w-fit px-0 text-primary hover:bg-transparent hover:text-primary/80"
              onClick={() => {
                setAuthMode("forgot");
                setResetOtp("");
                setResetNewPassword("");
                setResetConfirmPassword("");
                setResetOtpSent(false);
              }}
            >
              Forgot password?
            </Button>
          )}
        </>
      )}
    </div>
  );
}
