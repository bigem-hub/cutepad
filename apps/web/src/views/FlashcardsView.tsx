import { useMemo, useState } from 'react';
import {
  PALETTE,
  deckProgress,
  dueCards,
  previewIntervals,
  retentionRate,
  useApp,
  type CardTemplate,
  type Deck,
  type Flashcard,
  type Rating,
} from '@cutepad/core';
import {
  EmptyState,
  FlipCard,
  MascotDock,
  Ic,
  Modal,
  ProgressBar,
  Segmented,
  Tabs,
  type SegmentedOption,
} from '@cutepad/ui';
import { useNow } from '../hooks';
import { useT } from '../i18n';
import './FlashcardsView.css';

const ICONS = ['🎴', '🧠', '🌸', '🧪', '📖', '🎨'];
const QUEUE_CAP = 20;

const RATINGS: { key: Rating; labelKey: string }[] = [
  { key: 'again', labelKey: 'flashcards.rateAgain' },
  { key: 'hard', labelKey: 'flashcards.rateHard' },
  { key: 'good', labelKey: 'flashcards.rateGood' },
  { key: 'easy', labelKey: 'flashcards.rateEasy' },
];

interface DeckDraft {
  id: string | null;
  name: string;
  icon: string;
  color: string;
  description: string;
}

interface CardDraft {
  id: string | null;
  deckId: string;
  front: string;
  back: string;
  template: CardTemplate;
  tags: string;
}

interface Session {
  deckId: string;
  queue: string[];
  index: number;
  startedAt: number;
}

function ClozeText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[\[[^\]]*\]\])/g).map((part, i) =>
        part.startsWith('[[') && part.endsWith(']]') ? (
          <mark className="fc-cloze" key={i}>
            {part.slice(2, -2)}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

export default function FlashcardsView() {
  const t = useT();
  const now = useNow(60000).getTime();

  const decks = useApp((s) => s.decks);
  const flashcards = useApp((s) => s.flashcards);
  const reviewLogs = useApp((s) => s.reviewLogs);
  const addDeck = useApp((s) => s.addDeck);
  const updateDeck = useApp((s) => s.updateDeck);
  const deleteDeck = useApp((s) => s.deleteDeck);
  const addCard = useApp((s) => s.addCard);
  const updateCard = useApp((s) => s.updateCard);
  const deleteCard = useApp((s) => s.deleteCard);
  const reviewCard = useApp((s) => s.reviewCard);
  const pushEvent = useApp((s) => s.pushEvent);

  const [tab, setTab] = useState<string>('decks');
  const [deckDraft, setDeckDraft] = useState<DeckDraft | null>(null);
  const [cardDraft, setCardDraft] = useState<CardDraft | null>(null);
  const [studyDeckId, setStudyDeckId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [notice, setNotice] = useState<'due' | 'emptyDeck' | null>(null);
  const [query, setQuery] = useState('');
  const [browseDeckId, setBrowseDeckId] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const cardsByDeck = useMemo(() => {
    const map = new Map<string, Flashcard[]>();
    for (const deck of decks) map.set(deck.id, []);
    for (const card of flashcards) {
      const list = map.get(card.deckId);
      if (list) list.push(card);
    }
    return map;
  }, [decks, flashcards]);

  const browseCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return flashcards
      .filter((c) => browseDeckId === 'all' || c.deckId === browseDeckId)
      .filter(
        (c) =>
          !q ||
          c.front.toLowerCase().includes(q) ||
          c.back.toLowerCase().includes(q) ||
          c.tags.some((tag) => tag.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [flashcards, query, browseDeckId]);

  const deckById = (id: string): Deck | undefined => decks.find((d) => d.id === id);
  const studyDeck = deckById(studyDeckId ?? '') ?? decks[0] ?? null;
  const studyCards = studyDeck ? (cardsByDeck.get(studyDeck.id) ?? []) : [];
  const studyProgress = deckProgress(studyCards, now);
  const dueTotal = deckProgress(flashcards, now).due;
  const filtering = query.trim().length > 0 || browseDeckId !== 'all';

  const activeQueue = useMemo(() => {
    if (!session) return [];
    const live = new Set(flashcards.map((c) => c.id));
    return session.queue.filter((id) => live.has(id));
  }, [session, flashcards]);

  const sessionDone = !!session && session.index >= activeQueue.length;
  const currentId = session && !sessionDone ? activeQueue[session.index] : null;
  const current = currentId ? flashcards.find((c) => c.id === currentId) : undefined;
  const intervals = current ? previewIntervals(current, now) : null;

  let retention = 0;
  if (sessionDone && session) {
    const queueSet = new Set(session.queue);
    retention = retentionRate(
      reviewLogs.filter((l) => l.reviewedAt >= session.startedAt && queueSet.has(l.cardId)),
    );
  }

  const templateOptions: SegmentedOption<CardTemplate>[] = [
    { value: 'basic', label: t('flashcards.tplBasic') },
    { value: 'reverse', label: t('flashcards.tplReverse') },
    { value: 'cloze', label: t('flashcards.tplCloze') },
  ];

  const openNewDeck = () =>
    setDeckDraft({ id: null, name: '', icon: ICONS[0], color: PALETTE[1], description: '' });

  const openEditDeck = (deck: Deck) =>
    setDeckDraft({
      id: deck.id,
      name: deck.name,
      icon: deck.icon,
      color: deck.color,
      description: deck.description,
    });

  const saveDeck = () => {
    if (!deckDraft) return;
    const name = deckDraft.name.trim();
    if (!name) return;
    if (deckDraft.id) {
      updateDeck(deckDraft.id, {
        name,
        icon: deckDraft.icon,
        color: deckDraft.color,
        description: deckDraft.description.trim(),
      });
    } else {
      addDeck(name, deckDraft.icon, deckDraft.color, deckDraft.description.trim());
    }
    setDeckDraft(null);
  };

  const removeDeck = (deck: Deck): boolean => {
    if (!window.confirm(t('flashcards.deckDeleteConfirm', { name: deck.name }))) return false;
    deleteDeck(deck.id);
    if (session?.deckId === deck.id) setSession(null);
    if (studyDeckId === deck.id) setStudyDeckId(null);
    if (browseDeckId === deck.id) setBrowseDeckId('all');
    return true;
  };

  const pickDeck = (id: string) => {
    setStudyDeckId(id);
    setSession(null);
    setNotice(null);
    setTab('study');
  };

  const startStudy = (deckId: string) => {
    const cards = cardsByDeck.get(deckId) ?? [];
    if (cards.length === 0) {
      setSession(null);
      setNotice('emptyDeck');
      return;
    }
    const seen = new Set<string>();
    const queue: string[] = [];
    for (const card of [...dueCards(cards, now), ...cards.filter((c) => c.srs.state === 'new')]) {
      if (seen.has(card.id)) continue;
      seen.add(card.id);
      queue.push(card.id);
      if (queue.length >= QUEUE_CAP) break;
    }
    if (queue.length === 0) {
      setSession(null);
      setNotice('due');
      return;
    }
    setNotice(null);
    setFlipped(false);
    setSession({ deckId, queue, index: 0, startedAt: Date.now() });
  };

  const rate = (rating: Rating) => {
    if (!session || !current) return;
    reviewCard(current.id, rating);
    setFlipped(false);
    const next = session.index + 1;
    if (next >= activeQueue.length) pushEvent('celebrate', t('flashcards.doneEvent'));
    setSession({ ...session, index: next });
  };

  const openAddCard = () =>
    setCardDraft({
      id: null,
      deckId: studyDeck?.id ?? decks[0]?.id ?? '',
      front: '',
      back: '',
      template: 'basic',
      tags: '',
    });

  const openEditCard = (card: Flashcard) =>
    setCardDraft({
      id: card.id,
      deckId: card.deckId,
      front: card.front,
      back: card.back,
      template: card.template,
      tags: card.tags.join(', '),
    });

  const saveCard = () => {
    if (!cardDraft) return;
    const front = cardDraft.front.trim();
    const back = cardDraft.back.trim();
    if (!front || !back || !cardDraft.deckId) return;
    const tags = cardDraft.tags
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (cardDraft.id) {
      updateCard(cardDraft.id, {
        deckId: cardDraft.deckId,
        front,
        back,
        template: cardDraft.template,
        tags,
      });
    } else {
      addCard({ deckId: cardDraft.deckId, front, back, template: cardDraft.template, tags });
    }
    setCardDraft(null);
  };

  const removeCard = (card: Flashcard) => {
    if (!window.confirm(t('flashcards.cardDeleteConfirm'))) return;
    deleteCard(card.id);
    if (expandedId === card.id) setExpandedId(null);
  };

  const newDeckAction = (
    <button type="button" className="btn btn-primary" onClick={openNewDeck}>
      {t('flashcards.newDeck')}
    </button>
  );

  const noDecksState = (
    <EmptyState
      icon="layers"
      title={t('flashcards.emptyDecksTitle')}
      hint={t('flashcards.emptyDecksHint')}
      action={newDeckAction}
    />
  );

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head">
        <div>
          <div className="page-title" role="heading" aria-level={1}>{t('flashcards.title')}</div>
          <div className="page-sub">{t('flashcards.sub')}</div>
        </div>
        <span className="spacer" />
        {tab === 'decks' && (
          <button type="button" className="btn btn-primary" onClick={openNewDeck}>
            {t('flashcards.newDeck')}
          </button>
        )}
        {tab === 'browse' && decks.length > 0 && (
          <button type="button" className="btn btn-primary" onClick={openAddCard}>
            {t('flashcards.addCard')}
          </button>
        )}
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'decks', icon: 'book', label: t('flashcards.tabDecks') },
          {
            id: 'study',
            icon: 'play',
            label: t('flashcards.tabStudy'),
            badge: dueTotal > 0 ? dueTotal : undefined,
          },
          { id: 'browse', icon: 'layoutGrid', label: t('flashcards.tabBrowse') },
        ]}
      />

      {tab === 'decks' && (
        <>
          {decks.length === 0 ? (
            noDecksState
          ) : (
            <div className="grid wide">
              {decks.map((deck) => {
                const p = deckProgress(cardsByDeck.get(deck.id) ?? [], now);
                return (
                  <div key={deck.id} className="card pad">
                    <div className="row between wrap" style={{ gap: 8 }}>
                      <div className="fc-deck-head">
                        <span className="fc-deck-icon" style={{ background: deck.color }}>
                          {deck.icon}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div className="bold">{deck.name}</div>
                          {deck.description && (
                            <div className="small muted fc-truncate">{deck.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="row" style={{ gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-soft"
                          title={t('common.edit')}
                          aria-label={t('common.edit')}
                          onClick={() => openEditDeck(deck)}
                        >
                          <Ic name="pencil" size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          title={t('common.delete')}
                          aria-label={t('common.delete')}
                          onClick={() => removeDeck(deck)}
                        >
                          <Ic name="trash" size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="fc-stats">
                      <span className="tag">
                        <Ic name="layers" size={15} /> {p.total} {t('flashcards.statCards')}
                      </span>
                      <span className="tag">
                        <Ic name="checkCircle" size={15} /> {p.learned} {t('flashcards.statLearned')}
                      </span>
                      <span className="tag">
                        <Ic name="alarm" size={15} /> {p.due} {t('flashcards.statDue')}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-block"
                      onClick={() => pickDeck(deck.id)}
                    >
                      <Ic name="play" size={15} /> {t('flashcards.tabStudy')}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'study' && (
        <>
          {session ? (
            sessionDone ? (
              <div className="card pad center">
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <MascotDock mood="cheer" size={104} message={t('flashcards.doneTitle')} />
                </div>
                <p className="small bold" style={{ marginTop: 10 }}>
                  {t('flashcards.doneHint', { n: session.queue.length })}
                </p>
                <span className="pill">
                  <Ic name="target" size={15} /> {t('flashcards.retention')}: {retention}%
                </span>
                <div className="row wrap" style={{ justifyContent: 'center', gap: 10, marginTop: 16 }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => startStudy(session.deckId)}
                  >
                    {t('flashcards.studyAgain')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-soft"
                    onClick={() => {
                      setSession(null);
                      setTab('decks');
                    }}
                  >
                    {t('flashcards.backToDecks')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="card pad">
                {current && (
                  <>
                    <div className="row between wrap" style={{ gap: 8, marginBottom: 8 }}>
                      <strong style={{ fontFamily: 'var(--font-display)' }}>
                        {session.index + 1} / {session.queue.length}
                      </strong>
                      <span className="pill small">
                        <span
                          className="dot"
                          style={{ background: deckById(session.deckId)?.color ?? '#e3d1ff' }}
                        />
                        <span aria-hidden="true">{deckById(session.deckId)?.icon}</span>{' '}
                        {deckById(session.deckId)?.name}
                      </span>
                    </div>
                    <ProgressBar pct={(session.index / Math.max(1, session.queue.length)) * 100} />
                    <div style={{ marginTop: 14 }}>
                      <FlipCard
                        flipped={flipped}
                        onFlip={() => setFlipped((f) => !f)}
                        minHeight={230}
                        label={t('flashcards.flipHint')}
                        front={
                          <div className="fc-front">
                            {current.template === 'cloze' ? (
                              <ClozeText text={current.front} />
                            ) : (
                              current.front
                            )}
                          </div>
                        }
                        back={<div className="center fc-back-body">{current.back}</div>}
                      />
                    </div>
                    {!flipped && (
                      <div className="center small muted" style={{ marginTop: 8 }}>
                        {t('flashcards.flipHint')}
                      </div>
                    )}
                    <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
                      {current.tags.map((tag) => (
                        <span className="tag small" key={tag}>
                          {tag}
                        </span>
                      ))}
                      {current.sourceNoteId && (
                        <span className="tag small">
                          <Ic name="notes" size={15} /> {t('flashcards.fromNote')}
                        </span>
                      )}
                    </div>
                    <div className="fc-rates" style={{ marginTop: 14 }}>
                      {RATINGS.map((r) => (
                        <button
                          key={r.key}
                          type="button"
                          className={`fc-rate ${r.key}`}
                          onClick={() => rate(r.key)}
                        >
                          <span className="fc-rate-label">{t(r.labelKey)}</span>
                          <span className="fc-rate-interval">{intervals?.[r.key]}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          ) : decks.length === 0 ? (
            noDecksState
          ) : (
            <div className="card pad">
              <div className="card-title">
                <Ic name="play" size={15} /> {t('flashcards.studyPickDeck')}
              </div>
              <div className="row wrap" style={{ gap: 8 }}>
                {decks.map((deck) => (
                  <button
                    key={deck.id}
                    type="button"
                    className={`chip ${studyDeck?.id === deck.id ? 'active' : ''}`}
                    aria-pressed={studyDeck?.id === deck.id}
                    onClick={() => {
                      setStudyDeckId(deck.id);
                      setSession(null);
                      setNotice(null);
                    }}
                  >
                    <span aria-hidden="true">{deck.icon}</span> {deck.name}
                  </button>
                ))}
              </div>
              {studyDeck && (
                <>
                  <div className="fc-stats">
                    <span className="tag">
                      <Ic name="alarm" size={15} /> {studyProgress.due} {t('flashcards.statDue')}
                    </span>
                    <span className="tag">
                      <Ic name="sparkle" size={15} /> {studyCards.filter((c) => c.srs.state === 'new').length}{' '}
                      {t('flashcards.statNew')}
                    </span>
                    <span className="tag">
                      <Ic name="layers" size={15} /> {studyProgress.total} {t('flashcards.statCards')}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    onClick={() => startStudy(studyDeck.id)}
                  >
                    {t('flashcards.studyStart')}
                  </button>
                </>
              )}
            </div>
          )}
          {notice === 'due' && (
            <EmptyState
              icon="moon"
              title={t('flashcards.studyNothingDueTitle')}
              hint={t('flashcards.studyNothingDueHint')}
            />
          )}
          {notice === 'emptyDeck' && (
            <EmptyState
              icon="pencil"
              title={t('flashcards.studyEmptyDeckTitle')}
              hint={t('flashcards.studyEmptyDeckHint')}
              action={
                <button type="button" className="btn btn-primary" onClick={() => setTab('browse')}>
                  {t('flashcards.addCard')}
                </button>
              }
            />
          )}
        </>
      )}

      {tab === 'browse' && (
        <>
          {decks.length === 0 ? (
            noDecksState
          ) : (
            <>
              <div className="card pad">
                <div className="card-title">
                  <Ic name="layers" size={15} /> {t('flashcards.tabBrowse')}
                  <span className="spacer" />
                  <span className="small muted">
                    {browseCards.length} {t('flashcards.statCards')}
                  </span>
                </div>
                <div className="row wrap" style={{ gap: 10 }}>
                  <input
                    className="input"
                    style={{ flex: 2, minWidth: 180 }}
                    placeholder={t('flashcards.searchPlaceholder')}
                    aria-label={t('flashcards.searchPlaceholder')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <select
                    className="select"
                    style={{ flex: 1, minWidth: 150 }}
                    aria-label={t('flashcards.cardDeck')}
                    value={browseDeckId}
                    onChange={(e) => setBrowseDeckId(e.target.value)}
                  >
                    <option value="all">{t('flashcards.allDecks')}</option>
                    {decks.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.icon} {deck.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {browseCards.length === 0 ? (
                filtering ? (
                  <EmptyState
                    icon="search"
                    title={t('flashcards.noResultsTitle')}
                    hint={t('flashcards.noResultsHint')}
                  />
                ) : (
                  <EmptyState
                    icon="pencil"
                    title={t('flashcards.emptyCardsTitle')}
                    hint={t('flashcards.emptyCardsHint')}
                    action={
                      <button type="button" className="btn btn-primary" onClick={openAddCard}>
                        {t('flashcards.addCard')}
                      </button>
                    }
                  />
                )
              ) : (
                <div className="stack" style={{ gap: 8 }}>
                  {browseCards.map((card) => {
                    const deck = deckById(card.deckId);
                    const open = expandedId === card.id;
                    return (
                      <div key={card.id} className="card pad" style={{ padding: 14 }}>
                        <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-soft"
                            aria-label={open ? t('flashcards.hideBack') : t('flashcards.showBack')}
                            aria-expanded={open}
                            onClick={() => setExpandedId(open ? null : card.id)}
                          >
                            {open ? '▾' : '▸'}
                          </button>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="bold small fc-truncate">{card.front}</div>
                            {open && (
                              <div className="small fc-back-body" style={{ marginTop: 6 }}>
                                {card.back}
                              </div>
                            )}
                            <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
                              <span className="pill small">
                                <span
                                  className="dot"
                                  style={{ background: deck?.color ?? '#e3d1ff' }}
                                />
                                <span aria-hidden="true">{deck?.icon}</span> {deck?.name}
                              </span>
                              <span className="tag small">
                                {card.template === 'basic'
                                  ? t('flashcards.tplBasic')
                                  : card.template === 'reverse'
                                    ? t('flashcards.tplReverse')
                                    : t('flashcards.tplCloze')}
                              </span>
                              {card.tags.map((tag) => (
                                <span className="tag small" key={tag}>
                                  {tag}
                                </span>
                              ))}
                              {card.sourceNoteId && (
                                <span className="tag small">
                                  <Ic name="notes" size={15} /> {t('flashcards.fromNote')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="row" style={{ gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-soft"
                              title={t('common.edit')}
                              aria-label={t('common.edit')}
                              onClick={() => openEditCard(card)}
                            >
                              <Ic name="pencil" size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              title={t('common.delete')}
                              aria-label={t('common.delete')}
                              onClick={() => removeCard(card)}
                            >
                              <Ic name="trash" size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      <Modal
        open={deckDraft !== null}
        title={deckDraft?.id ? t('flashcards.editDeckTitle') : t('flashcards.newDeckTitle')}
        onClose={() => setDeckDraft(null)}
        actions={
          <>
            {deckDraft?.id && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  const id = deckDraft?.id;
                  const target = id ? deckById(id) : undefined;
                  if (!target || removeDeck(target)) setDeckDraft(null);
                }}
              >
                {t('common.delete')}
              </button>
            )}
            <button type="button" className="btn" onClick={() => setDeckDraft(null)}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={saveDeck}
              disabled={!deckDraft?.name.trim()}
            >
              {deckDraft?.id ? t('common.save') : t('common.create')}
            </button>
          </>
        }
      >
        {deckDraft && (
          <div className="stack">
            <label className="field-label" htmlFor="fc-deck-name">
              {t('flashcards.deckName')}
            </label>
            <input
              id="fc-deck-name"
              className="input"
              autoFocus
              placeholder={t('flashcards.deckNamePlaceholder')}
              value={deckDraft.name}
              onChange={(e) => setDeckDraft({ ...deckDraft, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && saveDeck()}
            />
            <label className="field-label" id="fc-deck-icon-label">
              {t('flashcards.deckIcon')}
            </label>
            <div className="row wrap" style={{ gap: 6 }} role="group" aria-labelledby="fc-deck-icon-label">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className={`chip ${deckDraft.icon === icon ? 'active' : ''}`}
                  aria-label={`deck icon ${icon}`}
                  aria-pressed={deckDraft.icon === icon}
                  onClick={() => setDeckDraft({ ...deckDraft, icon })}
                >
                  {icon}
                </button>
              ))}
            </div>
            <label className="field-label" id="fc-deck-color-label">
              {t('flashcards.deckColor')}
            </label>
            <div className="row wrap" style={{ gap: 8 }} role="group" aria-labelledby="fc-deck-color-label">
              {PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="fc-swatch"
                  aria-label={color}
                  aria-pressed={deckDraft.color === color}
                  style={{
                    background: color,
                    outline: deckDraft.color === color ? '2px solid var(--accent)' : 'none',
                  }}
                  onClick={() => setDeckDraft({ ...deckDraft, color })}
                />
              ))}
            </div>
            <label className="field-label" htmlFor="fc-deck-desc">
              {t('flashcards.deckDesc')}
            </label>
            <input
              id="fc-deck-desc"
              className="input"
              placeholder={t('flashcards.deckDescPlaceholder')}
              value={deckDraft.description}
              onChange={(e) => setDeckDraft({ ...deckDraft, description: e.target.value })}
            />
          </div>
        )}
      </Modal>

      <Modal
        open={cardDraft !== null}
        title={cardDraft?.id ? t('flashcards.editCardTitle') : t('flashcards.addCardTitle')}
        onClose={() => setCardDraft(null)}
        actions={
          <>
            <button type="button" className="btn" onClick={() => setCardDraft(null)}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={saveCard}
              disabled={!cardDraft?.front.trim() || !cardDraft?.back.trim() || !cardDraft?.deckId}
            >
              {cardDraft?.id ? t('common.save') : t('common.add')}
            </button>
          </>
        }
      >
        {cardDraft && (
          <div className="stack">
            <label className="field-label" htmlFor="fc-card-deck">
              {t('flashcards.cardDeck')}
            </label>
            <select
              id="fc-card-deck"
              className="select"
              value={cardDraft.deckId}
              onChange={(e) => setCardDraft({ ...cardDraft, deckId: e.target.value })}
            >
              {decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.icon} {deck.name}
                </option>
              ))}
            </select>
            <label className="field-label" htmlFor="fc-card-front">
              {t('flashcards.cardFront')}
            </label>
            <input
              id="fc-card-front"
              className="input"
              autoFocus
              placeholder={t('flashcards.cardFrontPlaceholder')}
              value={cardDraft.front}
              onChange={(e) => setCardDraft({ ...cardDraft, front: e.target.value })}
            />
            <label className="field-label" htmlFor="fc-card-back">
              {t('flashcards.cardBack')}
            </label>
            <textarea
              id="fc-card-back"
              className="input"
              rows={3}
              placeholder={t('flashcards.cardBackPlaceholder')}
              value={cardDraft.back}
              onChange={(e) => setCardDraft({ ...cardDraft, back: e.target.value })}
            />
            <label className="field-label">{t('flashcards.cardTemplate')}</label>
            <Segmented
              value={cardDraft.template}
              onChange={(value) => setCardDraft({ ...cardDraft, template: value })}
              options={templateOptions}
            />
            {cardDraft.template === 'cloze' && (
              <div className="tag">
                <Ic name="lightbulb" size={15} /> {t('flashcards.clozeHint')}
              </div>
            )}
            <label className="field-label" htmlFor="fc-card-tags">
              {t('flashcards.cardTags')}
            </label>
            <input
              id="fc-card-tags"
              className="input"
              placeholder={t('flashcards.cardTagsPlaceholder')}
              value={cardDraft.tags}
              onChange={(e) => setCardDraft({ ...cardDraft, tags: e.target.value })}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
