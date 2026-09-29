import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { defaultUsername, firebaseLogout, performSync, useApp } from '@cutepad/core';
import { Ic, Modal } from '@cutepad/ui';
import { REMEMBER_LOGIN_KEY, useHashRoute } from '../hooks';
import { useT } from '../i18n';
import '../views/AccountView.css';

interface AvatarUser {
  name?: string;
  email?: string;
  avatar?: string | null;
}

/** initial-letter circle that matches the existing account-card style; shows the photo when set */
export function ProfileAvatar({ user, size = 38, className }: { user?: AvatarUser | null; size?: number; className?: string }) {
  const initial = (user?.name || user?.email || '?').slice(0, 1).toUpperCase();
  return (
    <span
      className={className ? `acct-avatar ${className}` : 'acct-avatar'}
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {user?.avatar ? <img src={user.avatar} alt="" /> : initial}
    </span>
  );
}

/** @handle shown on the profile — custom username, falling back to the email prefix */
export function handleFor(user: { email: string; username?: string } | null | undefined): string {
  if (!user) return '';
  return user.username || defaultUsername(user.email);
}

/** the logout sequence shared by the account page + topbar menu (consent-aware sync first) */
export async function runAccountLogout(): Promise<void> {
  const s = useApp.getState();
  if (s.settings.legal.sync) await performSync();
  await firebaseLogout();
  localStorage.removeItem(REMEMBER_LOGIN_KEY);
  useApp.getState().resetAll();
}

export function TopbarAccountMenu() {
  const [, navigate] = useHashRoute();
  const t = useT();
  const auth = useApp((s) => s.auth);
  const syncConsent = useApp((s) => s.settings.legal.sync);
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutErr, setLogoutErr] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const user = auth.isLoggedIn ? auth.user : null;
  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };
  const doLogout = async () => {
    setLoggingOut(true);
    setLogoutErr(null);
    try {
      await runAccountLogout();
      setLogoutOpen(false);
    } catch (err) {
      setLogoutErr(err instanceof Error ? err.message : 'logout failed');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="acct-wrap" ref={ref}>
      <button
        type="button"
        className="acct-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={user ? `${user.name} — account menu` : `${t('account.menuLocal')} — account menu`}
        title={user ? `${user.name} · @${handleFor(user)}` : t('account.menuLocal')}
        onClick={() => setOpen((o) => !o)}
      >
        <ProfileAvatar user={user} size={34} />
      </button>
      {open && (
        <div className="acct-menu card" role="menu">
          <button type="button" className="acct-menu-head" role="menuitem" onClick={() => go('/account')}>
            <ProfileAvatar user={user} size={40} />
            <span style={{ minWidth: 0 }}>
              <span className="small bold" style={{ display: 'block' }}>
                {user ? user.name : t('account.menuLocal')}
              </span>
              <span className="small muted" style={{ display: 'block', wordBreak: 'break-all' }}>
                {user ? `@${handleFor(user)}` : t('account.sideLocal')}
              </span>
            </span>
          </button>
          <div className="divider" />
          {user ? (
            <>
              <button type="button" className="acct-menu-item" role="menuitem" onClick={() => go('/account')}>
                <Ic name="user" size={16} className="inline-icon" /> {t('account.menuProfile')}
              </button>
              <button type="button" className="acct-menu-item" role="menuitem" onClick={() => go('/settings')}>
                <Ic name="settings" size={16} className="inline-icon" /> {t('account.menuSettings')}
              </button>
              <div className="divider" />
              <button
                type="button"
                className="acct-menu-item acct-danger"
                role="menuitem"
                disabled={loggingOut}
                onClick={() => {
                  setOpen(false);
                  setLogoutErr(null);
                  setLogoutOpen(true);
                }}
              >
                <Ic name="logout" size={16} className="inline-icon" />{' '}
                {loggingOut ? t('account.loggingOut') : t('account.logout')}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="acct-menu-item" role="menuitem" onClick={() => go('/login')}>
                <Ic name="key" size={16} className="inline-icon" /> {t('account.logIn')}
              </button>
              <button type="button" className="acct-menu-item" role="menuitem" onClick={() => go('/signup')}>
                <Ic name="sparkles" size={16} className="inline-icon" /> {t('account.createAccount')}
              </button>
            </>
          )}
        </div>
      )}

      {/* portaled: the topbar's backdrop-filter would otherwise trap the fixed modal backdrop */}
      {createPortal(
        <Modal
          open={logoutOpen}
          title={t('account.logoutTitle')}
          onClose={() => setLogoutOpen(false)}
          actions={
            <>
              <button type="button" className="btn btn-soft" disabled={loggingOut} onClick={() => setLogoutOpen(false)}>
                {t('account.logoutStay')}
              </button>
              <button type="button" className="btn btn-danger" disabled={loggingOut} onClick={() => void doLogout()}>
                {loggingOut ? t('account.loggingOut') : t('account.logout')}
              </button>
            </>
          }
        >
          <div className="stack" style={{ gap: 10 }}>
            <p style={{ margin: 0 }}>{syncConsent ? t('account.logoutBodySync') : t('account.logoutBodyLocal')}</p>
            {logoutErr && (
              <div className="form-error" role="alert">
                {logoutErr}
              </div>
            )}
          </div>
        </Modal>,
        document.body,
      )}
    </div>
  );
}

/** slim account bar at the bottom of the sidebar — one click to the profile */
export function SidebarAccount() {
  const [, navigate] = useHashRoute();
  const t = useT();
  const auth = useApp((s) => s.auth);
  const user = auth.isLoggedIn ? auth.user : null;

  return (
    <button
      type="button"
      className="sidebar-account"
      onClick={() => navigate('/account')}
      title={user ? `${user.name} · ${user.email}` : t('account.sideLocal')}
      aria-label={user ? `Open profile of ${user.name}` : 'Open account page'}
    >
      <ProfileAvatar user={user} size={30} />
      <span className="acct-side-text">
        <span className="small bold">{user ? user.name : t('account.sideLocal')}</span>
        <span className="small muted">{user ? `@${handleFor(user)}` : t('account.logIn')}</span>
      </span>
      <Ic name="chevronUp" size={14} className="inline-icon" style={{ transform: 'rotate(90deg)', opacity: 0.6 }} />
    </button>
  );
}
