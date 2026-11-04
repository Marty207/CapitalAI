"use client";

/**
 * Settings — personal details, account, security, legal (grouped list layout).
 * Username, email, and password are view-only until the user taps Edit.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { uploadUserAvatar } from "@/lib/upload-avatar";
import {
  getAvatarUrl,
  getDisplayName,
  getInitials,
  getPhone,
  getUsername,
} from "@/lib/user-display";
import {
  btnPrimaryClass,
  btnSecondaryClass,
  pageTitleClass,
  sectionLabelClass,
  settingsDangerRowClass,
  settingsFieldClass,
  settingsFooterRowClass,
  settingsGroupClass,
  settingsLinkRowClass,
  settingsRowClass,
  settingsValueRowClass,
  successBannerClass,
} from "@/lib/ui";

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={settingsValueRowClass}>
      <span className="shrink-0 text-muted">{label}</span>
      <span className="truncate text-right font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}

/** Read-only avatar circle (view mode). */
function ProfileAvatar({ user, src }: { user: User; src: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-border"
      />
    );
  }
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent-muted text-lg font-semibold text-accent ring-2 ring-border">
      {getInitials(user)}
    </div>
  );
}

/**
 * Edit mode: tap the photo to open the device file picker (Settings personal details).
 */
function EditableProfileAvatar({
  user,
  src,
  busy,
  onPickFile,
}: {
  user: User;
  src: string;
  busy: boolean;
  onPickFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-center gap-2 sm:items-start">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onPickFile(file);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="group relative shrink-0 rounded-full outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
        aria-label="Choose profile picture"
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className="h-20 w-20 rounded-full object-cover ring-2 ring-border transition group-hover:ring-accent/50"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-muted text-xl font-semibold text-accent ring-2 ring-border transition group-hover:ring-accent/50">
            {getInitials(user)}
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          {busy ? "Uploading…" : "Add photo"}
        </span>
      </button>
      <p className="text-center text-xs text-muted sm:text-left">
        {busy ? "Uploading photo…" : "Tap photo to choose from your device"}
      </p>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const {
    user,
    signOut,
    updatePersonalDetails,
    updatePassword,
    sendPasswordResetEmail,
  } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);

  const [personalMessage, setPersonalMessage] = useState<string | null>(null);
  const [personalError, setPersonalError] = useState<string | null>(null);
  const [personalBusy, setPersonalBusy] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [resetSent, setResetSent] = useState<string | null>(null);

  const [accountError, setAccountError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [avatarUploadBusy, setAvatarUploadBusy] = useState(false);

  const syncFromUser = useCallback(() => {
    if (!user) return;
    setDisplayName(getDisplayName(user));
    setUsername(getUsername(user));
    setEmail(user.email ?? "");
    setPhone(getPhone(user));
    setAvatarUrl(getAvatarUrl(user));
  }, [user]);

  useEffect(() => {
    syncFromUser();
  }, [syncFromUser]);

  if (!user) {
    return null;
  }

  function cancelPersonalEdit() {
    syncFromUser();
    setEditingPersonal(false);
    setPersonalError(null);
    setPersonalMessage(null);
    setAvatarUploadBusy(false);
  }

  async function handleAvatarFile(file: File) {
    if (!user) return;
    setPersonalError(null);
    setPersonalMessage(null);
    setAvatarUploadBusy(true);
    const { url, error } = await uploadUserAvatar(user.id, file);
    if (error) {
      setAvatarUploadBusy(false);
      setPersonalError(error);
      return;
    }
    if (!url) {
      setAvatarUploadBusy(false);
      return;
    }
    setAvatarUrl(url);
    // Persist to Supabase Auth metadata so the header avatar updates right away.
    const { error: saveError } = await updatePersonalDetails({
      displayName,
      username,
      email,
      phone,
      avatarUrl: url,
    });
    setAvatarUploadBusy(false);
    if (saveError) {
      setPersonalError(saveError.message);
      return;
    }
    setPersonalMessage("Profile photo updated. Tap Save if you changed other fields.");
  }

  function cancelPasswordEdit() {
    setNewPassword("");
    setConfirmPassword("");
    setEditingPassword(false);
    setPasswordError(null);
    setPasswordMessage(null);
    setResetSent(null);
  }

  async function handlePersonalSubmit(e: FormEvent) {
    e.preventDefault();
    setPersonalError(null);
    setPersonalMessage(null);
    setPersonalBusy(true);
    const { error } = await updatePersonalDetails({
      displayName,
      username,
      email,
      phone,
      avatarUrl,
    });
    setPersonalBusy(false);
    if (error) {
      setPersonalError(error.message);
      return;
    }
    setPersonalMessage("Personal details saved.");
    setEditingPersonal(false);
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);
    if (newPassword.length < 4) {
      setPasswordError("Use at least 4 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match.");
      return;
    }
    setPasswordBusy(true);
    const { error } = await updatePassword(newPassword);
    setPasswordBusy(false);
    if (error) {
      setPasswordError(error.message);
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("Password updated.");
    setEditingPassword(false);
  }

  async function handleResetEmail() {
    setResetSent(null);
    const { error } = await sendPasswordResetEmail();
    if (error) {
      setPasswordError(error.message);
      return;
    }
    setResetSent("Reset link sent to your email.");
  }

  async function handleLogout() {
    const confirmed = window.confirm("Are you sure you want to log out?");
    if (!confirmed) return;
    await signOut();
    router.replace("/login");
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete your account? Your goals, linked banks, and other data will be removed. This cannot be undone."
    );
    if (!confirmed) return;

    setAccountError(null);
    setDeleteBusy(true);
    try {
      await api.deleteAccount();
      await signOut();
      router.replace("/login");
    } catch (e) {
      setAccountError(
        e instanceof Error
          ? e.message
          : "Could not delete account. Is the backend running with a service role key?"
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  const avatarSrc = avatarUrl.trim() || getAvatarUrl(user);
  const viewDisplayName = getDisplayName(user);
  const viewUsername = getUsername(user);
  const viewEmail = user.email ?? "";
  const viewPhone = getPhone(user);

  return (
    <div className="mx-auto max-w-lg space-y-10 pb-8">
      <header>
        <h1 className={pageTitleClass}>Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Profile, security, and account preferences.
        </p>
      </header>

      {/* Personal details — view until Edit */}
      <section className="space-y-2">
        <h2 className={sectionLabelClass}>Personal details</h2>
        {!editingPersonal ? (
          <div className={settingsGroupClass}>
            <div className={`${settingsRowClass} flex items-center gap-4`}>
              <ProfileAvatar user={user} src={avatarSrc} />
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-foreground">{viewDisplayName}</p>
                <p className="truncate text-sm text-muted">@{viewUsername}</p>
              </div>
            </div>
            <ValueRow label="Full name" value={viewDisplayName} />
            <ValueRow label="Username" value={viewUsername} />
            <ValueRow label="Email" value={viewEmail} />
            <ValueRow label="Phone" value={viewPhone} />
            <div className={settingsFooterRowClass}>
              <p className="text-xs text-muted">Tap Edit to change profile fields.</p>
              <button
                type="button"
                onClick={() => {
                  syncFromUser();
                  setEditingPersonal(true);
                  setPersonalMessage(null);
                  setPersonalError(null);
                }}
                className={`${btnPrimaryClass} w-full sm:w-auto`}
              >
                Edit
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePersonalSubmit}>
            <div className={settingsGroupClass}>
              <div className={`${settingsRowClass} flex justify-center sm:justify-start`}>
                <EditableProfileAvatar
                  user={user}
                  src={avatarSrc}
                  busy={avatarUploadBusy}
                  onPickFile={handleAvatarFile}
                />
              </div>
              <div className={settingsRowClass}>
                <label className="block text-xs font-medium text-muted">Full name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={settingsFieldClass}
                  autoComplete="name"
                />
              </div>
              <div className={settingsRowClass}>
                <label className="block text-xs font-medium text-muted">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={settingsFieldClass}
                  autoComplete="username"
                />
              </div>
              <div className={settingsRowClass}>
                <label className="block text-xs font-medium text-muted">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={settingsFieldClass}
                  autoComplete="email"
                />
              </div>
              <div className={settingsRowClass}>
                <label className="block text-xs font-medium text-muted">Phone number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={settingsFieldClass}
                  autoComplete="tel"
                  placeholder="+1 555 000 0000"
                />
              </div>
              <div className={settingsFooterRowClass}>
                <p className="text-xs text-muted">Email changes may require confirmation.</p>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <button
                    type="button"
                    onClick={cancelPersonalEdit}
                    className={`${btnSecondaryClass} w-full sm:w-auto`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={personalBusy}
                    className={`${btnPrimaryClass} w-full sm:w-auto`}
                  >
                    {personalBusy ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </div>
            {personalError ? <p className="mt-3 text-sm text-danger">{personalError}</p> : null}
            {personalMessage ? (
              <p className={`${successBannerClass} mt-3`}>{personalMessage}</p>
            ) : null}
          </form>
        )}
      </section>

      {/* Security — password hidden until Edit */}
      <section id="password" className="scroll-mt-24 space-y-2">
        <h2 className={sectionLabelClass}>Security & authentication</h2>
        {!editingPassword ? (
          <div className={settingsGroupClass}>
            <ValueRow label="Password" value="••••••••" />
            <div className={settingsFooterRowClass}>
              <button
                type="button"
                onClick={handleResetEmail}
                className={`${btnSecondaryClass} w-full sm:w-auto`}
              >
                Email reset link
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingPassword(true);
                  setPasswordError(null);
                  setPasswordMessage(null);
                }}
                className={`${btnPrimaryClass} w-full sm:w-auto`}
              >
                Edit
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePasswordSubmit}>
            <div className={settingsGroupClass}>
              <div className={settingsRowClass}>
                <label className="block text-xs font-medium text-muted">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={settingsFieldClass}
                  autoComplete="new-password"
                />
              </div>
              <div className={settingsRowClass}>
                <label className="block text-xs font-medium text-muted">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={settingsFieldClass}
                  autoComplete="new-password"
                />
              </div>
              <div className={settingsFooterRowClass}>
                <button
                  type="button"
                  onClick={handleResetEmail}
                  className={`${btnSecondaryClass} w-full sm:w-auto`}
                >
                  Email reset link
                </button>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <button
                    type="button"
                    onClick={cancelPasswordEdit}
                    className={`${btnSecondaryClass} w-full sm:w-auto`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordBusy}
                    className={`${btnPrimaryClass} w-full sm:w-auto`}
                  >
                    {passwordBusy ? "Updating…" : "Save password"}
                  </button>
                </div>
              </div>
            </div>
            {passwordError ? <p className="mt-3 text-sm text-danger">{passwordError}</p> : null}
            {passwordMessage ? (
              <p className={`${successBannerClass} mt-3`}>{passwordMessage}</p>
            ) : null}
            {resetSent ? <p className={`${successBannerClass} mt-3`}>{resetSent}</p> : null}
          </form>
        )}
        {!editingPassword && resetSent ? (
          <p className={`${successBannerClass} mt-3`}>{resetSent}</p>
        ) : null}
        {!editingPassword && passwordError ? (
          <p className="mt-3 text-sm text-danger">{passwordError}</p>
        ) : null}
      </section>

      {/* Legal */}
      <section className="space-y-2">
        <h2 className={sectionLabelClass}>Legal</h2>
        <div className={settingsGroupClass}>
          <Link href="/legal/terms" className={settingsLinkRowClass}>
            Terms of Service
            <span className="text-muted">→</span>
          </Link>
          <Link href="/legal/privacy" className={settingsLinkRowClass}>
            Privacy Policy
            <span className="text-muted">→</span>
          </Link>
        </div>
      </section>

      {/* Account — delete above log out at bottom */}
      <section className="space-y-2 pt-2">
        <h2 className={sectionLabelClass}>Account</h2>
        <div className={settingsGroupClass}>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleteBusy}
            className={settingsDangerRowClass}
          >
            {deleteBusy ? "Deleting…" : "Delete account permanently"}
            <span>→</span>
          </button>
          <button type="button" onClick={handleLogout} className={settingsLinkRowClass}>
            Log out
            <span className="text-muted">→</span>
          </button>
        </div>
        {accountError ? <p className="mt-3 text-sm text-danger">{accountError}</p> : null}
      </section>
    </div>
  );
}
