"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  KeyRound,
  Upload,
  Check,
  Shield,
  Save,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MOCK_USERS } from "@/mocks/users";
import { useAuth } from "@/services/auth-context";
import { useSMSStore } from "@/context/sms-store";
import { apiClient } from "@/lib/api-client";

export default function ProfileSettingsPage() {
  const { user, completePasswordChange, updateUser } = useAuth();
  const { changePassword, updateTeacher } = useSMSStore();
  const currentUser = user || MOCK_USERS[0];

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = React.useState<string>(currentUser.photo || currentUser.photo_url || "");
  const [photoError, setPhotoError] = React.useState<string>("");
  const [photoSuccess, setPhotoSuccess] = React.useState<boolean>(false);

  React.useEffect(() => {
    const photo = currentUser.photo || currentUser.photo_url;
    if (photo) {
      setPhotoUrl(photo);
    }
  }, [currentUser.photo, currentUser.photo_url]);

  const [profile, setProfile] = React.useState({
    name: currentUser.name,
    email: currentUser.email,
    username: currentUser.username,
    phone: currentUser.phone || "+91 9811122334",
    address: currentUser.address || "A-14, Vasant Vihar, New Delhi",
  });

  const [passwords, setPasswords] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [profileSuccess, setProfileSuccess] = React.useState(false);
  const [passSuccess, setPassSuccess] = React.useState(false);
  const [passError, setPassError] = React.useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select a valid image (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setPhotoError("Image size must be less than 2MB.");
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoError("");

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await apiClient<{ success: boolean; data: any }>("/auth/profile", {
          method: "PUT",
          body: JSON.stringify({ photo_url: base64, photo: base64 }),
        });

        const savedUrl = res?.data?.photo_url || res?.data?.photo || base64;
        setPhotoUrl(savedUrl);
        updateUser({ photo: savedUrl, photo_url: savedUrl });
        setPhotoSuccess(true);
        setTimeout(() => setPhotoSuccess(false), 3000);
      } catch (err: any) {
        setPhotoError(err?.message || "Failed to persist profile photo.");
      } finally {
        setIsUploadingPhoto(false);
      }
    };
    reader.onerror = () => {
      setPhotoError("Failed to read image file.");
      setIsUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemovePhoto = async () => {
    try {
      await apiClient.put("/auth/profile", {
        photo_url: "",
        photo: "",
      });
      setPhotoUrl("");
      updateUser({ photo: "", photo_url: "" });
      setPhotoSuccess(true);
      setTimeout(() => setPhotoSuccess(false), 2000);
    } catch (err: any) {
      setPhotoError(err?.message || "Failed to remove photo.");
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.put("/auth/profile", {
        name: profile.name.trim(),
        phone: profile.phone?.trim(),
        address: profile.address?.trim(),
        email: profile.email?.trim(),
      });
    } catch {
      // offline fallback
    }
    updateUser({
      name: profile.name.trim(),
      email: profile.email.trim(),
      phone: profile.phone.trim(),
      address: profile.address.trim(),
    });
    if (currentUser?.id) {
      updateTeacher(currentUser.id, {
        name: profile.name.trim(),
        phone: profile.phone.trim(),
      });
    }
    setProfileSuccess(true);
    setTimeout(() => setProfileSuccess(false), 3000);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPassError("New passwords do not match.");
      return;
    }
    if (passwords.newPassword.length < 6) {
      setPassError("Password must be at least 6 characters.");
      return;
    }
    if (currentUser?.id) {
      changePassword(currentUser.id, passwords.newPassword);
      completePasswordChange(passwords.newPassword);
    }
    setPassError("");
    setPassSuccess(true);
    setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setTimeout(() => setPassSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Button asChild variant="ghost" size="sm" className="h-7 px-2">
              <Link href="/dashboard">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Dashboard
              </Link>
            </Button>
            <span>/</span>
            <span className="font-semibold text-purple-primary">Account Settings</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Personal Profile & Credentials
          </h1>
          <p className="text-xs text-text-secondary">
            Update your personal contact biodata and maintain portal authentication passwords.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Summary */}
        <div className="space-y-6">
          <Card className="border-border text-center">
            <CardContent className="pt-6 space-y-4">
              <Avatar className="h-24 w-24 mx-auto border-2 border-border shadow-sm overflow-hidden">
                {photoUrl ? (
                  <AvatarImage src={photoUrl} alt={currentUser.name} className="object-cover h-full w-full" />
                ) : null}
                <AvatarFallback className="text-2xl font-bold bg-purple-tint text-purple-primary">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div>
                <h3 className="font-bold text-sm text-foreground">{currentUser.name}</h3>
                <p className="text-xs text-text-secondary">{currentUser.email}</p>
                <Badge variant="info" className="mt-2 text-[10px] capitalize">
                  {currentUser.userType.replace("_", " ")}
                </Badge>
              </div>

              {photoSuccess && (
                <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-1.5 flex items-center justify-center gap-1">
                  <Check className="h-3 w-3 text-emerald-600" />
                  <span>Photo updated successfully!</span>
                </div>
              )}
              {photoError && (
                <div className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded p-1.5">
                  {photoError}
                </div>
              )}

              <div className="pt-2 border-t border-border/80 flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploadingPhoto}
                  className="w-full text-xs gap-1.5 cursor-pointer hover:border-purple-primary hover:text-purple-primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5 text-purple-primary" />
                  {isUploadingPhoto ? "Saving Photo..." : "Upload New Photo"}
                </Button>
                {photoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    onClick={handleRemovePhoto}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove Photo
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile Biodata Form */}
          <Card className="border-border shadow-sm">
            <form onSubmit={handleProfileSave}>
              <CardHeader className="pb-3 border-b border-border/80">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-purple-primary" />
                  Personal Biodata
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                {profileSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span>Personal information updated successfully!</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="pName">Full Legal Name</Label>
                    <Input
                      id="pName"
                      value={profile.name}
                      onChange={(e) =>
                        setProfile({ ...profile, name: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pEmail">Email Address</Label>
                    <Input
                      id="pEmail"
                      type="email"
                      value={profile.email}
                      onChange={(e) =>
                        setProfile({ ...profile, email: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pPhone">Contact Phone</Label>
                    <Input
                      id="pPhone"
                      value={profile.phone}
                      onChange={(e) =>
                        setProfile({ ...profile, phone: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="pAddress">Residential Address</Label>
                    <Input
                      id="pAddress"
                      value={profile.address}
                      onChange={(e) =>
                        setProfile({ ...profile, address: e.target.value })
                      }
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex justify-end border-t border-border p-4 bg-surface">
                <Button
                  type="submit"
                  size="sm"
                  className="gap-1.5 bg-purple-primary text-white hover:bg-purple-primary/90 text-xs"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Profile Changes
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Change Password Form */}
          <Card className="border-border shadow-sm">
            <form onSubmit={handlePasswordChange}>
              <CardHeader className="pb-3 border-b border-border/80">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-purple-primary" />
                  Self-Service Password Change
                </CardTitle>
                <CardDescription className="text-xs">
                  Ensure strong passwords containing numbers and special characters.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                {passSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span>Your password has been changed successfully!</span>
                  </div>
                )}

                {passError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                    {passError}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="curPass">Current Password *</Label>
                    <Input
                      id="curPass"
                      type="password"
                      required
                      value={passwords.currentPassword}
                      onChange={(e) =>
                        setPasswords({
                          ...passwords,
                          currentPassword: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="newPass">New Password *</Label>
                      <Input
                        id="newPass"
                        type="password"
                        required
                        value={passwords.newPassword}
                        onChange={(e) =>
                          setPasswords({
                            ...passwords,
                            newPassword: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="confPass">Confirm New Password *</Label>
                      <Input
                        id="confPass"
                        type="password"
                        required
                        value={passwords.confirmPassword}
                        onChange={(e) =>
                          setPasswords({
                            ...passwords,
                            confirmPassword: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex justify-end border-t border-border p-4 bg-surface">
                <Button
                  type="submit"
                  size="sm"
                  className="gap-1.5 bg-purple-primary text-white hover:bg-purple-primary/90 text-xs"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Update Password
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
