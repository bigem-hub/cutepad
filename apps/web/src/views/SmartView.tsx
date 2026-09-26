import { useState } from 'react';
import {
  aiMakeCards,
  aiMakeQuiz,
  aiSuggestSchedule,
  aiSummarize,
  kindEmoji,
  parseSyllabus,
  selectData,
  useApp,
  type AiEngine,
  type GeneratedCard,
  type QuizItem,
  type ScheduleSuggestion,
  type SyllabusItem,
} from '@cutepad/core';
import { EmptyState, MascotDock, ProgressBar, Tabs } from '@cutepad/ui';
import { useHashRoute } from '../hooks';
import { useT } from '../i18n';
import './SmartView.css';

type TFn = ReturnType<typeof useT>;

const NEW_DECK = '__new';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function fmtDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return key;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function Feedback({ kind, text }: { kind: 'error' | 'ok'; text: string }) {
  return (
    <div className={`smart-feedback ${kind}`} role="status">
      <span aria-hidden="true">{kind === 'error' ? '⚠️' : '🎉'}</span> {text}
    </div>
  );
}

export default function SmartView() {
  const [route, navigate] = useHashRoute();
  const t: TFn = useT();

  const notes = useApp((s) => s.notes);
  const decks = useApp((s) => s.decks);
  const subjects = useApp((s) => s.subjects);
  const ai = useApp((s) => s.settings.ai);
  const addNote = useApp((s) => s.addNote);
  const addTask = useApp((s) => s.addTask);
  const addBlock = useApp((s) => s.addBlock);
  const addDeck = useApp((s) => s.addDeck);
  const importCards = useApp((s) => s.importCards);
  const pushEvent = useApp((s) => s.pushEvent);

  const remote = ai.provider === 'openai' && ai.apiKey.trim().length > 0;
  const engineLabel = remote ? t('smart.engineRemote') : t('smart.engineLocal');

  const [tab, setTab] = useState<string>(() => (route.includes('tab=syllabus') ? 'syllabus' : 'summarize'));

  // ---- shared note picking ----
  const [noteQuery, setNoteQuery] = useState('');
  const [noteId, setNoteId] = useState('');
  const activeNote = notes.find((n) => n.id === noteId) ?? notes[0] ?? null;
  const query = noteQuery.trim().toLowerCase();
  const matching = query ? notes.filter((n) => n.title.toLowerCase().includes(query)) : notes;
  const noteOptions = activeNote && !matching.includes(activeNote) ? [activeNote, ...matching] : matching;

  // ---- summarize ----
  const [sumBusy, setSumBusy] = useState(false);
  const [sumBullets, setSumBullets] = useState<string[] | null>(null);
  const [sumEngine, setSumEngine] = useState<AiEngine>('local');
  const [sumErr, setSumErr] = useState<string | null>(null);
  const [sumSaved, setSumSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // ---- flashcards ----
  const [cardsBusy, setCardsBusy] = useState(false);
  const [cards, setCards] = useState<GeneratedCard[]>([]);
  const [cardChecked, setCardChecked] = useState<boolean[]>([]);
  const [cardsErr, setCardsErr] = useState<string | null>(null);
  const [cardsMsg, setCardsMsg] = useState<string | null>(null);
  const [deckChoice, setDeckChoice] = useState('');
  const [newDeckName, setNewDeckName] = useState('');
  const deckValue = deckChoice || decks[0]?.id || NEW_DECK;
  const checkedCards = cards.filter((_, i) => cardChecked[i] === true);
  const allCardsChecked = cards.length > 0 && checkedCards.length === cards.length;

  // ---- quiz ----
  const [quizBusy, setQuizBusy] = useState(false);
  const [quiz, setQuiz] = useState<QuizItem[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [quizErr, setQuizErr] = useState<string | null>(null);
  const [showScore, setShowScore] = useState(false);
  const current: QuizItem | undefined = quiz[qIndex];
  const score = results.filter(Boolean).length;
  const scorePct = quiz.length > 0 ? Math.round((score / quiz.length) * 100) : 0;

  // ---- schedule ----
  const [ideas, setIdeas] = useState<ScheduleSuggestion[]>(() =>
    aiSuggestSchedule(selectData(useApp.getState())),
  );
  const [added, setAdded] = useState<Set<string>>(() => new Set<string>());
  const [ideaErr, setIdeaErr] = useState<string | null>(null);

  // ---- syllabus ----
  const [syText, setSyText] = useState('');
  const [syBusy, setSyBusy] = useState(false);
  const [syItems, setSyItems] = useState<SyllabusItem[] | null>(null);
  const [syChecked, setSyChecked] = useState<boolean[]>([]);
  const [syErr, setSyErr] = useState<string | null>(null);
  const [syMsg, setSyMsg] = useState<string | null>(null);
  const checkedItems = (syItems ?? []).filter((_, i) => syChecked[i] === true);

  const pickNote = (id: string) => {
    setNoteId(id);
    setSumBullets(null);
    setSumErr(null);
    setSumSaved(false);
    setCopied(false);
    setCards([]);
    setCardChecked([]);
    setCardsErr(null);
    setCardsMsg(null);
    setQuiz([]);
    setQuizErr(null);
    setQIndex(0);
    setChosen(null);
    setResults([]);
    setShowScore(false);
  };

  // ================= summarize =================
  const runSummarize = async () => {
    if (!activeNote) return;
    setSumBusy(true);
    setSumErr(null);
    setSumSaved(false);
    setCopied(false);
    try {
      const res = await aiSummarize(activeNote.text, activeNote.title, ai);
      setSumBullets(res.bullets);
      setSumEngine(res.engine);
    } catch (err) {
      setSumBullets(null);
      setSumErr(errText(err));
    } finally {
      setSumBusy(false);
    }
  };

  const copySummary = async () => {
    if (!sumBullets) return;
    try {
      await navigator.clipboard.writeText(sumBullets.map((b) => `• ${b}`).join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setSumErr(t('smart.copyFailed'));
    }
  };

  const saveSummary = () => {
    if (!activeNote || !sumBullets || sumBullets.length === 0) return;
    try {
      const html = `<ul>${sumBullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`;
      addNote({ title: t('smart.summaryTitle', { title: activeNote.title }), html });
      setSumSaved(true);
    } catch (err) {
      setSumErr(errText(err));
    }
  };

  // ================= flashcards =================
  const generateCards = async () => {
    if (!activeNote) return;
    setCardsBusy(true);
    setCardsErr(null);
    setCardsMsg(null);
    try {
      const res = await aiMakeCards(activeNote.text, activeNote.title, ai, 10);
      setCards(res.cards);
      setCardChecked(res.cards.map(() => true));
    } catch (err) {
      setCards([]);
      setCardChecked([]);
      setCardsErr(errText(err));
    } finally {
      setCardsBusy(false);
    }
  };

  const importSelectedCards = () => {
    setCardsErr(null);
    setCardsMsg(null);
    if (checkedCards.length === 0) {
      setCardsErr(t('smart.selectCards'));
      return;
    }
    let deckId = deckValue;
    let deckName = decks.find((d) => d.id === deckId)?.name ?? '';
    if (deckId === NEW_DECK) {
      const name = newDeckName.trim();
      if (!name) {
        setCardsErr(t('smart.deckNameNeeded'));
        return;
      }
      deckId = addDeck(name);
      deckName = name;
      setDeckChoice(deckId);
      setNewDeckName('');
    }
    try {
      const n = importCards(
        deckId,
        checkedCards.map((c) => ({ front: c.front, back: c.back })),
      );
      const msg = t('smart.cardsImported', { n, deck: deckName });
      setCardsMsg(msg);
      pushEvent('celebrate', msg);
    } catch (err) {
      setCardsErr(errText(err));
    }
  };

  // ================= quiz =================
  const resetQuiz = () => {
    setQIndex(0);
    setChosen(null);
    setResults([]);
    setShowScore(false);
    setQuizErr(null);
  };

  const makeQuiz = async () => {
    if (!activeNote) return;
    setQuizBusy(true);
    setQuizErr(null);
    try {
      const res = await aiMakeQuiz(activeNote.text, activeNote.title, ai, 5);
      setQuiz(res.quiz);
      resetQuiz();
    } catch (err) {
      setQuiz([]);
      resetQuiz();
      setQuizErr(errText(err));
    } finally {
      setQuizBusy(false);
    }
  };

  const answerQuiz = (index: number) => {
    if (chosen !== null || !current) return;
    setChosen(index);
    setResults((prev) => [...prev, index === current.answer]);
  };

  const nextQuestion = () => {
    if (current === undefined) return;
    if (qIndex + 1 >= quiz.length) {
      setShowScore(true);
      return;
    }
    setChosen(null);
    setQIndex(qIndex + 1);
  };

  // ================= schedule =================
  const refreshIdeas = () => {
    try {
      setIdeas(aiSuggestSchedule(selectData(useApp.getState())));
      setAdded(new Set<string>());
      setIdeaErr(null);
    } catch (err) {
      setIdeaErr(errText(err));
    }
  };

  const addIdea = (idea: ScheduleSuggestion) => {
    try {
      const subject = subjects.find((s) => s.id === idea.subjectId);
      addBlock({
        title: idea.title,
        date: idea.date,
        startMin: idea.startMin,
        durationMin: idea.durationMin,
        subjectId: idea.subjectId,
        color: subject?.color,
      });
      setAdded((prev) => new Set(prev).add(idea.id));
    } catch (err) {
      setIdeaErr(errText(err));
    }
  };

  // ================= syllabus =================
  const parseSyllabusText = async () => {
    setSyBusy(true);
    setSyErr(null);
    setSyMsg(null);
    try {
      const found = parseSyllabus(syText);
      setSyItems(found);
      setSyChecked(found.map(() => true));
    } catch (err) {
      setSyItems([]);
      setSyChecked([]);
      setSyErr(errText(err));
    } finally {
      setSyBusy(false);
    }
  };

  const importSelectedItems = () => {
    setSyErr(null);
    setSyMsg(null);
    if (checkedItems.length === 0) {
      setSyErr(t('smart.pickItems'));
      return;
    }
    try {
      for (const item of checkedItems) {
        addTask({
          title: `${kindEmoji(item.kind)} ${item.title}`,
          due: item.date,
          priority: item.kind === 'exam' ? 'high' : 'medium',
        });
      }
      const msg = t('smart.tasksAdded', { n: checkedItems.length });
      setSyMsg(msg);
      pushEvent('celebrate', msg);
    } catch (err) {
      setSyErr(errText(err));
    }
  };

  const tabs = [
    { id: 'summarize', emoji: '🪄', label: t('smart.tabSummarize') },
    { id: 'cards', emoji: '🃏', label: t('smart.tabCards') },
    { id: 'quiz', emoji: '📝', label: t('smart.tabQuiz') },
    { id: 'schedule', emoji: '🗓', label: t('smart.tabSchedule') },
    { id: 'syllabus', emoji: '📋', label: t('smart.tabSyllabus') },
  ];

  const notePicker = (
    <div className="card pad">
      <div className="card-title"><span aria-hidden="true">📖</span> {t('smart.sourceNote')}</div>
      {notes.length === 0 ? (
        <EmptyState emoji="📝" title={t('smart.noNotes')} hint={t('smart.noNotesHint')} />
      ) : (
        <div className="row wrap" style={{ gap: 10 }}>
          <select
            className="select"
            style={{ flex: 2, minWidth: 200 }}
            value={activeNote ? activeNote.id : ''}
            onChange={(e) => pickNote(e.target.value)}
            aria-label={t('smart.sourceNote')}
          >
            {noteOptions.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title || t('smart.untitled')}
              </option>
            ))}
          </select>
          <input
            className="input"
            style={{ flex: 1, minWidth: 160 }}
            placeholder={t('smart.searchNotes')}
            value={noteQuery}
            onChange={(e) => setNoteQuery(e.target.value)}
            aria-label={t('smart.searchNotes')}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head">
        <div>
          <div className="page-title" role="heading" aria-level={1}>{t('smart.title')}</div>
          <div className="page-sub">{t('smart.sub')}</div>
        </div>
        <span className="spacer" />
        <span className={`engine-pill ${remote ? 'remote' : ''}`}>{engineLabel}</span>
        <button type="button" className="btn btn-sm btn-soft" onClick={() => navigate('/settings')}>
          <span aria-hidden="true">⚙️</span> {t('smart.settings')}
        </button>
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'summarize' && (
        <>
          {notePicker}
          <div className="card pad">
            <div className="card-title"><span aria-hidden="true">🪄</span> {t('smart.summarizeTitle')}</div>
            <div className="row wrap" style={{ gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!activeNote || sumBusy}
                onClick={() => void runSummarize()}
              >
                {sumBusy ? (
                  <>
                    <span aria-hidden="true">⏳</span> {t('smart.thinking')}
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">✨</span> {t('smart.summarize')}
                  </>
                )}
              </button>
              {sumBullets && sumBullets.length > 0 && (
                <>
                  <button type="button" className="btn btn-soft" onClick={() => void copySummary()}>
                    {copied ? t('smart.copied') : t('smart.copy')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-soft"
                    onClick={saveSummary}
                    disabled={sumSaved}
                  >
                    {t('smart.saveAsNote')}
                  </button>
                </>
              )}
              <span className="spacer" />
              {sumBullets && (
                <span className="pill small">
                  <span className="dot" style={{ background: sumEngine === 'remote' ? '#b8a6ff' : '#8fe3c8' }} />
                  {sumEngine === 'remote' ? t('smart.engineRemote') : t('smart.engineLocal')}
                </span>
              )}
            </div>

            {sumErr && <Feedback kind="error" text={sumErr} />}
            {sumSaved && (
              <div className="smart-confirm" role="status">
                <span>{t('smart.savedNote')}</span>
                <button type="button" className="btn btn-sm btn-soft" onClick={() => navigate('/notes')}>
                  {t('smart.openNotes')}
                </button>
              </div>
            )}

            {sumBusy && <p className="small muted">{t('smart.workingNote')}</p>}

            {sumBullets !== null && sumBullets.length > 0 && (
              <ul className="smart-bullets">
                {sumBullets.map((b, i) => (
                  <li key={`${i}-${b.slice(0, 12)}`}>
                    <span className="smart-bullet-dot" aria-hidden="true">✿</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}

            {sumBullets !== null && sumBullets.length === 0 && (
              <EmptyState emoji="🌱" title={t('smart.emptySummary')} hint={t('smart.emptySummaryHint')} />
            )}

            {sumBullets === null && !sumBusy && (
              <EmptyState emoji="💭" title={t('smart.readySummary')} hint={t('smart.readySummaryHint')} />
            )}
          </div>
        </>
      )}

      {tab === 'cards' && (
        <>
          {notePicker}
          <div className="card pad">
            <div className="card-title"><span aria-hidden="true">🃏</span> {t('smart.cardsTitle')}</div>
            <div className="row wrap" style={{ gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!activeNote || cardsBusy}
                onClick={() => void generateCards()}
              >
                {cardsBusy ? (
                  <>
                    <span aria-hidden="true">⏳</span> {t('smart.shuffling')}
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">✨</span> {t('smart.generateCards')}
                  </>
                )}
              </button>
              {cards.length > 0 && (
                <select
                  className="select"
                  style={{ width: 'auto', minWidth: 170 }}
                  value={deckValue}
                  onChange={(e) => {
                    setDeckChoice(e.target.value);
                    setCardsMsg(null);
                  }}
                  aria-label={t('smart.deck')}
                >
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.icon} {d.name}
                    </option>
                  ))}
                  <option value={NEW_DECK}>{t('smart.newDeck')}</option>
                </select>
              )}
              {cards.length > 0 && deckValue === NEW_DECK && (
                <input
                  className="input"
                  style={{ width: 'auto', minWidth: 170 }}
                  placeholder={t('smart.deckName')}
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  aria-label={t('smart.deckName')}
                />
              )}
              {cards.length > 0 && (
                <button type="button" className="btn btn-primary" onClick={importSelectedCards}>
                  <span aria-hidden="true">🎴</span> {t('smart.importN', { n: checkedCards.length })}
                </button>
              )}
            </div>

            {cardsErr && <Feedback kind="error" text={cardsErr} />}
            {cardsMsg && <Feedback kind="ok" text={cardsMsg} />}

            {cards.length === 0 && !cardsBusy && (
              <EmptyState emoji="🃏" title={t('smart.noCards')} hint={t('smart.noCardsHint')} />
            )}

            {cards.length > 0 && (
              <div className="stack" style={{ gap: 8, marginTop: 14 }}>
                <div className="row between wrap" style={{ gap: 8 }}>
                  <label className="smart-checkline">
                    <input
                      type="checkbox"
                      checked={allCardsChecked}
                      onChange={(e) => setCardChecked(cards.map(() => e.target.checked))}
                    />
                    {t('smart.selectAll')}
                  </label>
                  <span className="muted small">{t('smart.selectedCount', { n: checkedCards.length })}</span>
                </div>
                {cards.map((c, i) => (
                  <label key={`${i}-${c.front.slice(0, 16)}`} className="smart-card-row">
                    <input
                      type="checkbox"
                      checked={cardChecked[i] === true}
                      onChange={(e) =>
                        setCardChecked((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))
                      }
                    />
                    <span className="smart-card-text">
                      <strong>{c.front}</strong>
                      <span className="muted small">{c.back}</span>
                    </span>
                    <span className="tag">
                      <span aria-hidden="true">{c.template === 'cloze' ? '✨' : '❓'}</span>{' '}
                      {c.template === 'cloze' ? t('smart.tplCloze') : t('smart.tplBasic')}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'quiz' && (
        <>
          {notePicker}
          <div className="card pad">
            <div className="card-title"><span aria-hidden="true">📝</span> {t('smart.quizTitle')}</div>
            <div className="row wrap" style={{ gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!activeNote || quizBusy}
                onClick={() => void makeQuiz()}
              >
                {quizBusy ? (
                  <>
                    <span aria-hidden="true">⏳</span> {t('smart.writingQuestions')}
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">✨</span> {t('smart.makeQuiz')}
                  </>
                )}
              </button>
              {quiz.length > 0 && !showScore && (
                <span className="tag">
                  <span aria-hidden="true">⭐</span> {t('smart.score')} {score}/{quiz.length}
                </span>
              )}
            </div>

            {quizErr && <Feedback kind="error" text={quizErr} />}

            {quiz.length === 0 && !quizBusy && (
              <EmptyState emoji="📝" title={t('smart.noQuiz')} hint={t('smart.noQuizHint')} />
            )}

            {quiz.length > 0 && showScore && (
              <div className="smart-score">
                <div className="smart-score-num">
                  {score}/{quiz.length}
                </div>
                <ProgressBar pct={scorePct} />
                <p className="small muted" style={{ margin: 0 }}>
                  {t('smart.quizDone', { pct: scorePct })}
                </p>
                <button type="button" className="btn btn-primary" onClick={resetQuiz}>
                  <span aria-hidden="true">🔁</span> {t('smart.tryAgain')}
                </button>
              </div>
            )}

            {quiz.length > 0 && !showScore && current && (
              <div className="stack" style={{ gap: 12, marginTop: 14 }}>
                <div className="row between wrap" style={{ gap: 8 }}>
                  <strong className="small">{t('smart.questionOf', { i: qIndex + 1, n: quiz.length })}</strong>
                  <span className="muted small">
                    {t('smart.score')} {score}/{quiz.length}
                  </span>
                </div>
                <ProgressBar tiny pct={(results.length / quiz.length) * 100} />

                <div className="smart-question">{current.question}</div>

                <div className="smart-options">
                  {current.options.map((opt, i) => {
                    const revealed = chosen !== null;
                    const isAnswer = i === current.answer;
                    const isWrongPick = revealed && chosen === i && !isAnswer;
                    return (
                      <button
                        key={`${i}-${opt}`}
                        type="button"
                        className={`smart-opt ${revealed && isAnswer ? 'right' : ''} ${isWrongPick ? 'wrong' : ''}`}
                        disabled={revealed}
                        onClick={() => answerQuiz(i)}
                      >
                        <span className="smart-opt-key">{String.fromCharCode(65 + i)}</span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {chosen !== null && (
                  <div className="row wrap" style={{ gap: 10 }}>
                    <strong
                      className={chosen === current.answer ? 'smart-ok-text' : 'smart-no-text'}
                      role="status"
                    >
                      {chosen === current.answer ? t('smart.correct') : t('smart.wrong')}
                    </strong>
                    {chosen !== current.answer && (
                      <span className="muted small">
                        {t('smart.answerWas')}: {current.options[current.answer]}
                      </span>
                    )}
                    <span className="spacer" />
                    <button type="button" className="btn btn-primary" onClick={nextQuestion}>
                      {qIndex + 1 >= quiz.length ? t('smart.seeResults') : t('smart.next')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'schedule' && (
        <div className="card pad">
          <div className="row between wrap" style={{ gap: 10, marginBottom: 10 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>
              <span aria-hidden="true">🗓</span> {t('smart.scheduleTitle')}
            </div>
            <button type="button" className="btn btn-sm btn-soft" onClick={refreshIdeas}>
              <span aria-hidden="true">↻</span> {t('smart.refresh')}
            </button>
          </div>

          {ideaErr && <Feedback kind="error" text={ideaErr} />}

          {ideas.length === 0 && (
            <EmptyState emoji="🌿" title={t('smart.allCaughtUp')} hint={t('smart.allCaughtUpHint')} />
          )}

          {ideas.length > 0 && (
            <div className="stack" style={{ gap: 10 }}>
              {ideas.map((idea) => {
                const subject = subjects.find((s) => s.id === idea.subjectId);
                const isAdded = added.has(idea.id);
                return (
                  <div key={idea.id} className="smart-idea">
                    <div className="smart-idea-when">
                      <strong>{fmtDate(idea.date)}</strong>
                      <span className="muted small">
                        {fmtTime(idea.startMin)} · {t('smart.duration', { n: idea.durationMin })}
                      </span>
                    </div>
                    <div className="smart-idea-body">
                      <div className="bold small">{idea.title}</div>
                      <div className="muted small">{idea.reason}</div>
                      {subject && (
                        <span className="pill small">
                          <span className="dot" style={{ background: subject.color }} />
                          <span aria-hidden="true">{subject.icon}</span> {subject.name}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-soft"
                      disabled={isAdded}
                      aria-pressed={isAdded}
                      onClick={() => addIdea(idea)}
                    >
                      {isAdded ? t('smart.added') : t('smart.addBlock')}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'syllabus' && (
        <div className="card pad">
          <div className="card-title"><span aria-hidden="true">📋</span> {t('smart.syllabusTitle')}</div>
          <textarea
            className="textarea smart-syllabus"
            rows={7}
            placeholder={t('smart.pastePlaceholder')}
            value={syText}
            onChange={(e) => setSyText(e.target.value)}
            aria-label={t('smart.pastePlaceholder')}
          />
          <div className="row wrap" style={{ gap: 10, marginTop: 12 }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={syBusy || syText.trim().length === 0}
              onClick={() => void parseSyllabusText()}
            >
              {syBusy ? (
                <>
                  <span aria-hidden="true">⏳</span> {t('smart.parsing')}
                </>
              ) : (
                <>
                  <span aria-hidden="true">✨</span> {t('smart.parse')}
                </>
              )}
            </button>
            {syItems && syItems.length > 0 && (
              <button type="button" className="btn btn-soft" onClick={importSelectedItems}>
                <span aria-hidden="true">✅</span> {t('smart.importSelected', { n: checkedItems.length })}
              </button>
            )}
            <span className="spacer" />
            {syMsg && <span className="tag" role="status">{syMsg}</span>}
          </div>

          {syErr && <Feedback kind="error" text={syErr} />}

          {syItems !== null && syItems.length > 0 && (
            <div className="stack" style={{ gap: 8, marginTop: 14 }}>
              <div className="muted small">{t('smart.foundItems', { n: syItems.length })}</div>
              {syItems.map((item, i) => (
                <label key={`${item.date}-${i}`} className="smart-syl-row">
                  <input
                    type="checkbox"
                    checked={syChecked[i] === true}
                    onChange={(e) =>
                      setSyChecked((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))
                    }
                  />
                  <span className="smart-syl-emoji" role="img" aria-label={item.kind}>{kindEmoji(item.kind)}</span>
                  <span className="smart-syl-date">
                    <strong>{fmtDate(item.date)}</strong>
                    {item.time && <span className="muted small">{item.time}</span>}
                  </span>
                  <span className="smart-syl-title">{item.title}</span>
                  <span className="tag">{Math.round(item.confidence * 100)}%</span>
                </label>
              ))}
              <p className="small muted" style={{ margin: 0 }}>
                {t('smart.plannerNote')}
              </p>
            </div>
          )}

          {syItems !== null && syItems.length === 0 && (
            <EmptyState emoji="🔍" title={t('smart.noSyllabus')} hint={t('smart.noSyllabusHint')} />
          )}

          {syItems === null && (
            <EmptyState emoji="📋" title={t('smart.syllabusIdle')} hint={t('smart.syllabusIdleHint')} />
          )}
        </div>
      )}

      <div className="card pad">
        <MascotDock mood="think" message={t('smart.dock')} size={76} />
      </div>
    </div>
  );
}
