import { useState } from "react";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import { Header, Card, Field, SectionLabel, SecondaryButton, ErrorText } from "../components/UI";
import { COLORS } from "../lib/identity";
import { THEMES, getStoredThemeId, applyTheme } from "../lib/themes";
import { checkForUpdate, hardRefresh } from "../lib/pwaUpdate";
import { CheckIcon } from "../components/Icons";

export default function Settings() {
  const { profile, usingFirebase, updateProfile, changePassword, signOut } = useApp();

  const [name, setName] = useState(profile.name);
  const [nameBusy, setNameBusy] = useState(false);
  const [nameNotice, setNameNotice] = useState("");

  const [colorBusy, setColorBusy] = useState(false);

  const [themeId, setThemeId] = useState(getStoredThemeId());

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwNotice, setPwNotice] = useState("");

  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateNotice, setUpdateNotice] = useState("");
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  async function saveName(e) {
    e.preventDefault();
    if (!name.trim() || name.trim() === profile.name) return;
    setNameBusy(true);
    setNameNotice("");
    try {
      await updateProfile({ name: name.trim() });
      setNameNotice("Saved.");
    } catch (err) {
      setNameNotice(err.message || "Couldn't save that.");
    } finally {
      setNameBusy(false);
    }
  }

  async function pickColor(color) {
    setColorBusy(true);
    try {
      await updateProfile({ color });
    } finally {
      setColorBusy(false);
    }
  }

  function pickTheme(id) {
    applyTheme(id);
    setThemeId(id);
  }

  async function checkNow() {
    setUpdateBusy(true);
    setUpdateNotice("");
    try {
      await checkForUpdate();
      // If a new version was found, the app reloads itself automatically
      // within a moment. If nothing happens, you're already current.
      setUpdateNotice("Checked — if there's an update, the app will refresh in a moment. If nothing happens, you're already on the latest version.");
    } finally {
      setUpdateBusy(false);
    }
  }

  async function doHardRefresh() {
    if (!resetConfirm) {
      setResetConfirm(true);
      return;
    }
    setResetBusy(true);
    await hardRefresh();
  }

  async function savePassword(e) {
    e.preventDefault();
    setPwError("");
    setPwNotice("");
    if (newPw.length < 6) return setPwError("New password needs at least 6 characters.");
    setPwBusy(true);
    try {
      await changePassword({ currentPassword: currentPw, newPassword: newPw });
      setPwNotice("Password updated.");
      setCurrentPw("");
      setNewPw("");
    } catch (err) {
      setPwError(err.message || "Couldn't update your password.");
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Header title="Settings" />

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
        <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar initials={profile.initials} color={profile.color} size={44} />
            <div>
              <div className="display" style={{ fontSize: 15, fontWeight: 700 }}>{profile.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--text-faint)" }}>{profile.email}</div>
            </div>
          </div>
          <form onSubmit={saveName} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="Display name" value={name} onChange={(e) => setName(e.target.value)} required />
            {nameNotice && <div style={{ fontSize: 12.5, color: nameNotice === "Saved." ? "var(--green-text)" : "var(--red-text)" }}>{nameNotice}</div>}
            <SecondaryButton type="submit" disabled={nameBusy || !name.trim() || name.trim() === profile.name}>
              {nameBusy ? "Saving…" : "Save name"}
            </SecondaryButton>
          </form>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionLabel>Avatar color</SectionLabel>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {COLORS.map((c, i) => {
              const on = profile.color?.bg === c.bg;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={colorBusy}
                  onClick={() => pickColor(c)}
                  style={{ background: "none", border: "none", padding: 0, position: "relative" }}
                >
                  <div style={{ width: 42, height: 42, borderRadius: 999, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: on ? "0 0 0 2px var(--text)" : "0 0 0 1px var(--border)" }}>
                    {on && <CheckIcon width={16} height={16} style={{ color: c.text }} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionLabel>App theme</SectionLabel>
          <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: -4 }}>
            Changes the whole look — fonts, shapes, shadows, and background, not just the accent color.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {THEMES.map((t) => {
              const on = t.id === themeId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickTheme(t.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "var(--card)",
                    border: on ? "2px solid var(--text)" : "var(--border-width, 1px) solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    padding: "10px 14px",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: t.tokens["--radius-sm"] || "9px",
                      background: t.tokens["--bg"],
                      border: `${t.tokens["--border-width"] || "1px"} solid ${t.tokens["--border"]}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontFamily: t.tokens["--font-display"], fontSize: 15, fontWeight: 700, color: t.swatch }}>Aa</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.name}</div>
                    {t.blurb && <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 1 }}>{t.blurb}</div>}
                  </div>
                  {on && <CheckIcon width={16} height={16} style={{ color: "var(--text)", flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionLabel>Password</SectionLabel>
          {usingFirebase ? (
            <form onSubmit={savePassword} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Field label="Current password" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required />
              <Field label="New password" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={6} />
              <ErrorText>{pwError}</ErrorText>
              {pwNotice && <div style={{ fontSize: 12.5, color: "var(--green-text)" }}>{pwNotice}</div>}
              <SecondaryButton type="submit" disabled={pwBusy}>{pwBusy ? "Saving…" : "Update password"}</SecondaryButton>
            </form>
          ) : (
            <div style={{ fontSize: 12.5, color: "var(--text-faint)" }}>
              Running in local demo mode — connect Firebase (see SETUP.md) to change a real password here.
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionLabel>App version</SectionLabel>
          <SecondaryButton onClick={checkNow} disabled={updateBusy}>{updateBusy ? "Checking…" : "Check for updates"}</SecondaryButton>
          {updateNotice && <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{updateNotice}</div>}

          <SecondaryButton tone={resetConfirm ? "red" : "neutral"} onClick={doHardRefresh} disabled={resetBusy}>
            {resetBusy ? "Refreshing…" : resetConfirm ? "Tap again to confirm — force refresh" : "Force refresh app"}
          </SecondaryButton>
          <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: -4 }}>
            {resetConfirm
              ? "This clears the app's cache and reloads it. It won't sign you out."
              : "Still looks out of date after Check for updates? This clears the app's cache and service worker, then reloads — for a stuck iPhone home-screen icon, this usually beats deleting and re-adding it."}
          </div>
        </div>

        <button onClick={signOut} style={{ alignSelf: "center", background: "none", border: "none", color: "var(--text-faint)", fontSize: 13, fontWeight: 600, padding: 12, marginTop: 8 }}>
          Log out
        </button>
      </div>
    </div>
  );
}
