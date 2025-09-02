"use client";

import { useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { FirebaseService } from "@/lib/firebase-service";
import { LocalStorage } from "@/lib/storage";

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  User,
  Trash2,
  Download,
  RotateCcw,
  Shield,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import {
  updateProfile,
  deleteUser,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";

export function AccountManagement() {
  const [user, loading] = useAuthState(auth);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isResettingProgress, setIsResettingProgress] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isExportingData, setIsExportingData] = useState(false);
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">
          Loading account information...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">
          Please log in to manage your account.
        </div>
      </div>
    );
  }

  const handleUpdateProfile = async () => {
    if (!user) return;

    setIsUpdatingProfile(true);
    try {
      await updateProfile(user, {
        displayName: displayName.trim() || null,
      });

      // Update Firebase user profile
      await FirebaseService.saveUserProfile(user);

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        title: "Update failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user || !user.email) return;

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both password fields match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast({
        title: "Password changed",
        description: "Your password has been changed successfully.",
      });
    } catch (error: any) {
      console.error("Password change error:", error);
      let errorMessage = "Failed to change password. Please try again.";

      if (error.code === "auth/wrong-password") {
        errorMessage = "Current password is incorrect.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "New password is too weak.";
      }

      toast({
        title: "Password change failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleExportData = async () => {
    if (!user) return;

    setIsExportingData(true);
    try {
      const data = await FirebaseService.exportUserData(user);

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pomouno-data-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data exported",
        description: "Your data has been exported successfully.",
      });
    } catch (error) {
      console.error("Data export error:", error);
      toast({
        title: "Export failed",
        description: "Failed to export your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExportingData(false);
    }
  };

  const handleResetProgress = async () => {
    if (!user) return;

    // Enhanced confirmation dialog
    const confirmed = confirm(
      "⚠️ WARNING: This will permanently delete ALL your progress data including:\n\n" +
        "• All Pomodoro sessions and statistics\n" +
        "• All tasks and projects\n" +
        "• All productivity streaks and achievements\n" +
        "• All break reminders and completions\n" +
        "• All settings (except account info)\n\n" +
        "This action CANNOT be undone!\n\n" +
        "Are you absolutely sure you want to continue?"
    );

    if (!confirmed) return;

    const doubleConfirmed = confirm(
      "🚨 FINAL WARNING 🚨\n\n" +
        "You are about to permanently delete your entire productivity history.\n" +
        "This includes all your hard-earned progress and achievements.\n\n" +
        'Type "DELETE MY PROGRESS" in the next prompt to confirm.'
    );

    if (!doubleConfirmed) return;

    const finalConfirmation = prompt(
      'Type "DELETE MY PROGRESS" (exactly as shown) to confirm:'
    );

    if (finalConfirmation !== "DELETE MY PROGRESS") {
      toast({
        title: "Reset cancelled",
        description: "Your progress is safe. Reset was cancelled.",
      });
      return;
    }

    setIsResettingProgress(true);
    try {
      console.log("🗑️ Starting comprehensive progress reset...");

      // Reset Firebase data first
      console.log("🔥 Resetting Firebase data...");
      await FirebaseService.resetUserProgress(user);

      // Reset local data
      console.log("💾 Resetting local storage data...");
      LocalStorage.resetAllData();

      // Clear any cached data
      console.log("🧹 Clearing cached data...");
      if (typeof window !== "undefined") {
        // Clear any other cached data
        sessionStorage.clear();

        // Clear specific cache keys that might exist
        const cacheKeys = [
          "pomouono_today_sessions",
          "pomouono_all_sessions",
          "pomouono_tasks",
          "pomouono_daily_stats",
          "pomouono_break_reminders",
          "pomouono_break_reminder_completions",
          "pomouono_task_categories",
          "pomouono_break_reminder_categories",
        ];

        cacheKeys.forEach((key) => {
          localStorage.removeItem(key);
        });
      }

      toast({
        title: "✅ Progress reset complete",
        description:
          "All your progress has been permanently deleted. Starting fresh!",
      });

      console.log("✅ Progress reset completed successfully");

      // Refresh the page to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("❌ Progress reset error:", error);
      toast({
        title: "Reset failed",
        description: `Failed to reset your progress: ${
          error instanceof Error ? error.message : "Unknown error"
        }. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsResettingProgress(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeletingAccount(true);
    try {
      // Delete all user data from Firebase
      await FirebaseService.deleteUserData(user);

      // Delete the user account
      await deleteUser(user);

      // Clear local data
      LocalStorage.resetAllData();

      toast({
        title: "Account deleted",
        description:
          "Your account and all data have been deleted successfully.",
      });
    } catch (error: any) {
      console.error("Account deletion error:", error);
      let errorMessage = "Failed to delete account. Please try again.";

      if (error.code === "auth/requires-recent-login") {
        errorMessage =
          "Please log out and log back in, then try deleting your account again.";
      }

      toast({
        title: "Deletion failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back to Home Button */}
      <div className="flex justify-start">
        <Button
          onClick={() => (window.location.href = "/")}
          variant="outline"
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 dark:bg-gray-800/30 dark:hover:bg-gray-700/40 backdrop-blur-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>
      </div>

      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2 text-foreground">
          <User className="w-8 h-8 text-red-600 dark:text-red-400" />
          Account Management
        </h1>
        <p className="text-muted-foreground text-lg">
          Manage your account settings, data, and privacy preferences.
        </p>
      </div>

      {/* Profile Information */}
      <Card className="p-6 bg-white dark:bg-gray-900/20 shadow-lg border-0 ring-1 ring-gray-200/20 dark:ring-gray-700/20">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Profile Information
          </h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed
              </p>
            </div>

            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
              />
            </div>

            <Button
              onClick={handleUpdateProfile}
              disabled={isUpdatingProfile}
              className="w-full sm:w-auto"
            >
              {isUpdatingProfile ? "Updating..." : "Update Profile"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Change Password */}
      <Card className="p-6 bg-white dark:bg-gray-900/20 shadow-lg border-0 ring-1 ring-gray-200/20 dark:ring-gray-700/20">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Change Password
          </h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
              />
            </div>

            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
              />
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={
                isChangingPassword ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
              className="w-full sm:w-auto"
            >
              {isChangingPassword ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Data Management */}
      <Card className="p-6 bg-white dark:bg-gray-900/20 shadow-lg border-0 ring-1 ring-gray-200/20 dark:ring-gray-700/20">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Data Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Export, reset, or delete your data. These actions cannot be undone.
          </p>

          <div className="space-y-3">
            <Button
              onClick={handleExportData}
              disabled={isExportingData}
              variant="outline"
              className="w-full justify-start"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExportingData ? "Exporting..." : "Export My Data"}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset All Progress
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Reset All Progress
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your sessions, tasks,
                    statistics, and settings. Your account will remain active
                    but all progress will be lost. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleResetProgress}
                    disabled={isResettingProgress}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isResettingProgress ? "Resetting..." : "Reset Progress"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 bg-white dark:bg-gray-900/20 shadow-lg border-0 ring-1 ring-red-200/50 dark:ring-red-700/50">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Danger Zone
          </h2>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data.
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full justify-start">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Delete Account
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account and all associated
                  data including:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>All your pomodoro sessions and statistics</li>
                    <li>All your tasks and progress</li>
                    <li>All your settings and preferences</li>
                    <li>Your user profile and account</li>
                  </ul>
                  <strong className="block mt-3 text-red-600">
                    This action cannot be undone.
                  </strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeletingAccount ? "Deleting..." : "Delete Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>
    </div>
  );
}
