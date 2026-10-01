import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  acceptFriendRequest,
  blockUser,
  cancelFriendRequest,
  currentUid,
  deleteEvent,
  markEventRead,
  pairId,
  refreshSocial,
  rejectFriendRequest,
  relationTo,
  removeFriend,
  sendFriendRequest,
  sendNoteShare,
  unblockUser,
  useApp,
  useSocial,
  type InboxEvent,
  type Note,
  type SocialProfile,
} from '@cutepad/core';
import { Ic, Modal } from '@cutepad/ui';
import { useHashRoute } from '../hooks';
import { useT } from '../i18n';
import { sanitizeNoteHtml } from '../lib/sanitize';
import { ProfileAvatar } from './Account';
import './Social.css';

type Notice = (msg: string, isError?: boolean) => void;

export function ago(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

/**
 * The status button set for one person: Add Friend / Request Sent /
 * Accept · Decline / Friends · Remove / Blocked. Reactive to the social store.
 */
export function RelationActions({ profile, onNotice }: { profile: SocialProfile; onNotice?: Notice }) {
  const t = useT();
  const friends = useSocial((s) => s.friends);
  const incoming = useSocial((s) => s.incoming);
  const outgoing = useSocial((s) => s.outgoing);
  const [busy, setBusy] = useState(false);
  const myUid = currentUid();
  const status = relationTo(profile);

  const run = async (fn: () => Promise<void>, ok: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      onNotice?.(ok);
    } catch (err) {
      onNotice?.(err instanceof Error ? err.message : 'something went wrong', true);
    } finally {
      setBusy(false);
    }
  };

  if (!myUid) return null;
  const pair = pairId(myUid, profile.uid);

  if (status === 'blockedByMe') {
    return (
      <span className="row" style={{ gap: 8, alignItems: 'center' }}>
        <span className="tag">{t('friends.blockedTag')}</span>
        <button
          type="button"
          className="btn btn-soft btn-sm"
          disabled={busy}
          onClick={() => void run(() => unblockUser(profile.uid), t('friends.unblockedOk'))}
        >
          {t('friends.unblock')}
        </button>
      </span>
    );
  }
  if (status === 'blockedByThem') return <span className="small muted">{t('friends.blockedThem')}</span>;
  if (status === 'self') return null;

  if (status === 'friends') {
    return (
      <span className="row" style={{ gap: 8, alignItems: 'center' }}>
        <span className="tag">{t('friends.areFriends')}</span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={busy}
          onClick={() => void run(() => removeFriend(pair), t('friends.removedOk'))}
        >
          {t('friends.remove')}
        </button>
      </span>
    );
  }

  if (status === 'incoming') {
    const req = incoming.find((r) => r.from === profile.uid);
    if (!req) return null;
    return (
      <span className="row" style={{ gap: 8, alignItems: 'center' }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={busy}
          onClick={() => void run(() => acceptFriendRequest(req), t('friends.acceptedOk'))}
        >
          <Ic name="check" size={14} /> {t('friends.accept')}
        </button>
        <button
          type="button"
          className="btn btn-soft btn-sm"
          disabled={busy}
          onClick={() => void run(() => rejectFriendRequest(req.id), t('friends.declinedOk'))}
        >
          {t('friends.decline')}
        </button>
      </span>
    );
  }

  if (status === 'sent' || outgoing.some((r) => r.to === profile.uid)) {
    return (
      <span className="row" style={{ gap: 8, alignItems: 'center' }}>
        <span className="tag">
          <Ic name="hourglass" size={13} className="inline-icon" /> {t('friends.requestSent')}
        </span>
        <button
          type="button"
          className="btn btn-soft btn-sm"
          disabled={busy}
          onClick={() => void run(() => cancelFriendRequest(pair), t('friends.cancelledOk'))}
        >
          {t('friends.cancel')}
        </button>
      </span>
    );
  }

  const off = profile.requestsAllowed === false;
  return (
    <button
      type="button"
      className="btn btn-primary btn-sm"
      disabled={busy || off}
      title={off ? t('friends.requestsOff') : undefined}
      onClick={() => void run(() => sendFriendRequest(profile), t('friends.sentOk'))}
    >
      <Ic name="user" size={14} /> {t('friends.addFriend')}
    </button>
  );
}

/** Full profile dialog for another person: identity, relation buttons, block. */
export function UserProfileModal({ profile, onClose }: { profile: SocialProfile | null; onClose: () => void }) {
  const t = useT();
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeErr, setNoticeErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const myUid = currentUid();

  const onNotice: Notice = (msg, isError) => {
    setNotice(msg);
    setNoticeErr(!!isError);
    window.setTimeout(() => setNotice(null), 3500);
  };

  if (!profile) return null;
  const status = relationTo(profile);

  const doBlock = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await blockUser(profile.uid);
      onClose();
    } catch (err) {
      onNotice(err instanceof Error ? err.message : 'could not block', true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!profile}
      title={t('friends.viewProfile')}
      onClose={onClose}
      actions={
        <>
          {status !== 'self' && status !== 'blockedByMe' && myUid && (
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void doBlock()}>
              <Ic name="ban" size={14} /> {t('friends.block')}
            </button>
          )}
          <button type="button" className="btn btn-soft" onClick={onClose}>
            {t('friends.close')}
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 14 }}>
        <div className="soc-profile">
          <ProfileAvatar user={{ name: profile.name, avatar: profile.avatar }} size={64} />
          <div style={{ minWidth: 0 }}>
            <div className="acct-hero-name" style={{ fontSize: 20 }}>
              {profile.name}
            </div>
            <div className="acct-hero-handle">@{profile.username}</div>
          </div>
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          <RelationActions profile={profile} onNotice={onNotice} />
        </div>
        {notice && (
          <div className={noticeErr ? 'form-error' : 'tag'} role="status">
            {notice}
          </div>
        )}
      </div>
    </Modal>
  );
}

/** Compact status buttons + name row for lists (search results, friend rows). */
export function PersonRow({
  name,
  username,
  avatar,
  meta,
  right,
  onClick,
}: {
  name: string;
  username?: string;
  avatar?: string;
  meta?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div className={`soc-row${onClick ? ' clickable' : ''}`} onClick={onClick}>
      <ProfileAvatar user={{ name, avatar }} size={38} />
      <div className="soc-row-body">
        <div className="soc-row-name">{name}</div>
        <div className="small muted">
          {username ? `@${username}` : ''}
          {meta ? <> · {meta}</> : null}
        </div>
      </div>
      {right && (
        <div className="soc-row-right" onClick={(ev) => ev.stopPropagation()}>
          {right}
        </div>
      )}
    </div>
  );
}

/**
 * Topbar bell: unread badge + dropdown of inbox events (friend requests with
 * inline accept/decline, accepted notices, shared notes with preview + save).
 */
export function SocialBell() {
  const t = useT();
  const [, navigate] = useHashRoute();
  const loggedIn = useApp((s) => s.auth.isLoggedIn);
  const inbox = useSocial((s) => s.inbox);
  const incoming = useSocial((s) => s.incoming);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<InboxEvent | null>(null);
  const [err, setErr] = useState<string | null>(null);
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

  if (!loggedIn) return null;

  // stale request events (cancelled/accepted elsewhere) hide themselves once
  // the matching pending request leaves the store
  const visible = inbox.filter((e) => e.type !== 'request' || incoming.some((r) => r.id === e.id.slice(4)));
  const unread = visible.filter((e) => !e.read).length;

  const act = async (fn: () => Promise<void>) => {
    setErr(null);
    try {
      await fn();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'that didn’t work');
      window.setTimeout(() => setErr(null), 4000);
    }
  };

  const iconFor = (e: InboxEvent) => (e.type === 'request' ? 'user' : e.type === 'accepted' ? 'heart' : 'notes');
  const textFor = (e: InboxEvent) =>
    e.type === 'request'
      ? t('friends.eventRequest', { name: e.fromName })
      : e.type === 'accepted'
        ? t('friends.eventAccepted', { name: e.fromName })
        : t('friends.eventShare', { name: e.fromName });

  return (
    <div className="acct-wrap bell-wrap" ref={ref}>
      <button
        type="button"
        className="btn btn-icon btn-soft bell-btn"
        aria-label={t('friends.bellLabel')}
        aria-expanded={open}
        title={t('friends.bellLabel')}
        onClick={() => setOpen((o) => !o)}
      >
        <Ic name={unread > 0 ? 'bellRing' : 'bell'} size={17} />
        {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="card bell-menu" role="menu">
          <div className="bell-head">
            {t('friends.bellLabel')}
            {unread > 0 && <span className="tag" style={{ marginLeft: 8 }}>{unread} new</span>}
          </div>
          {err && (
            <div className="form-error" style={{ margin: '6px 8px 0' }} role="alert">
              {err}
            </div>
          )}
          <div className="bell-list">
            {visible.length === 0 && <p className="small muted bell-empty">{t('friends.bellEmpty')}</p>}
            {visible.map((e) => (
              <div
                key={e.id}
                className={`bell-row${e.read ? '' : ' unread'}`}
                role="menuitem"
                onClick={() => {
                  if (!e.read) void markEventRead(e.id);
                }}
              >
                <span className="bell-row-ic" aria-hidden="true">
                  <Ic name={iconFor(e)} size={15} />
                </span>
                <div className="bell-row-body">
                  <div className="bell-row-text">{textFor(e)}</div>
                  <div className="small muted">
                    {e.type === 'share' && e.share ? <b>“{e.share.title}”</b> : <>@{e.fromUsername}</>} · {ago(e.createdAt)}
                  </div>
                  {e.message && <div className="bell-msg">“{e.message}”</div>}
                  {e.type === 'request' && (
                    <div className="row" style={{ gap: 6, marginTop: 6 }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          void act(async () => {
                            await acceptFriendRequest({
                              id: e.id.slice(4),
                              from: e.from,
                              fromName: e.fromName,
                              fromUsername: e.fromUsername,
                            });
                          });
                        }}
                      >
                        {t('friends.accept')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-soft btn-sm"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          void act(() => rejectFriendRequest(e.id.slice(4)));
                        }}
                      >
                        {t('friends.decline')}
                      </button>
                    </div>
                  )}
                  {e.type === 'share' && e.share && (
                    <button
                      type="button"
                      className="btn btn-soft btn-sm"
                      style={{ marginTop: 6 }}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        if (!e.read) void markEventRead(e.id);
                        setPreview(e);
                      }}
                    >
                      <Ic name="eye" size={14} /> {t('friends.open')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="divider" />
          <button
            type="button"
            className="acct-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate('/friends');
            }}
          >
            <Ic name="users" size={16} className="inline-icon" /> {t('friends.bellOpen')}
          </button>
        </div>
      )}

      {/* portaled: the topbar's backdrop-filter would trap a fixed modal */}
      {createPortal(
        <Modal
          open={!!preview}
          title={preview ? t('friends.previewFrom', { name: preview.fromName }) : ''}
          onClose={() => setPreview(null)}
          actions={
            <>
              <button
                type="button"
                className="btn btn-soft"
                onClick={() => {
                  const p = preview;
                  setPreview(null);
                  if (!p?.share) return;
                  useApp.getState().addNote({
                    title: p.share.title,
                    html: p.share.html,
                    color: p.share.color,
                  });
                  void markEventRead(p.id);
                }}
              >
                <Ic name="save" size={15} /> {t('friends.saveToNotes')}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setPreview(null)}>
                {t('friends.close')}
              </button>
            </>
          }
        >
          <div className="stack" style={{ gap: 10 }}>
            <div className="small muted">
              {preview ? `@${preview.fromUsername} · ${ago(preview.createdAt)}` : ''}
            </div>
            {preview?.message && <p style={{ margin: 0 }}>“{preview.message}”</p>}
            {preview?.share && (
              <div
                className="share-preview"
                dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(preview.share.html) }}
              />
            )}
          </div>
        </Modal>,
        document.body,
      )}
    </div>
  );
}

/**
 * "Send to friends" sheet for the note editor: multi-select connections,
 * optional message, share-consent row — one batched send.
 */
export function ShareSheet({ note, onClose, onSent }: { note: Note; onClose: () => void; onSent?: (n: number) => void }) {
  const t = useT();
  const [, navigate] = useHashRoute();
  const friends = useSocial((s) => s.friends);
  const consent = useApp((s) => s.settings.legal.share);
  const setSettings = useApp((s) => s.setSettings);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState<number | null>(null);

  useEffect(() => {
    void refreshSocial();
  }, []);

  const toggle = (uid: string) =>
    setSelected((s) => (s.includes(uid) ? s.filter((x) => x !== uid) : [...s, uid]));

  const send = async () => {
    if (busy) return;
    if (selected.length === 0) {
      setErr(t('friends.sharePickOne'));
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await sendNoteShare(note, selected, message);
      setSent(selected.length);
      onSent?.(selected.length);
      window.setTimeout(() => onClose(), 1100);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'could not send that note');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={t('friends.shareTitle')}
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn-soft" disabled={busy} onClick={onClose}>
            {t('account.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !consent || selected.length === 0}
            onClick={() => void send()}
          >
            <Ic name={busy ? 'hourglass' : 'send'} size={15} />{' '}
            {busy ? t('friends.shareSending') : t('friends.shareSend')}
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 12 }}>
        <p className="small muted" style={{ margin: 0 }}>
          {t('friends.shareSub')}
        </p>

        {friends.length === 0 ? (
          <div className="soc-empty">
            <p className="small muted" style={{ margin: 0 }}>
              {t('friends.shareNoFriends')}
            </p>
            <button
              type="button"
              className="btn btn-soft btn-sm"
              onClick={() => {
                onClose();
                navigate('/friends');
              }}
            >
              <Ic name="users" size={14} /> {t('friends.shareFind')}
            </button>
          </div>
        ) : (
          <>
            <div className="between" style={{ alignItems: 'center' }}>
              <span className="field-label" style={{ margin: 0 }}>
                {t('friends.shareTitle')}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  setSelected((s) => (s.length === friends.length ? [] : friends.map((f) => f.uid)))
                }
              >
                {selected.length === friends.length ? t('account.cancel') : t('friends.shareSelectAll')}
              </button>
            </div>
            <div className="soc-picklist">
              {friends.map((f) => (
                <label key={f.uid} className={`soc-pick${selected.includes(f.uid) ? ' on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selected.includes(f.uid)}
                    onChange={() => toggle(f.uid)}
                  />
                  <ProfileAvatar user={{ name: f.name }} size={30} />
                  <span className="soc-pick-name">
                    <b>{f.name}</b>
                    <span className="small muted"> @{f.username}</span>
                  </span>
                </label>
              ))}
            </div>
          </>
        )}

        <div className="field">
          <label className="field-label" htmlFor="share-msg">
            {t('friends.shareMessage')}
          </label>
          <textarea
            id="share-msg"
            className="input"
            rows={2}
            maxLength={500}
            value={message}
            placeholder={t('friends.sharePlaceholder')}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        {!consent && (
          <label className="consent-row" htmlFor="share-friends-consent">
            <input
              id="share-friends-consent"
              type="checkbox"
              checked={!!consent}
              onChange={(e) =>
                setSettings({ legal: { ...useApp.getState().settings.legal, share: e.target.checked ? Date.now() : null } })
              }
            />
            <span>
              {t('friends.shareConsent')} <a href="#/privacy">{t('notes.consentPrivacy')}</a>
            </span>
          </label>
        )}

        {sent !== null && (
          <div className="tag" role="status">
            {t('friends.shareOk', { n: sent })}
          </div>
        )}
        {err && (
          <div className="form-error" role="alert">
            {err}
          </div>
        )}
      </div>
    </Modal>
  );
}
