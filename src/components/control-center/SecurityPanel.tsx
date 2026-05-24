import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useAuthSession } from "@/hooks/useAuthSession";
import { requestPasswordReset, resetPassword } from "@/services/authApi";
import { useEffect, useState } from "react";

export function SecurityPanel() {
  const auth = useAuthSession();
  const [securityEmail, setSecurityEmail] = useState("");
  const [securityResetToken, setSecurityResetToken] = useState("");
  const [securityNewPassword, setSecurityNewPassword] = useState("");
  const [issuedResetToken, setIssuedResetToken] = useState<string | null>(null);
  const [securitySubmitting, setSecuritySubmitting] = useState(false);

  useEffect(() => {
    setSecurityEmail(auth.user?.email ?? "");
    setSecurityResetToken("");
    setSecurityNewPassword("");
    setIssuedResetToken(null);
  }, [auth.user]);

  const handleRequestReset = async () => {
    setSecuritySubmitting(true);
    try {
      const result = await requestPasswordReset(securityEmail.trim());
      if (result.reset_token) {
        setSecurityResetToken(result.reset_token);
        setIssuedResetToken(result.reset_token);
      } else {
        setIssuedResetToken(null);
      }
      toast({
        title: "Reset requested",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "Reset request failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to request reset token.",
        variant: "destructive",
      });
    } finally {
      setSecuritySubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    setSecuritySubmitting(true);
    try {
      await resetPassword({
        resetToken: securityResetToken.trim(),
        newPassword: securityNewPassword,
      });
      setSecurityNewPassword("");
      setIssuedResetToken(null);
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Password update failed",
        description:
          error instanceof Error ? error.message : "Failed to update password.",
        variant: "destructive",
      });
    } finally {
      setSecuritySubmitting(false);
    }
  };

  return (
    <div className="space-y-6 rounded-lg border border-border bg-card/70 p-6 shadow-none backdrop-blur-sm">
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-100">
        Remember password must be at least 8 characters long.
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4 rounded-lg border border-border bg-background/50 p-5">
          <p className="text-sm font-medium text-foreground">
            1. Request reset token
          </p>
          <div className="space-y-2">
            <Label htmlFor="security-email">Account email</Label>
            <Input
              id="security-email"
              type="email"
              value={securityEmail}
              onChange={(event) => setSecurityEmail(event.target.value)}
              placeholder="operator@example.com"
              className="border-border bg-background"
            />
          </div>
          <Button
            type="button"
            onClick={() => void handleRequestReset()}
            disabled={securitySubmitting || !securityEmail.trim()}
          >
            {securitySubmitting ? "Requesting..." : "Request Reset Token"}
          </Button>
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-background/50 p-5">
          <p className="text-sm font-medium text-foreground">
            2. Set new password
          </p>

          <div className="space-y-2">
            <Label htmlFor="security-reset-token">Reset token</Label>
            <Textarea
              id="security-reset-token"
              value={securityResetToken}
              onChange={(event) => setSecurityResetToken(event.target.value)}
              placeholder="Paste the reset token here"
              className="min-h-[120px] border-border bg-background"
            />
          </div>

          {issuedResetToken && (
            <p className="text-xs text-cyan-700 dark:text-cyan-200/80">
              Development token received. It has been copied into the reset
              token field automatically.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="security-new-password">New password</Label>
            <Input
              id="security-new-password"
              type="password"
              value={securityNewPassword}
              onChange={(event) => setSecurityNewPassword(event.target.value)}
              placeholder="Enter a new password"
              className="border-border bg-background"
            />
          </div>

          <Button
            type="button"
            onClick={() => void handlePasswordReset()}
            disabled={
              securitySubmitting ||
              !securityResetToken.trim() ||
              !securityNewPassword
            }
          >
            {securitySubmitting ? "Updating..." : "Change Password"}
          </Button>
        </div>
      </div>
    </div>
  );
}
