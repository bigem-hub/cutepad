import { useEffect, useState } from 'react';
import {
  getProfile,
  refreshSocial,
  searchPeople,
  setPrivacy,
  unblockUser,
  useApp,
  useSocial,
  type SocialProfile,
} from '@cutepad/core';
import { Ic, Segmented } from '@cutepad/ui';
import { useHashRoute } from '../hooks';
import { useT } from '../i18n';
import { PersonRow, RelationActions, UserProfileModal, ago } from '../components/Social';
import './FriendsView.css';

type Tab = 'find' | 'requests' | 'friends';

function asProfile(uid: string, name: string, username: string): SocialProfile {
  return { uid, name, username, nameLower: name.toLowerCase(), discoverable: true, requestsAllowed: true, blocked: [], updatedAt: 0 };
}

export default function FriendsView() {
  const t = useT();
  const [, navigate] = useHashRoute();
  const loggedIn = useApp((s) => s.auth.isLoggedIn);
  const profile = useSocial((s) => s.profile);
  const friends = useSocial((s) => s.friends);
  const incoming = useSocial((s) => s.incoming);
  const outgoing = useSocial((s) => s.outgoing);
  const loading = useSocial((s) => s.loading);

  const [tab, setTab] = useState<Tab>('find');
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<SocialProfile[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<SocialProfile | null>(null);
  const [notice, setNotice] = useState<{ msg: string; err: boolean } | null>(null);
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [blocked, setBlocked] = useState<SocialProfile[]>([]);

  useEffect(() => {
    if (loggedIn) void refreshSocial();
  }, [loggedIn]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let cancelled = false;
    const ids = profile?.blocked ?? [];
    if (ids.length === 0) {
      setBlocked([]);
      return;
    }
    void Promise.all(ids.map((id) => getProfile(id))).then((list) => {
      if (!cancelled) setBlocked(list.filter((p): p is SocialProfile => !!p));
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.blocked]);

  const say = (msg: string, err = false) => setNotice({ msg, err });

  const doSearch = async () => {
    if (searching || !term.trim()) return;
    setSearching(true);
    setSearchErr(null);
    try {
      const out = await searchPeople(term);
      setResults(out);
    } catch (error) {
      setSearchErr(error instanceof Error ? error.message : 'search failed');
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const openProfile = async (uid: string, fallback?: SocialProfile) => {
    const full = await getProfile(uid).catch(() => null);
    setSelected(full ?? fallback ?? null);
  };

  const togglePrivacy = async (patch: { requestsAllowed?: boolean; discoverable?: boolean }) => {
    if (privacyBusy) return;
    setPrivacyBusy(true);
    try {
      await setPrivacy(patch);
      say(t('friends.privacySaved'));
    } catch (error) {
      say(error instanceof Error ? error.message : 'could not update privacy', true);
    } finally {
      setPrivacyBusy(false);
    }
  };

  if (!loggedIn) {
    return (
      <div className="stack" style={{ gap: 16 }}>
        <div className="page-head">
          <div>
            <div className="page-title" role="heading" aria-level={1}>
              {t('friends.title')}
            </div>
            <div className="page-sub">{t('friends.sub')}</div>
          </div>
        </div>
        <div className="card pad soc-guest">
          <span className="soc-guest-ic" aria-hidden="true">
            <Ic name="users" size={40} strokeWidth={2} />
          </span>
          <div className="acct-hero-name">{t('friends.guestTitle')}</div>
          <p className="small muted" style={{ margin: '6px 0 0', maxWidth: 460 }}>
            {t('friends.guestBody')}
          </p>
          <div className="row wrap" style={{ gap: 8, marginTop: 14 }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/signup')}>
              {t('account.createAccount')}
            </button>
            <button type="button" className="btn btn-soft btn-sm" onClick={() => navigate('/login')}>
              {t('account.logIn')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabRequests = (
    <>
      {incoming.length > 0 && (
        <div className="small bold soc-section">{t('friends.incomingTitle')}</div>
      )}
      {incoming.length === 0 && outgoing.length === 0 && (
        <p className="small muted soc-blank">{t('friends.emptyIncoming')}</p>
      )}
      {incoming.map((r) => (
        <PersonRow
          key={`in-${r.id}`}
          name={r.fromName}
          username={r.fromUsername}
          meta={t('friends.sentWhen', { when: ago(r.createdAt) })}
          onClick={() => void openProfile(r.from, asProfile(r.from, r.fromName, r.fromUsername))}
          right={
            <RelationActions
              profile={asProfile(r.from, r.fromName, r.fromUsername)}
              onNotice={(m, e) => say(m, e)}
            />
          }
        />
      ))}
      {outgoing.length > 0 && (
        <div className="small bold soc-section">{t('friends.outgoingTitle')}</div>
      )}
      {outgoing.map((r) => (
        <PersonRow
          key={`out-${r.id}`}
          name={r.toName}
          username={r.toUsername}
          meta={t('friends.sentWhen', { when: ago(r.createdAt) })}
          onClick={() => void openProfile(r.to, asProfile(r.to, r.toName, r.toUsername))}
          right={
            <RelationActions
              profile={asProfile(r.to, r.toName, r.toUsername)}
              onNotice={(m, e) => say(m, e)}
            />
          }
        />
      ))}
    </>
  );

  const tabFind = (
    <>
      <div className="soc-search">
        <input
          className="input"
          value={term}
          placeholder={t('friends.searchPlaceholder')}
          aria-label={t('friends.searchBtn')}
          maxLength={64}
          onChange={(e) => {
            setTerm(e.target.value);
            setSearchErr(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void doSearch();
          }}
        />
        <button type="button" className="btn btn-primary" disabled={searching || !term.trim()} onClick={() => void doSearch()}>
          <Ic name={searching ? 'hourglass' : 'search'} size={15} /> {searching ? t('friends.searching') : t('friends.searchBtn')}
        </button>
      </div>
      <p className="small muted" style={{ margin: '8px 0 0' }}>
        {t('friends.searchHint')}
      </p>
      {searchErr && (
        <div className="form-error" role="alert" style={{ marginTop: 8 }}>
          {searchErr}
        </div>
      )}
      {results && results.length === 0 && !searchErr && (
        <p className="small muted soc-blank">{t('friends.noResults')}</p>
      )}
      {results && results.length > 0 && (
        <div className="soc-list" style={{ marginTop: 8 }}>
          {results.map((p) => (
            <PersonRow
              key={p.uid}
              name={p.name}
              username={p.username}
              onClick={() => setSelected(p)}
              right={<RelationActions profile={p} onNotice={(m, e) => say(m, e)} />}
            />
          ))}
        </div>
      )}
    </>
  );

  const tabFriends = friends.length === 0 ? (
    <p className="small muted soc-blank">{t('friends.emptyFriends')}</p>
  ) : (
    friends.map((f) => (
      <PersonRow
        key={f.uid}
        name={f.name}
        username={f.username}
        meta={f.since ? t('friends.sinceWhen', { when: new Date(f.since).toLocaleDateString() }) : undefined}
        onClick={() => void openProfile(f.uid, asProfile(f.uid, f.name, f.username))}
        right={
          <RelationActions
            profile={asProfile(f.uid, f.name, f.username)}
            onNotice={(m, e) => say(m, e)}
          />
        }
      />
    ))
  );

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head">
        <div>
          <div className="page-title" role="heading" aria-level={1}>
            {t('friends.title')}
          </div>
          <div className="page-sub">{t('friends.sub')}</div>
        </div>
        <span className="spacer" />
        {notice && (
          <span className={notice.err ? 'tag error-tag' : 'tag'} role="status">
            {notice.msg}
          </span>
        )}
      </div>

      <div className="soc-tabs">
        <Segmented
          options={[
            { value: 'find', label: t('friends.tabFind') },
            {
              value: 'requests',
              label: (
                <>
                  {t('friends.tabRequests')}
                  {incoming.length > 0 && <span className="soc-tab-badge">{incoming.length}</span>}
                </>
              ),
            },
            {
              value: 'friends',
              label: (
                <>
                  {t('friends.tabFriends')}
                  {friends.length > 0 && <span className="soc-tab-badge">{friends.length}</span>}
                </>
              ),
            },
          ]}
          value={tab}
          onChange={setTab}
        />
        {loading && (
          <span className="pill small">
            <Ic name="refresh" size={13} className="inline-icon" /> {t('friends.searching')}
          </span>
        )}
      </div>

      <div className="card pad">
        {tab === 'find' && tabFind}
        {tab === 'requests' && tabRequests}
        {tab === 'friends' && tabFriends}
      </div>

      <div className="card pad">
        <div className="card-title">
          <Ic name="shield" size={16} className="inline-icon" /> {t('friends.privacyTitle')}
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <label className="consent-row" htmlFor="priv-requests">
            <input
              id="priv-requests"
              type="checkbox"
              checked={profile?.requestsAllowed !== false}
              disabled={privacyBusy || !profile}
              onChange={(e) => void togglePrivacy({ requestsAllowed: e.target.checked })}
            />
            <span>{t('friends.allowRequests')}</span>
          </label>
          <label className="consent-row" htmlFor="priv-discover">
            <input
              id="priv-discover"
              type="checkbox"
              checked={profile?.discoverable !== false}
              disabled={privacyBusy || !profile}
              onChange={(e) => void togglePrivacy({ discoverable: e.target.checked })}
            />
            <span>{t('friends.discoverable')}</span>
          </label>
          <p className="small muted" style={{ margin: 0 }}>
            {t('friends.privacyHint')}
          </p>
        </div>
        <div className="divider" />
        <div className="small bold" style={{ marginBottom: 6 }}>
          {t('friends.blockedTitle')}
        </div>
        {blocked.length === 0 ? (
          <p className="small muted" style={{ margin: 0 }}>
            {t('friends.noBlocked')}
          </p>
        ) : (
          <div className="soc-list">
            {blocked.map((b) => (
              <PersonRow
                key={b.uid}
                name={b.name}
                username={b.username}
                right={
                  <button
                    type="button"
                    className="btn btn-soft btn-sm"
                    disabled={privacyBusy}
                    onClick={() =>
                      void unblockUser(b.uid)
                        .then(() => say(t('friends.unblockedOk')))
                        .catch((e) => say(e instanceof Error ? e.message : 'could not unblock', true))
                    }
                  >
                    {t('friends.unblock')}
                  </button>
                }
              />
            ))}
          </div>
        )}
      </div>

      <UserProfileModal profile={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
