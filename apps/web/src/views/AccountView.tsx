import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  applyAuthUser,
  deriveStats,
  ensureMyProfile,
  fileToDataUrl,
  firebaseUpdateProfile,
  useApp,
  useSocial,
} from '@cutepad/core';
import { Ic, Modal } from '@cutepad/ui';
import { useHashRoute } from '../hooks';
import { useT } from '../i18n';
import { ProfileAvatar, handleFor, runAccountLogout } from '../components/Account';
import './AccountView.css';

const USERNAME_RE = /^[a-z0-9_.]{1,24}$/;

/** downscale to a small square-ish JPEG so the avatar stays light as a data URL */
async function shrinkAvatar(dataUrl: string, max = 320): Promise<string> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('bad image'));
    img.src = dataUrl;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height, 1));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export default function AccountView() {
  const [, navigate] = useHashRoute();
  const t = useT();
  const auth = useApp((s) => s.auth);
  const settings = useApp((s) => s.settings);
  const syncState = useApp((s) => s.sync);
  const notes = useApp((s) => s.notes);
  const sessions = useApp((s) => s.sessions);
  const tasks = useApp((s) => s.tasks);
  const achievements = useApp((s) => s.achievements);
  const friends = useSocial((s) => s.friends);
  const incoming = useSocial((s) => s.incoming);

  const [edit, setEdit] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutErr, setLogoutErr] = useState<string | null>(null);

  const user = auth.isLoggedIn ? auth.user : null;
  const stats = deriveStats({ sessions, tasks, notesCount: notes.length });

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const openEdit = () => {
    if (!user) return;
    setName(user.name);
    setUsername(user.username ?? '');
    setAvatar(user.avatar);
    setErr(null);
    setEdit(true);
  };

  const onPickAvatar = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setAvatar(await shrinkAvatar(await fileToDataUrl(file)));
    } catch {
      setErr(t('account.photoError'));
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !user) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErr(t('account.nameRequired'));
      return;
    }
    const handle = username.trim().toLowerCase();
    if (handle && !USERNAME_RE.test(handle)) {
      setErr(t('account.usernameInvalid'));
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const avatarChanged = (avatar ?? '') !== (user.avatar ?? '');
      const next = await firebaseUpdateProfile(trimmedName, avatarChanged ? avatar ?? null : undefined);
      applyAuthUser(next, handle || null);
      // sync the public profile + @handle registry with the fresh identity
      void ensureMyProfile().catch(() => undefined);
      setEdit(false);
      setNotice(t('account.saved'));
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'could not update your profile');
    } finally {
      setBusy(false);
    }
  };

  const doLogout = async () => {
    setLoggingOut(true);
    setLogoutErr(null);
    try {
      await runAccountLogout();
      setLogoutOpen(false);
      setNotice(t('account.loggedOut'));
    } catch (error) {
      setLogoutErr(error instanceof Error ? error.message : 'logout failed');
    } finally {
      setLoggingOut(false);
    }
  };

  const sinceText = user?.since
    ? new Date(user.since).toLocaleDateString(settings.locale, { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head">
        <div>
          <div className="page-title" role="heading" aria-level={1}>
            {t('account.title')}
          </div>
          <div className="page-sub">{t('account.sub')}</div>
        </div>
        <span className="spacer" />
        {notice && <span className="tag">{notice}</span>}
      </div>

      <div className="card pad acct-hero">
        <div className="acct-hero-top">
          <div className="acct-hero-avatar">
            <ProfileAvatar
              user={user ?? (settings.studyBuddyName ? { name: settings.studyBuddyName } : undefined)}
              size={92}
            />
            {edit && (
              <label className="acct-cam" title={t('account.uploadPhoto')} aria-label={t('account.uploadPhoto')}>
                <Ic name="camera" size={15} />
                <input type="file" accept="image/*" hidden onChange={onPickAvatar} />
              </label>
            )}
          </div>
          <div className="acct-hero-id">
            {user ? (
              <>
                <div className="acct-hero-name">{user.name}</div>
                <div className="acct-hero-handle">@{handleFor(user)}</div>
                <div className="small muted" style={{ wordBreak: 'break-all' }}>
                  {user.email}
                </div>
              </>
            ) : (
              <>
                <div className="acct-hero-name">{t('account.guestTitle')}</div>
                <p className="small muted" style={{ margin: '4px 0 0' }}>
                  {t('account.guestBody')}
                </p>
              </>
            )}
          </div>
          {user && !edit && (
            <button type="button" className="btn btn-soft btn-sm" style={{ marginLeft: 'auto' }} onClick={openEdit}>
              <Ic name="pencil" size={15} className="inline-icon" /> {t('account.edit')}
            </button>
          )}
        </div>

        {!user && (
          <div className="row wrap" style={{ gap: 8, marginTop: 14 }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/signup')}>
              {t('account.createAccount')}
            </button>
            <button type="button" className="btn btn-soft btn-sm" onClick={() => navigate('/login')}>
              {t('account.logIn')}
            </button>
          </div>
        )}

        {user && edit && (
          <form className="acct-form" onSubmit={save}>
            <div className="acct-form-grid">
              <div className="field">
                <label className="field-label" htmlFor="acct-name">
                  {t('account.name')}
                </label>
                <input
                  id="acct-name"
                  className="input"
                  value={name}
                  placeholder={t('account.namePlaceholder')}
                  maxLength={40}
                  autoFocus
                  onChange={(e) => {
                    setName(e.target.value);
                    if (err) setErr(null);
                  }}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="acct-username">
                  {t('account.username')}
                </label>
                <input
                  id="acct-username"
                  className="input"
                  value={username}
                  placeholder={handleFor(user)}
                  maxLength={24}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase());
                    if (err) setErr(null);
                  }}
                />
                <span className="small muted" style={{ display: 'block', marginTop: 4 }}>
                  {t('account.usernameHint')}
                </span>
              </div>
            </div>
            <div className="row wrap" style={{ gap: 8 }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                {busy ? t('account.saving') : t('account.save')}
              </button>
              <button type="button" className="btn btn-soft btn-sm" disabled={busy} onClick={() => setEdit(false)}>
                {t('account.cancel')}
              </button>
              {(avatar ?? '') !== '' && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => setAvatar(undefined)}
                >
                  {t('account.removePhoto')}
                </button>
              )}
            </div>
            {err && (
              <div className="form-error" role="alert">
                {err}
              </div>
            )}
          </form>
        )}
      </div>

      {user && (
        <div className="card pad">
          <div className="card-title">
            <Ic name="users" size={16} className="inline-icon" /> {t('account.connections')}
          </div>
          <div className="row wrap" style={{ gap: 8, alignItems: 'center' }}>
            <span className="tag">{t('account.friendsN', { n: friends.length })}</span>
            <span className={incoming.length > 0 ? 'tag' : 'small muted'}>
              {incoming.length > 0 ? t('account.requestsN', { n: incoming.length }) : t('friends.emptyIncoming')}
            </span>
            <span className="spacer" />
            <button type="button" className="btn btn-soft btn-sm" onClick={() => navigate('/friends')}>
              <Ic name="users" size={15} className="inline-icon" /> {t('account.openFriends')}
            </button>
          </div>
          {friends.length > 0 && (
            <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
              {friends.slice(0, 8).map((f) => (
                <span key={f.uid} className="pill small">
                  {f.name}
                </span>
              ))}
              {friends.length > 8 && <span className="pill small">+{friends.length - 8}</span>}
            </div>
          )}
        </div>
      )}

      <div className="card pad">
        <div className="card-title">
          <Ic name="key" size={16} className="inline-icon" /> {t('account.details')}
        </div>
        <div className="acct-rows">
          <div className="acct-row">
            <span className="k">{t('account.email')}</span>
            <span className="v">{user ? user.email : '—'}</span>
          </div>
          <div className="acct-row">
            <span className="k">{t('account.username')}</span>
            <span className="v">{user ? `@${handleFor(user)}` : '—'}</span>
          </div>
          <div className="acct-row">
            <span className="k">{t('account.displayName')}</span>
            <span className="v">{user ? user.name : '—'}</span>
          </div>
          {sinceText && (
            <div className="acct-row">
              <span className="k">{t('account.since')}</span>
              <span className="v">{sinceText}</span>
            </div>
          )}
          <div className="acct-row">
            <span className="k">{t('account.status')}</span>
            <span className="v">{user ? t('account.signedIn') : t('account.local')}</span>
          </div>
        </div>

        <div className="divider" />
        <div className="small bold" style={{ marginBottom: 8 }}>
          {t('account.data')}
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          <span className="tag">{t('account.notes', { n: notes.length })}</span>
          <span className="tag">{t('account.streak', { n: stats.streak })}</span>
          <span className="tag">{t('account.badges', { n: achievements.length })}</span>
        </div>
        <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
          <span className="pill small">
            <span
              className="dot"
              style={{
                background:
                  syncState.state === 'error' ? '#ff6b8f' : syncState.state === 'synced' ? '#8fe3c8' : '#ffd76e',
              }}
            />
            {settings.legal.sync ? t('account.syncOn') : t('account.syncOff')}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/settings')}>
            <Ic name="settings" size={15} className="inline-icon" /> {t('account.manageSync')}
          </button>
        </div>

        {user && (
          <>
            <div className="divider" />
            <div className="row wrap" style={{ gap: 8 }}>
              <button
                type="button"
                className="btn btn-soft btn-sm"
                disabled={loggingOut}
                onClick={() => {
                  setLogoutErr(null);
                  setLogoutOpen(true);
                }}
              >
                <Ic name="logout" size={15} className="inline-icon" />{' '}
                {loggingOut ? t('account.loggingOut') : t('account.logout')}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
                <Ic name="layoutDashboard" size={15} className="inline-icon" /> {t('account.home')}
              </button>
            </div>
          </>
        )}
      </div>

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
          <p style={{ margin: 0 }}>{settings.legal.sync ? t('account.logoutBodySync') : t('account.logoutBodyLocal')}</p>
          {logoutErr && (
            <div className="form-error" role="alert">
              {logoutErr}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
