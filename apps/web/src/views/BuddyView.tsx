import { useCallback, useEffect, useRef, useState } from 'react';
import {
  dayKey,
  deriveStats,
  fetchBuddyPartner,
  fetchGroupPresence,
  formatMinutes,
  generatePairCode,
  pushBuddyPresence,
  pushGroupPresence,
  pushGroupSchedule,
  selectData,
  syncConfigured,
  useApp,
  type BuddyPresence,
  type GroupMemberRow,
} from '@cutepad/core';
import { EmptyState, MascotDock, Modal, ProgressBar, Tabs } from '@cutepad/ui';
import { useHashRoute, useNow } from '../hooks';
import { useT } from '../i18n';
import './ExtraViews.css';
import './BuddyView.css';

const TICK_MS = 15000;
const STALE_MS = 5 * 60000;
const GROUP_TICK_MS = 45000;

function relative(ts: number | null, now: number): string {
  if (!ts) return 'never';
  const diff = Math.max(0, now - ts);
  if (diff < 45000) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function hhmm(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = Math.floor(min) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

interface SharedBlock {
  title: string;
  date: string;
  startMin: number;
  durationMin?: number;
  subjectId?: string | null;
  color?: string;
}

function isSharedBlock(v: unknown): v is SharedBlock {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  if (typeof o.title !== 'string' || typeof o.date !== 'string' || typeof o.startMin !== 'number') return false;
  if (o.durationMin !== undefined && typeof o.durationMin !== 'number') return false;
  if (o.subjectId !== undefined && o.subjectId !== null && typeof o.subjectId !== 'string') return false;
  if (o.color !== undefined && typeof o.color !== 'string') return false;
  return true;
}

interface SharedSchedule {
  member: string;
  blocks: SharedBlock[];
}

function currentWeekRange(today: Date): { startKey: string; endKey: string } {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { startKey: dayKey(start), endKey: dayKey(end) };
}

export default function BuddyView() {
  const t = useT();
  const [, navigate] = useHashRoute();
  const now = useNow(20000).getTime();
  const settings = useApp((s) => s.settings);
  const setSettings = useApp((s) => s.setSettings);
  const pairCode = useApp((s) => s.buddy.pairCode);
  const groupCode = useApp((s) => s.buddy.groupCode);
  const setBuddy = useApp((s) => s.setBuddy);

  const configured = syncConfigured(settings.sync);
  const data = selectData(useApp.getState());
  const stats = deriveStats({ sessions: data.sessions, tasks: data.tasks, notesCount: data.notes.length });

  const [tab, setTab] = useState('buddy');
  const [partner, setPartner] = useState<BuddyPresence | null>(null);
  const [seenAt, setSeenAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [joinValue, setJoinValue] = useState('');
  const myPushes = useRef<Set<number>>(new Set());

  const [groupInput, setGroupInput] = useState('');
  const [board, setBoard] = useState<GroupMemberRow[]>([]);
  const [boardBusy, setBoardBusy] = useState(false);
  const [boardErr, setBoardErr] = useState<string | null>(null);
  const [shareState, setShareState] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle');
  const [schedules, setSchedules] = useState<SharedSchedule[]>([]);
  const [schedMsg, setSchedMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [schedBusy, setSchedBusy] = useState<'publish' | 'fetch' | null>(null);
  const [groupCopied, setGroupCopied] = useState(false);
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [addedKeys, setAddedKeys] = useState<Record<string, boolean>>({});

  const myMember = settings.sync.owner || settings.studyBuddyName || 'me';

  useEffect(() => {
    if (!configured || !pairCode) return;
    let cancelled = false;

    const syncOnce = async () => {
      if (!useApp.getState().settings.legal?.share) return;
      const state = useApp.getState();
      const s = deriveStats({
        sessions: state.sessions,
        tasks: state.tasks,
        notesCount: state.notes.length,
      });
      try {
        const payload: BuddyPresence = {
          name: state.settings.studyBuddyName || 'me',
          minutesToday: s.minutesToday,
          totalMinutes: s.totalMinutes,
          streak: s.streak,
          sessions: s.totalSessions,
          mood: '🌸',
          at: Date.now(),
        };
        await pushBuddyPresence(pairCode, payload);
        myPushes.current.add(payload.at);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'could not share your status');
      }
      try {
        const row = await fetchBuddyPartner(pairCode);
        if (cancelled || !row) return;
        if (myPushes.current.has(row.payload.at)) return;
        setPartner(row.payload);
        setSeenAt(Date.now());
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'could not reach your buddy');
      }
    };

    void syncOnce();
    const id = window.setInterval(() => void syncOnce(), TICK_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [configured, pairCode, !!settings.legal.share]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(id);
  }, [copied]);

  useEffect(() => {
    if (!groupCopied) return;
    const id = window.setTimeout(() => setGroupCopied(false), 1800);
    return () => window.clearTimeout(id);
  }, [groupCopied]);

  const loadBoard = useCallback(async () => {
    if (!groupCode) return;
    setBoardBusy(true);
    try {
      const rows = await fetchGroupPresence(groupCode);
      setBoard(rows);
      setBoardErr(null);
    } catch {
      setBoardErr(t('buddy.syncError'));
    } finally {
      setBoardBusy(false);
    }
  }, [groupCode, t]);

  useEffect(() => {
    if (tab !== 'group' || !configured || !groupCode) return;
    void loadBoard();
    const id = window.setInterval(() => void loadBoard(), GROUP_TICK_MS);
    return () => window.clearInterval(id);
  }, [tab, configured, groupCode, loadBoard]);

  const buildPresence = (): BuddyPresence => {
    const state = useApp.getState();
    const s = deriveStats({
      sessions: state.sessions,
      tasks: state.tasks,
      notesCount: state.notes.length,
    });
    return {
      name: state.settings.studyBuddyName || state.settings.sync.owner || 'me',
      minutesToday: s.minutesToday,
      totalMinutes: s.totalMinutes,
      streak: s.streak,
      sessions: s.totalSessions,
      mood: '🌸',
      at: Date.now(),
    };
  };

  const createCode = () => setBuddy({ pairCode: generatePairCode(), partnerName: null });

  const copyCode = async () => {
    if (!pairCode) return;
    try {
      await navigator.clipboard.writeText(pairCode);
      setCopied(true);
    } catch {
      setError('copy failed — select the code and copy it manually');
    }
  };

  const joinBuddy = () => {
    const code = joinValue.trim().toUpperCase();
    if (code.length !== 6) return;
    setBuddy({ pairCode: code });
    setJoinValue('');
    setPartner(null);
    setSeenAt(null);
    setError(null);
  };

  const createGroup = () => {
    setBuddy({ groupCode: generatePairCode() });
    setBoard([]);
    setSchedules([]);
    setShareState('idle');
    setSchedMsg(null);
    setBoardErr(null);
    setCodeErr(null);
  };

  const joinGroup = () => {
    const code = groupInput.trim().toUpperCase();
    if (code.length !== 6) return;
    setBuddy({ groupCode: code });
    setGroupInput('');
    setBoard([]);
    setSchedules([]);
    setShareState('idle');
    setSchedMsg(null);
    setBoardErr(null);
    setCodeErr(null);
  };

  const leaveGroup = () => {
    setBuddy({ groupCode: null });
    setLeaveOpen(false);
    setBoard([]);
    setSchedules([]);
    setShareState('idle');
    setSchedMsg(null);
    setBoardErr(null);
    setCodeErr(null);
    setAddedKeys({});
  };

  const copyGroupCode = async () => {
    if (!groupCode) return;
    try {
      await navigator.clipboard.writeText(groupCode);
      setGroupCopied(true);
      setCodeErr(null);
    } catch {
      setCodeErr(t('buddy.copyFailed'));
    }
  };

  const shareStats = async () => {
    if (!groupCode || !useApp.getState().settings.legal.share) return;
    setShareState('busy');
    try {
      await pushGroupPresence(groupCode, myMember, buildPresence());
      setShareState('ok');
      await loadBoard();
    } catch {
      setShareState('err');
    }
  };

  const publishWeek = async () => {
    if (!groupCode || !useApp.getState().settings.legal.share) return;
    setSchedBusy('publish');
    setSchedMsg(null);
    try {
      const { startKey, endKey } = currentWeekRange(new Date());
      const blocks = useApp.getState().blocks.filter((b) => b.date >= startKey && b.date <= endKey);
      await pushGroupSchedule(groupCode, blocks);
      setSchedMsg({
        kind: 'ok',
        text: blocks.length ? t('buddy.publishOk', { n: blocks.length }) : t('buddy.publishEmpty'),
      });
    } catch {
      setSchedMsg({ kind: 'err', text: t('buddy.syncError') });
    } finally {
      setSchedBusy(null);
    }
  };

  const fetchSchedules = async () => {
    if (!groupCode) return;
    setSchedBusy('fetch');
    setSchedMsg(null);
    try {
      const rows = await fetchGroupPresence(groupCode);
      const next: SharedSchedule[] = [];
      for (const row of rows) {
        if (row.member !== '__schedule__') continue;
        try {
          const parsed: unknown = JSON.parse(row.payload.mood);
          if (Array.isArray(parsed)) next.push({ member: row.member, blocks: parsed.filter(isSharedBlock) });
        } catch {
          // skip malformed schedule payloads
        }
      }
      setSchedules(next);
      setSchedMsg(next.length ? null : { kind: 'ok', text: t('buddy.schedEmptyTitle') });
    } catch {
      setSchedMsg({ kind: 'err', text: t('buddy.syncError') });
    } finally {
      setSchedBusy(null);
    }
  };

  const addShared = (block: SharedBlock, key: string) => {
    useApp.getState().addBlock({
      title: block.title,
      date: block.date,
      startMin: block.startMin,
      durationMin: block.durationMin,
      subjectId: block.subjectId ?? null,
      color: block.color,
    });
    setAddedKeys((prev) => ({ ...prev, [key]: true }));
  };

  const tabs = [
    { id: 'buddy', emoji: '👫', label: t('buddy.tabBuddy') },
    { id: 'group', emoji: '👥', label: t('buddy.tabGroup') },
  ];

  const noSyncPane = (
    <div className="card pad">
      <div className="row wrap" style={{ gap: 18, alignItems: 'flex-start' }}>
        <MascotDock mood="think" message="pairing needs cloud sync first~ it’s quick, promise! 🌤️" />
        <div style={{ flex: 1, minWidth: 260 }}>
          <div className="page-title" role="heading" aria-level={1}>
            <span aria-hidden="true">👫</span> study buddy
          </div>
          <p style={{ margin: '8px 0 14px', fontWeight: 700 }}>
            to pair up, cutepad needs <b>cloud sync</b> so you and your buddy can see each other’s study
            stats. everything else still saves on this device <span aria-hidden="true">💗</span>
          </p>
          <div className="grid" style={{ gap: 10 }}>
            <div className="card stat-card">
              <div className="stat-icon" aria-hidden="true">
                🔥
              </div>
              <div>
                <div className="stat-value">{stats.streak}d</div>
                <div className="stat-label">day streak</div>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon" aria-hidden="true">
                🌸
              </div>
              <div>
                <div className="stat-value">{stats.minutesToday}m</div>
                <div className="stat-label">studied today</div>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon" aria-hidden="true">
                ⏱️
              </div>
              <div>
                <div className="stat-value">{Math.floor(stats.totalMinutes / 60)}h</div>
                <div className="stat-label">total hours</div>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => navigate('/settings')}
          >
            <span aria-hidden="true">☁️</span> set up cloud sync
          </button>
        </div>
      </div>
    </div>
  );

  const rows = [
    {
      key: 'today',
      label: 'minutes today',
      you: stats.minutesToday,
      them: partner?.minutesToday ?? 0,
      fmt: (v: number) => `${v}m`,
    },
    {
      key: 'streak',
      label: 'streak',
      you: stats.streak,
      them: partner?.streak ?? 0,
      fmt: (v: number) => `${v}d`,
    },
    {
      key: 'total',
      label: 'total studied',
      you: stats.totalMinutes,
      them: partner?.totalMinutes ?? 0,
      fmt: (v: number) => formatMinutes(v),
    },
  ];

  const stale = !!partner && now - partner.at > STALE_MS;

  const buddyPane = !configured ? (
    noSyncPane
  ) : (
    <>
      <div className="card pad">
        <div className="row wrap" style={{ gap: 16, alignItems: 'center' }}>
          <MascotDock mood="love" message="two study pals are better than one 💕" size={88} />
          <div className="spacer" />
          <div className="stack" style={{ gap: 4 }}>
            <span className="field-label" style={{ marginBottom: 0 }}>
              pair status
            </span>
            <span className="pill">
              <span className="dot" style={{ background: partner && !stale ? '#8fe3c8' : '#ffd76e' }} />
              {pairCode ? `code ${pairCode}` : 'no code yet'}
              {partner ? (stale ? ' · buddy napping' : ' · buddy online') : ''}
            </span>
          </div>
        </div>
        {error && (
          <div className="tag error-tag" style={{ marginTop: 12 }} role="status">
            <span aria-hidden="true">⚠️</span> {error}
          </div>
        )}
      </div>

      <div className="grid wide">
        <div className="card pad">
          <div className="card-title">
            <span aria-hidden="true">🔗</span> your pair code
          </div>
          {pairCode ? (
            <div className="stack" style={{ gap: 12 }}>
              <div className="pair-code">{pairCode}</div>
              <div className="row wrap">
                <button type="button" className="btn btn-primary" onClick={() => void copyCode()}>
                  <span aria-hidden="true">📋</span> copy
                </button>
                <button type="button" className="btn btn-soft" onClick={createCode}>
                  <span aria-hidden="true">🔁</span> new code
                </button>
                {copied && (
                  <span className="tag" role="status">
                    copied! <span aria-hidden="true">📋</span>
                  </span>
                )}
              </div>
              <p className="small muted">
                share these 6 characters with your buddy — you both read and write the same row.
              </p>
            </div>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              <p className="small muted">no code yet — make one and send it to your study pal <span aria-hidden="true">✨</span></p>
              <button type="button" className="btn btn-primary btn-block" onClick={createCode}>
                <span aria-hidden="true">✨</span> create pair code
              </button>
            </div>
          )}
        </div>

        <div className="card pad">
          <div className="card-title">
            <span aria-hidden="true">💌</span> join your buddy
          </div>
          <div className="row wrap" style={{ gap: 10 }}>
            <input
              className="input join-input"
              value={joinValue}
              maxLength={6}
              placeholder="ABC123"
              aria-label="your buddy’s 6 character pair code"
              onChange={(e) => setJoinValue(e.target.value.toUpperCase().slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && joinBuddy()}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={joinValue.length !== 6}
              onClick={joinBuddy}
            >
              <span aria-hidden="true">💗</span> join
            </button>
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>
            type the code your buddy shared — entering it swaps you onto their row (your code gets replaced).
          </p>
        </div>
      </div>

        <div className="card pad">
          <div className="card-title">
            <span aria-hidden="true">🌈</span> you vs your buddy
          </div>
          {partner ? (
          <div className="buddy-compare">
            <div className="compare-head">
              <span className="tag">
                <span aria-hidden="true">🌸</span> you
              </span>
              <span className="compare-mid">vs</span>
              <span className="tag">
                <span aria-hidden="true">{partner.mood}</span> {partner.name || 'buddy'}
              </span>
            </div>
            {rows.map((row) => {
              const max = Math.max(row.you, row.them, 1);
              const winner = row.you > row.them ? 'you' : row.them > row.you ? 'them' : null;
              return (
                <div className="compare-row" key={row.key}>
                  <div className={`compare-side ${winner === 'you' ? 'win' : ''}`}>
                    <div className="compare-value">
                      {row.fmt(row.you)}{' '}
                      {winner === 'you' && (
                        <span title="you’re ahead!" role="img" aria-label="you’re ahead!">
                          🎉
                        </span>
                      )}
                    </div>
                    <ProgressBar tiny pct={(row.you / max) * 100} />
                  </div>
                  <div className="compare-mid">{row.label}</div>
                  <div className={`compare-side right ${winner === 'them' ? 'win' : ''}`}>
                    <div className="compare-value">
                      {winner === 'them' && (
                        <span title="buddy is ahead!" role="img" aria-label="buddy is ahead!">
                          🌷
                        </span>
                      )}{' '}
                      {row.fmt(row.them)}
                    </div>
                    <ProgressBar tiny pct={(row.them / max) * 100} />
                  </div>
                </div>
              );
            })}
            <div className="row between wrap small muted" style={{ marginTop: 4 }}>
              <span>last seen {relative(partner.at, now)}</span>
              <span>{stale ? <>your buddy is napping <span aria-hidden="true">💤</span></> : <>buddy is studying right now <span aria-hidden="true">🌷</span></>}</span>
            </div>
          </div>
        ) : (
          <EmptyState
            emoji="⏳"
            title="Waiting for your buddy"
            hint={
              pairCode
                ? 'their stats will pop in here the moment they push an update.'
                : 'create a pair code and share it to get started.'
            }
          />
        )}
      </div>

        <div className="card pad">
          <div className="card-title">
            <span aria-hidden="true">💡</span> buddy tips
          </div>
          <ul className="buddy-tips">
            <li>
              <span aria-hidden="true">💌</span> share your pair code — it’s the only thing you need to connect.
            </li>
            <li>
              <span aria-hidden="true">🏁</span> race on daily minutes: whoever studies more today gets bragging
              rights <span aria-hidden="true">🎉</span>.
            </li>
            <li>
              <span aria-hidden="true">🌷</span> cheer each other on — a tiny “you got this!” beats a hard day every
              time.
            </li>
          </ul>
        </div>
    </>
  );

  const boardRows = board
    .filter((row) => row.member !== '__schedule__' && row.payload.name !== 'schedule')
    .sort((a, b) => b.payload.minutesToday - a.payload.minutesToday);

  const groupPane = !configured ? (
    <div className="card pad">
      <EmptyState
        emoji="☁️"
        title={t('buddy.groupNeedsSync')}
        hint={t('buddy.groupSyncHint')}
        action={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              window.location.hash = '/settings';
            }}
          >
            {t('buddy.openSettings')}
          </button>
        }
      />
    </div>
  ) : (
    <>
      <p className="small muted" style={{ margin: 0 }}>
        {t('buddy.groupExplainer')}
      </p>

      <div className="card pad">
        <div className="row between wrap" style={{ gap: 10 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>
            <span aria-hidden="true">🔑</span> {t('buddy.groupTitle')}
          </div>
          {groupCode && (
            <div className="row wrap" style={{ gap: 8 }}>
              <button type="button" className="btn btn-soft btn-sm" onClick={() => void copyGroupCode()}>
                <span aria-hidden="true">📋</span> {t('buddy.copyCode')}
              </button>
              <button type="button" className="btn btn-soft btn-sm" onClick={() => setLeaveOpen(true)}>
                <span aria-hidden="true">🚪</span> {t('buddy.leave')}
              </button>
            </div>
          )}
        </div>
        {groupCode ? (
          <div className="stack" style={{ gap: 10, marginTop: 10 }}>
            <div className="pair-code">{groupCode}</div>
            {groupCopied && (
              <span className="tag" role="status">
                {t('buddy.groupCopied')}
              </span>
            )}
            {codeErr && (
              <span className="tag error-tag" role="status">
                {codeErr}
              </span>
            )}
            <p className="small muted" style={{ margin: 0 }}>
              {t('buddy.groupHint')}
            </p>
          </div>
        ) : (
          <div className="stack" style={{ gap: 10, marginTop: 10 }}>
            <div className="row wrap" style={{ gap: 10 }}>
              <button type="button" className="btn btn-primary" onClick={createGroup}>
                <span aria-hidden="true">✨</span> {t('buddy.createGroup')}
              </button>
              <input
                className="input join-input"
                value={groupInput}
                maxLength={6}
                placeholder="ABC123"
                aria-label={t('buddy.joinGroup')}
                onChange={(e) => setGroupInput(e.target.value.toUpperCase().slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && joinGroup()}
              />
              <button
                type="button"
                className="btn btn-soft"
                disabled={groupInput.length !== 6}
                onClick={joinGroup}
              >
                <span aria-hidden="true">🌈</span> {t('buddy.joinGroup')}
              </button>
            </div>
            <p className="small muted" style={{ margin: 0 }}>
              {t('buddy.groupHint')}
            </p>
          </div>
        )}
      </div>

      <div className="card pad">
        <div className="row between wrap" style={{ gap: 10 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>
            <span aria-hidden="true">🏆</span> {t('buddy.boardTitle')}
          </div>
          <div className="row wrap" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn-soft btn-sm"
              disabled={!groupCode || boardBusy}
              onClick={() => void loadBoard()}
            >
              <span aria-hidden="true">{boardBusy ? '⏳' : '🔄'}</span> {t('buddy.refresh')}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!groupCode || shareState === 'busy' || !settings.legal.share}
              title={!settings.legal.share ? t('buddy.consentNeeded') : t('buddy.shareStats')}
              onClick={() => void shareStats()}
            >
              <span aria-hidden="true">{shareState === 'busy' ? '⏳' : '📤'}</span> {t('buddy.shareStats')}
            </button>
          </div>
        </div>
        <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
          {shareState === 'ok' && (
            <span className="tag" role="status">
              {t('buddy.shareOk')}
            </span>
          )}
          {shareState === 'err' && (
            <span className="tag error-tag" role="status">
              {t('buddy.syncError')}
            </span>
          )}
          {boardErr && (
            <span className="tag error-tag" role="status">
              {boardErr}
            </span>
          )}
        </div>
        {boardRows.length === 0 ? (
          <EmptyState emoji="🌱" title={t('buddy.boardEmpty')} hint={t('buddy.boardNote')} />
        ) : (
          <div className="lb-list" style={{ marginTop: 12 }}>
            {boardRows.map((row, i) => {
              const mine = row.member === myMember;
              const hours = Math.round((row.payload.totalMinutes / 60) * 10) / 10;
              return (
                <div className={`lb-row ${mine ? 'mine' : ''}`} key={row.member}>
                  <span className="lb-rank" role="img" aria-label={i === 0 ? '1st place' : i === 1 ? '2nd place' : i === 2 ? '3rd place' : `rank ${i + 1}`}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                  <span className="lb-name bold">
                    {row.payload.name || row.member}
                    {mine && (
                      <span className="tag" style={{ marginLeft: 6 }}>
                        <span aria-hidden="true">🌸</span> {t('buddy.you')}
                      </span>
                    )}
                  </span>
                  <span className="spacer" />
                  <span className="lb-stat">{t('buddy.today', { n: row.payload.minutesToday })}</span>
                  <span className="lb-stat">{t('buddy.streak', { n: row.payload.streak })}</span>
                  <span className="lb-stat">{t('buddy.total', { n: hours })}</span>
                </div>
              );
            })}
          </div>
        )}
        <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>
          {t('buddy.boardNote')}
        </p>
      </div>

      <div className="card pad">
        <div className="card-title">
          <span aria-hidden="true">🗓</span> {t('buddy.schedTitle')}
        </div>
        <div className="row wrap" style={{ gap: 10 }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!groupCode || schedBusy !== null || !settings.legal.share}
            title={!settings.legal.share ? t('buddy.consentNeeded') : undefined}
            onClick={() => void publishWeek()}
          >
            <span aria-hidden="true">{schedBusy === 'publish' ? '⏳' : '📤'}</span> {t('buddy.publishWeek')}
          </button>
          <button
            type="button"
            className="btn btn-soft btn-sm"
            disabled={!groupCode || schedBusy !== null}
            onClick={() => void fetchSchedules()}
          >
            <span aria-hidden="true">{schedBusy === 'fetch' ? '⏳' : '📥'}</span> {t('buddy.fetchSchedules')}
          </button>
        </div>
        {schedMsg && (
          <div className={`tag ${schedMsg.kind === 'err' ? 'error-tag' : ''}`} style={{ marginTop: 10 }} role="status">
            {schedMsg.text}
          </div>
        )}
        {schedules.length === 0 ? (
          <EmptyState emoji="🗓" title={t('buddy.schedEmptyTitle')} hint={t('buddy.schedEmptyHint')} />
        ) : (
          <div className="stack" style={{ gap: 12, marginTop: 12 }}>
            {schedules.map((sched, si) => (
              <div className="stack" style={{ gap: 8 }} key={`${sched.member}-${si}`}>
                <span className="tag pill small muted bold">
                  <span aria-hidden="true">📅</span> {sched.member}
                </span>
                {sched.blocks.length === 0 ? (
                  <p className="small muted" style={{ margin: 0 }}>
                    {t('buddy.schedEmptyHint')}
                  </p>
                ) : (
                  sched.blocks.map((block, bi) => {
                    const key = `${si}:${bi}`;
                    const added = !!addedKeys[key];
                    return (
                      <div className="sched-row" key={key}>
                        <span className="sched-title bold">{block.title || t('buddy.untitled')}</span>
                        <span className="sched-meta small muted">
                          {block.date} · {hhmm(block.startMin)} · {block.durationMin ?? 60}m
                        </span>
                        <span className="spacer" />
                        <button
                          type="button"
                          className="btn btn-soft btn-sm"
                          disabled={added}
                          aria-pressed={added}
                          onClick={() => addShared(block, key)}
                        >
                          {added ? t('buddy.added') : t('buddy.add')}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="stack" style={{ gap: 16 }}>
      <h1 className="sr-only">{t('buddy.pageTitle')}</h1>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {configured && (
        <label className="consent-row" htmlFor="share-consent">
          <input
            id="share-consent"
            type="checkbox"
            checked={!!settings.legal.share}
            onChange={(e) =>
              setSettings({ legal: { ...settings.legal, share: e.target.checked ? Date.now() : null } })
            }
          />
          <span>
            {t('buddy.consentShare')} <a href="#/privacy">{t('buddy.consentPrivacy')}</a>
          </span>
        </label>
      )}
      {tab === 'group' ? groupPane : buddyPane}
      <Modal
        open={leaveOpen}
        title={t('buddy.leaveTitle')}
        onClose={() => setLeaveOpen(false)}
        actions={
          <>
            <button type="button" className="btn btn-soft" onClick={() => setLeaveOpen(false)}>
              {t('buddy.cancel')}
            </button>
            <button type="button" className="btn btn-danger" onClick={leaveGroup}>
              {t('buddy.leaveConfirm')}
            </button>
          </>
        }
      >
        <p style={{ margin: 0 }}>{t('buddy.leaveBody')}</p>
      </Modal>
    </div>
  );
}
