import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useRobots } from "@/hooks/useRobots";
import { cn } from "@/lib/utils";
import { requestPasswordReset, resetPassword } from "@/services/authApi";
import {
  Activity,
  Bot,
  KeyRound,
  Package,
  RefreshCcw,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  ControlDeviceCard,
  ControlDeviceSkeleton,
  EmptyControlDeviceState,
  EmptyRobotState,
  RobotCard,
  RobotSkeleton,
} from "./RobotSkeleton";

interface RobotSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRobot?: string | null;
  initialController?: string | null;
  onConfirm: (robotId: string, controllerId: string) => void;
}

export function RobotSelectionDialog({
  open,
  onOpenChange,
  initialRobot,
  initialController,
  onConfirm,
}: RobotSelectionDialogProps) {
  const auth = useAuthSession();
  const [selectedRobot, setSelectedRobot] = useState<string | null>(
    initialRobot || null,
  );
  const [selectedControl, setSelectedControl] = useState<string | null>(
    initialController || null,
  );
  const [activeTab, setActiveTab] = useState<
    "account" | "robots" | "models" | "training" | "security"
  >("robots");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [securityEmail, setSecurityEmail] = useState("");
  const [securityResetToken, setSecurityResetToken] = useState("");
  const [securityNewPassword, setSecurityNewPassword] = useState("");
  const [issuedResetToken, setIssuedResetToken] = useState<string | null>(null);
  const [securitySubmitting, setSecuritySubmitting] = useState(false);

  const {
    robots,
    controlDevices,
    loading,
    loadingDevices,
    error: robotsError,
    deviceError,
    refreshRobots,
  } = useRobots(selectedRobot || "");

  // Sync initial values when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedRobot(initialRobot || null);
      setSelectedControl(initialController || null);
      setActiveTab(auth.user ? "robots" : "account");
      setAuthEmail(auth.user?.email ?? "");
      setAuthPassword("");
      setSecurityEmail(auth.user?.email ?? "");
      setSecurityNewPassword("");
      setSecurityResetToken("");
      setIssuedResetToken(null);
    }
  }, [open, initialRobot, initialController, auth.user]);

  const handleConfirm = () => {
    if (selectedRobot && selectedControl) {
      onConfirm(selectedRobot, selectedControl);
      onOpenChange(false);
    }
  };

  const canConfirm = selectedRobot && selectedControl;
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
      setActiveTab("robots");
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
        description: result.reset_token
          ? "A reset token was returned for this development environment."
          : result.message,
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

  const navItems = [
    {
      value: "account" as const,
      label: "Account",
      icon: UserRound,
      description: auth.user
        ? "Profile and session"
        : "Sign in or create account",
    },
    {
      value: "robots" as const,
      label: "Robots",
      icon: Bot,
      description: "Robot and controller selection",
    },
    {
      value: "models" as const,
      label: "Models",
      icon: Package,
      description: "Model library",
    },
    {
      value: "training" as const,
      label: "Active Training",
      icon: Activity,
      description: "Current jobs and status",
    },
    {
      value: "security" as const,
      label: "Security",
      icon: KeyRound,
      description: "Password reset, robot backend hash, and more",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl overflow-hidden border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_32%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.98))] p-0 text-slate-100">
        <DialogHeader className="border-b border-slate-800/80 px-6 py-5 text-left">
          <DialogTitle className="text-2xl font-semibold tracking-tight text-slate-50">
            Control Center
          </DialogTitle>
          <DialogDescription>
            Manage your operator account, robot session, and upcoming training
            tools from one place.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[78vh] flex-col md:flex-row">
          <aside className="border-b border-slate-800/80 bg-slate-950/30 p-4 md:w-72 md:border-b-0 md:border-r">
            <div className="mb-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">
                Operator Session
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {auth.user ? welcomeName : "Authentication required"}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {auth.user
                  ? "You are signed in and ready to manage devices."
                  : "Sign in to personalize your workspace and security settings."}
              </p>
            </div>
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setActiveTab(item.value)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                      isActive
                        ? "border-cyan-400/50 bg-cyan-400/10 text-white"
                        : "border-slate-800 bg-slate-950/20 text-slate-300 hover:border-slate-700 hover:bg-slate-900/70 hover:text-white",
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-slate-400">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[78vh]">
              <div className="space-y-6 p-6">
                {activeTab === "account" && (
                  <Card className="border-slate-800 bg-slate-950/35 text-slate-100 shadow-none">
                    <CardHeader>
                      <CardTitle className="text-xl text-slate-50">
                        Account
                      </CardTitle>
                      <CardDescription>
                        {auth.user
                          ? "Your operator identity for this browser session."
                          : "Sign in or create an operator account to continue."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {auth.isLoadingUser ? (
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
                          Loading current session...
                        </div>
                      ) : auth.user ? (
                        <div className="space-y-4">
                          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5">
                            <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/70">
                              Welcome
                            </p>
                            <h3 className="mt-2 text-2xl font-semibold text-white">
                              {welcomeName}
                            </h3>
                            <p className="mt-2 text-sm text-slate-200">
                              Signed in as {auth.user.email}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <Button onClick={() => setActiveTab("robots")}>
                              Go to Robots
                            </Button>
                            <Button
                              variant="outline"
                              className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800"
                              onClick={() => {
                                auth.logout();
                                setActiveTab("account");
                                toast({
                                  title: "Signed out",
                                  description:
                                    "Your local operator session was cleared.",
                                });
                              }}
                            >
                              Sign Out
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant={
                                  authMode === "login" ? "default" : "outline"
                                }
                                className={cn(
                                  authMode !== "login" &&
                                    "border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800",
                                )}
                                onClick={() => setAuthMode("login")}
                              >
                                Login
                              </Button>
                              <Button
                                type="button"
                                variant={
                                  authMode === "signup" ? "default" : "outline"
                                }
                                className={cn(
                                  authMode !== "signup" &&
                                    "border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800",
                                )}
                                onClick={() => setAuthMode("signup")}
                              >
                                Sign Up
                              </Button>
                            </div>

                            {authMode === "signup" && (
                              <div className="space-y-2">
                                <Label htmlFor="auth-full-name">
                                  Full name
                                </Label>
                                <Input
                                  id="auth-full-name"
                                  value={authFullName}
                                  onChange={(event) =>
                                    setAuthFullName(event.target.value)
                                  }
                                  placeholder="Full Name"
                                  className="border-slate-700 bg-slate-950/60"
                                />
                              </div>
                            )}

                            <div className="space-y-2">
                              <Label htmlFor="auth-email">Email</Label>
                              <Input
                                id="auth-email"
                                type="email"
                                value={authEmail}
                                onChange={(event) =>
                                  setAuthEmail(event.target.value)
                                }
                                placeholder="operator@example.com"
                                className="border-slate-700 bg-slate-950/60"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="auth-password">Password</Label>
                              <Input
                                id="auth-password"
                                type="password"
                                value={authPassword}
                                onChange={(event) =>
                                  setAuthPassword(event.target.value)
                                }
                                placeholder="At least 8 characters"
                                className="border-slate-700 bg-slate-950/60"
                              />
                            </div>

                            <div className="flex flex-wrap gap-3">
                              <Button
                                type="button"
                                onClick={() => void handleAuthSubmit()}
                                disabled={
                                  authSubmitting ||
                                  !authEmail.trim() ||
                                  !authPassword ||
                                  (authMode === "signup" &&
                                    !authFullName.trim())
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
                          </div>

                          <div className="rounded-2xl border border-slate-800 bg-slate-950/20 p-5">
                            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">
                              Why sign in
                            </p>
                            <ul className="mt-4 space-y-3 text-sm text-slate-300">
                              <li>
                                Keep your operator identity available across
                                sessions.
                              </li>
                              <li>
                                Unlock security management from the same control
                                dialog.
                              </li>
                              <li>
                                Prepare the UI for future model and training
                                ownership views.
                              </li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {activeTab === "robots" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-50">
                        Select Robot & Control Device
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        Choose a robot and control device to start your training
                        session.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-slate-100">
                            Select Robot
                          </h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-white"
                            onClick={() => refreshRobots()}
                            title="Refresh robots list"
                          >
                            <RefreshCcw className="h-4 w-4" />
                          </Button>
                        </div>
                        <ScrollArea className="h-[320px] rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
                          <div className="space-y-2 pr-4">
                            {loading ? (
                              <RobotSkeleton count={3} />
                            ) : robots.length > 0 ? (
                              robots.map((robot) => (
                                <RobotCard
                                  key={robot.id}
                                  robot={robot}
                                  selected={selectedRobot === robot.id}
                                  onClick={() => {
                                    setSelectedRobot(robot.id);
                                    setSelectedControl(null);
                                  }}
                                  size="compact"
                                />
                              ))
                            ) : (
                              <EmptyRobotState />
                            )}

                            {robotsError && (
                              <div className="rounded-xl border border-destructive bg-destructive/10 p-3 text-destructive">
                                <p className="text-sm font-medium">
                                  Error loading robots
                                </p>
                                <p className="mt-1 text-xs">{robotsError}</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-3 h-7 border-destructive bg-transparent text-destructive hover:bg-destructive/20"
                                  onClick={() => refreshRobots()}
                                >
                                  <RefreshCcw className="mr-1 h-3 w-3" /> Try
                                  Again
                                </Button>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-slate-100">
                            Select Control Device
                          </h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-white"
                            onClick={() => refreshRobots()}
                            title="Refresh control devices list"
                            disabled={!selectedRobot}
                          >
                            <RefreshCcw className="h-4 w-4" />
                          </Button>
                        </div>
                        <ScrollArea className="h-[320px] rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
                          <div className="space-y-2 pr-4">
                            {!selectedRobot ? (
                              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-slate-300">
                                <p className="text-sm font-medium">
                                  Please select a robot first to view available
                                  control devices.
                                </p>
                              </div>
                            ) : loadingDevices ? (
                              <ControlDeviceSkeleton count={3} />
                            ) : deviceError ? (
                              <div className="rounded-xl border border-destructive bg-destructive/10 p-3 text-destructive">
                                <p className="text-sm font-medium">
                                  Error loading control devices
                                </p>
                                <p className="mt-1 text-xs">{deviceError}</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-3 h-7 border-destructive bg-transparent text-destructive hover:bg-destructive/20"
                                  onClick={() => refreshRobots()}
                                >
                                  <RefreshCcw className="mr-1 h-3 w-3" /> Try
                                  Again
                                </Button>
                              </div>
                            ) : controlDevices.length > 0 ? (
                              controlDevices.map((device) => (
                                <ControlDeviceCard
                                  key={device.id}
                                  device={device}
                                  selected={selectedControl === device.id}
                                  onClick={() => setSelectedControl(device.id)}
                                  size="compact"
                                />
                              ))
                            ) : (
                              <EmptyControlDeviceState />
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3 border-t border-slate-800 pt-4">
                      <Button
                        variant="outline"
                        className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800"
                        onClick={() => onOpenChange(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleConfirm} disabled={!canConfirm}>
                        Start Training
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab === "models" && (
                  <Card className="border-slate-800 bg-slate-950/35 text-slate-100 shadow-none">
                    <CardHeader>
                      <CardTitle className="text-xl text-slate-50">
                        Models
                      </CardTitle>
                      <CardDescription>
                        Model management will live here once the backend APIs
                        are ready.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-10 text-center text-slate-400">
                        Coming soon
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeTab === "training" && (
                  <Card className="border-slate-800 bg-slate-950/35 text-slate-100 shadow-none">
                    <CardHeader>
                      <CardTitle className="text-xl text-slate-50">
                        Active Training
                      </CardTitle>
                      <CardDescription>
                        Live training jobs and status tracking will appear in
                        this panel.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-10 text-center text-slate-400">
                        Coming soon
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeTab === "security" && (
                  <Card className="border-slate-800 bg-slate-950/35 text-slate-100 shadow-none">
                    <CardHeader>
                      <CardTitle className="text-xl text-slate-50">
                        Security
                      </CardTitle>
                      <CardDescription>
                        Use the current reset-password flow to update your
                        password.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                        Remember password must be at least 8 characters long.
                      </div>

                      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                          <p className="text-sm font-medium text-slate-100">
                            1. Request reset token
                          </p>
                          <div className="space-y-2">
                            <Label htmlFor="security-email">
                              Account email
                            </Label>
                            <Input
                              id="security-email"
                              type="email"
                              value={securityEmail}
                              onChange={(event) =>
                                setSecurityEmail(event.target.value)
                              }
                              placeholder="operator@example.com"
                              className="border-slate-700 bg-slate-950/60"
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={() => void handleRequestReset()}
                            disabled={
                              securitySubmitting || !securityEmail.trim()
                            }
                          >
                            {securitySubmitting
                              ? "Requesting..."
                              : "Request Reset Token"}
                          </Button>
                        </div>

                        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                          <p className="text-sm font-medium text-slate-100">
                            2. Set new password
                          </p>

                          <div className="space-y-2">
                            <Label htmlFor="security-reset-token">
                              Reset token
                            </Label>
                            <Textarea
                              id="security-reset-token"
                              value={securityResetToken}
                              onChange={(event) =>
                                setSecurityResetToken(event.target.value)
                              }
                              placeholder="Paste the reset token here"
                              className="min-h-[120px] border-slate-700 bg-slate-950/60"
                            />
                          </div>

                          {issuedResetToken && (
                            <p className="text-xs text-cyan-200/80">
                              Development token received. It has been copied
                              into the reset token field automatically.
                            </p>
                          )}

                          <div className="space-y-2">
                            <Label htmlFor="security-new-password">
                              New password
                            </Label>
                            <Input
                              id="security-new-password"
                              type="password"
                              value={securityNewPassword}
                              onChange={(event) =>
                                setSecurityNewPassword(event.target.value)
                              }
                              placeholder="Enter a new password"
                              className="border-slate-700 bg-slate-950/60"
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
                            {securitySubmitting
                              ? "Updating..."
                              : "Change Password"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
