import { useState } from 'react';
import {
  ACHIEVEMENTS,
  OUTFITS,
  STICKERS,
  deriveStats,
  outfitById,
  selectData,
  useApp,
  type DerivedStats,
  type Note,
  type SessionLog,
  type TimeBlock,
} from '@cutepad/core';
import { Ic, Mascot, MascotDock, ProgressBar, Tabs } from '@cutepad/ui';
import { useHashRoute } from '../hooks';
import { useT } from '../i18n';
import './ExtraViews.css';
import './AchievementsView.css';

type Translate = ReturnType<typeof useT>;

type BadgeProgress = { kind: 'bar'; value: number; target: number } | { kind: 'hint'; text: string };

interface ProgressContext {
  notes: Note[];
  blocks: TimeBlock[];
  sessions: SessionLog[];
}

function badgeProgress(
  id: string,
  stats: DerivedStats,
  ctx: ProgressContext,
  t: Translate,
): BadgeProgress | null {
  switch (id) {
    case 'first-note':
      return { kind: 'bar', value: stats.notesCount, target: 1 };
    case 'note-sprout':
      return { kind: 'bar', value: stats.notesCount, target: 10 };
    case 'doodle-star':
      return { kind: 'bar', value: ctx.notes.filter((n) => !!n.drawing).length, target: 1 };
    case 'first-focus':
      return { kind: 'bar', value: stats.totalSessions, target: 1 };
    case 'pomodoro-10':
      return { kind: 'bar', value: stats.totalSessions, target: 10 };
    case 'pomodoro-50':
      return { kind: 'bar', value: stats.totalSessions, target: 50 };
    case 'hours-10':
      return { kind: 'bar', value: stats.totalMinutes, target: 600 };
    case 'hours-50':
      return { kind: 'bar', value: stats.totalMinutes, target: 3000 };
    case 'streak-3':
      return { kind: 'bar', value: stats.streak, target: 3 };
    case 'streak-7':
      return { kind: 'bar', value: stats.streak, target: 7 };
    case 'streak-30':
      return { kind: 'bar', value: stats.streak, target: 30 };
    case 'task-10':
      return { kind: 'bar', value: stats.completedTasks, target: 10 };
    case 'task-25':
      return { kind: 'bar', value: stats.completedTasks, target: 25 };
    case 'planner-pro':
      return { kind: 'bar', value: ctx.blocks.length, target: 7 };
    case 'early-bird':
      return ctx.sessions.some((s) => s.kind !== 'break' && new Date(s.startedAt).getHours() < 8)
        ? { kind: 'bar', value: 1, target: 1 }
        : { kind: 'hint', text: t('achievements.hintEarly') };
    case 'night-owl':
      return ctx.sessions.some((s) => s.kind !== 'break' && new Date(s.startedAt).getHours() >= 22)
        ? { kind: 'bar', value: 1, target: 1 }
        : { kind: 'hint', text: t('achievements.hintNight') };
    default:
      return null;
  }
}

export default function AchievementsView() {
  const [, navigate] = useHashRoute();
  const t = useT();

  const [tab, setTab] = useState<string>('badges');
  const [hoveredOutfit, setHoveredOutfit] = useState<string | null>(null);

  const achievements = useApp((s) => s.achievements);
  const unlockedStickers = useApp((s) => s.unlockedStickers);
  const unlockedOutfits = useApp((s) => s.unlockedOutfits);
  const wornOutfit = useApp((s) => s.settings.mascotOutfit);
  const setSettings = useApp((s) => s.setSettings);

  const data = selectData(useApp.getState());
  const stats = deriveStats({ sessions: data.sessions, tasks: data.tasks, notesCount: data.notes.length });

  const badgeTotal = ACHIEVEMENTS.length;
  const badgeCount = achievements.length;
  const badgePct = badgeTotal === 0 ? 0 : Math.round((badgeCount / badgeTotal) * 100);
  const owned = new Map(achievements.map((a) => [a.id, a.at]));
  const cheering = badgePct >= 50;

  const stickerOwned = new Set(unlockedStickers);
  const stickerTotal = STICKERS.length;
  const stickerCount = STICKERS.filter((s) => stickerOwned.has(s.id)).length;
  const stickerPct = stickerTotal === 0 ? 0 : Math.round((stickerCount / stickerTotal) * 100);

  const outfitOwned = new Set(unlockedOutfits);
  const outfitTotal = OUTFITS.length + 1;
  const outfitCount = 1 + OUTFITS.filter((o) => outfitOwned.has(o.id)).length;

  const previewId = hoveredOutfit ?? wornOutfit;
  const previewing = hoveredOutfit !== null && hoveredOutfit !== wornOutfit;
  const previewName =
    previewId === 'none'
      ? t('achievements.outfitsPlain')
      : (outfitById(previewId)?.name ?? t('achievements.outfitsPlain'));

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <div className="page-title" role="heading" aria-level={1}>{t('achievements.title')}</div>
          <div className="page-sub">{t('achievements.sub')}</div>
        </div>
        <span className="spacer" />
        <span className="tag">
          <Ic name="trophy" size={15} className="inline-icon" /> {badgeCount}/{badgeTotal}
        </span>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'badges', icon: 'trophy', label: t('achievements.tabBadges'), badge: badgeCount },
          { id: 'stickers', icon: 'palette', label: t('achievements.tabStickers'), badge: stickerCount },
          { id: 'outfits', icon: 'shirt', label: t('achievements.tabOutfits'), badge: outfitCount },
        ]}
      />

      {tab === 'badges' && (
        <>
          <div className="card pad badge-head">
            <MascotDock
              mood={cheering ? 'cheer' : 'think'}
              size={104}
              message={
                cheering
                  ? t('achievements.badgesCheer', { count: badgeCount })
                  : t('achievements.badgesThink')
              }
            />
            <div className="grow">
              <div className="page-title" role="heading" aria-level={2}>{t('achievements.badgesTitle')}</div>
              <div className="row between" style={{ margin: '10px 0 7px' }}>
                <span className="small bold">
                  {t('achievements.badgesProgress', { count: badgeCount, total: badgeTotal })}
                </span>
                <span className="small muted">{badgePct}%</span>
              </div>
              <ProgressBar pct={(badgeCount / Math.max(1, badgeTotal)) * 100} />
              <p className="small muted" style={{ marginTop: 9 }}>
                {t('achievements.badgesNote')}
              </p>
            </div>
          </div>

          {badgeCount === 0 && (
            <div className="card pad center">
              <Mascot mood="think" size={96} />
              <h3 style={{ marginTop: 6 }}>{t('achievements.badgesEmptyTitle')}</h3>
              <p className="small muted" style={{ margin: '6px 0 14px' }}>
                {t('achievements.badgesEmptyBody')}
              </p>
              <div className="row wrap" style={{ justifyContent: 'center' }}>
                <button type="button" className="btn btn-primary" onClick={() => navigate('/focus')}>
                  {t('achievements.badgesEmptyFocus')}
                </button>
                <button type="button" className="btn btn-soft" onClick={() => navigate('/notes')}>
                  {t('achievements.badgesEmptyNote')}
                </button>
              </div>
            </div>
          )}

          <div className="section-title">{t('achievements.badgesAll')}</div>

          <div className="badge-grid">
            {ACHIEVEMENTS.map((def) => {
              const at = owned.get(def.id);
              const isUnlocked = at !== undefined;
              const progress = isUnlocked ? null : badgeProgress(def.id, stats, data, t);
              return (
                <div key={def.id} className={`badge-card card pad ${isUnlocked ? '' : 'locked'}`}>
                  <span className="badge-icon" role="img" aria-label={def.name}>
                    {def.icon}
                  </span>
                  <div className="bold">{def.name}</div>
                  <div className="small muted" style={{ marginTop: 2 }}>
                    {def.desc}
                  </div>
                  {isUnlocked ? (
                    <span className="badge-date">
                      {t('achievements.badgesUnlockedOn', { date: new Date(at).toLocaleDateString() })}
                    </span>
                  ) : progress?.kind === 'bar' ? (
                    <div className="badge-progress">
                      <ProgressBar tiny pct={(progress.value / Math.max(1, progress.target)) * 100} />
                      <div className="badge-count">
                        {Math.min(progress.value, progress.target)}/{progress.target}
                      </div>
                    </div>
                  ) : progress?.kind === 'hint' ? (
                    <div className="badge-hint">
                      <Ic name="lightbulb" size={15} className="inline-icon" /> {progress.text}
                    </div>
                  ) : (
                    <div className="badge-hint">{t('achievements.badgesKeepGoing')}</div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'stickers' && (
        <>
          <div className="card pad badge-head">
            <MascotDock
              mood={stickerCount === 0 ? 'think' : stickerCount === stickerTotal ? 'cheer' : 'love'}
              size={72}
              message={
                stickerCount === 0
                  ? t('achievements.stickersNone')
                  : stickerCount === stickerTotal
                    ? t('achievements.stickersFull', { count: stickerCount })
                    : t('achievements.stickersSome')
              }
            />
            <div className="grow">
              <div className="row between wrap" style={{ gap: 8 }}>
                <div className="page-title" role="heading" aria-level={2}>{t('achievements.stickersTitle')}</div>
                <span className="tag">
                  <Ic name="palette" size={15} className="inline-icon" /> {stickerCount}/{stickerTotal}
                </span>
              </div>
              <div className="row between" style={{ margin: '10px 0 7px' }}>
                <span className="small bold">
                  {t('achievements.stickersProgress', { count: stickerCount, total: stickerTotal })}
                </span>
                <span className="small muted">{stickerPct}%</span>
              </div>
              <ProgressBar pct={(stickerCount / Math.max(1, stickerTotal)) * 100} />
            </div>
          </div>

          <div className="section-title">{t('achievements.stickersAll')}</div>

          <div className="sticker-grid">
            {STICKERS.map((def, i) => {
              const isUnlocked = stickerOwned.has(def.id);
              return (
                <div key={def.id} className={`sticker-card ${isUnlocked ? '' : 'locked'}`}>
                  <span className="tag sticker-milestone">
                    {i + 1}/{stickerTotal}
                  </span>
                  <span className="sticker-emoji" role="img" aria-label={def.name}>
                    {def.emoji}
                  </span>
                  <div className="sticker-name">{def.name}</div>
                  <div className="sticker-desc">{isUnlocked ? def.desc : <><Ic name="lock" size={14} className="inline-icon" /> {def.desc}</>}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'outfits' && (
        <>
          <div className="card pad">
            <div className="closet-top">
              <div className="closet-preview">
                <Mascot size={140} outfit={previewId} mood={previewing ? 'love' : 'idle'} />
                <span className="small muted">
                  {previewing
                    ? t('achievements.outfitsPreview', { name: previewName })
                    : t('achievements.outfitsWearing', { name: previewName })}
                </span>
              </div>
              <div className="closet-side">
                <div className="row between wrap" style={{ gap: 8 }}>
                  <div className="page-title" role="heading" aria-level={2}>{t('achievements.outfitsTitle')}</div>
                  <span className="tag">
                    <Ic name="shirt" size={15} className="inline-icon" /> {outfitCount}/{outfitTotal}
                  </span>
                </div>
              </div>
            </div>

            <div className="outfit-row" style={{ marginTop: 14 }} onMouseLeave={() => setHoveredOutfit(null)}>
              <button
                type="button"
                className={`outfit-chip ${wornOutfit === 'none' ? 'active' : ''}`}
                aria-pressed={wornOutfit === 'none'}
                onMouseEnter={() => setHoveredOutfit('none')}
                onMouseLeave={() => setHoveredOutfit(null)}
                onFocus={() => setHoveredOutfit('none')}
                onBlur={() => setHoveredOutfit(null)}
                onClick={() => setSettings({ mascotOutfit: 'none' })}
              >
                {t('achievements.outfitsPlain')}
              </button>
              {OUTFITS.map((def) => {
                const isOwned = outfitOwned.has(def.id);
                if (!isOwned) {
                  return (
                    <button
                      key={def.id}
                      type="button"
                      className="outfit-chip locked"
                      disabled
                      title={`🔒 ${def.desc}`}
                      onMouseEnter={() => setHoveredOutfit(def.id)}
                      onMouseLeave={() => setHoveredOutfit(null)}
                      onFocus={() => setHoveredOutfit(def.id)}
                      onBlur={() => setHoveredOutfit(null)}
                    >
                      <span aria-hidden="true">{def.emoji}</span> {def.name}{' '}
                      <Ic name="lock" size={14} className="inline-icon" /> {def.desc}
                    </button>
                  );
                }
                return (
                  <button
                    key={def.id}
                    type="button"
                    className={`outfit-chip ${wornOutfit === def.id ? 'active' : ''}`}
                    aria-pressed={wornOutfit === def.id}
                    onMouseEnter={() => setHoveredOutfit(def.id)}
                    onMouseLeave={() => setHoveredOutfit(null)}
                    onFocus={() => setHoveredOutfit(def.id)}
                    onBlur={() => setHoveredOutfit(null)}
                    onClick={() => setSettings({ mascotOutfit: def.id })}
                  >
                    <span aria-hidden="true">{def.emoji}</span> {def.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card pad">
            <p className="small muted" style={{ margin: 0 }}>
              {t('achievements.outfitsHint')}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
