import { useEffect, useMemo, useRef, useState, type MouseEvent as RMouseEvent } from 'react';
import {
  NOTE_COLORS,
  NOTE_TEMPLATES,
  PALETTE,
  aiMakeCards,
  aiSummarize,
  exportNote,
  noteFromTemplate,
  publishNote,
  shareUrlFor,
  speak,
  stickerById,
  stopSpeaking,
  syncConfigured,
  ttsAvailable,
  unpublishNote,
  useApp,
  type AiEngine,
  type ExportFormat,
  type Folder,
  type GeneratedCard,
  type Note,
  type NoteTemplate,
} from '@cutepad/core';
import { EmptyState, Modal, Segmented, STICKER_SETS } from '@cutepad/ui';
import { useDictation, useNow } from '../hooks';
import { useT } from '../i18n';
import NoteDrawing from './NoteDrawing';
import './NotesView.css';

type EditorTab = 'write' | 'doodle';
type SortMode = 'recent' | 'alpha';
type MenuId = 'sticker' | 'export' | 'hilite' | 'fore' | null;

const FOLDER_EMOJIS = ['📁', '📚', '💡', '🌸', '🎨', '📖', '🧪', '🎯', '🌷', '⭐', '🍜', '🐾'];
const HILITE_COLORS = ['#fff3a8', '#ffd6e8', '#d9f7e6'];
const TEXT_COLORS = ['#3d2c3d', '#e0577f', '#7c6bf0'];

const EXPORT_ITEMS: { format: ExportFormat; label: string }[] = [
  { format: 'txt', label: '📄 Plain text · txt' },
  { format: 'md', label: '📝 Markdown · md' },
  { format: 'pdf', label: '📕 PDF · print' },
  { format: 'html', label: '🌐 Web page · html' },
];

const UNCATEGORIZED = 'none';
const NEW_DECK = '__new';

type AiPanel = 'summarize' | 'cards';

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function relTime(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'updated just now';
  if (mins < 60) return `updated ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `updated ${days}d ago`;
  return `updated ${new Date(ts).toLocaleDateString()}`;
}

function snippet(note: Note): string {
  const text = note.text.trim();
  if (text) return text;
  if (note.drawing) return 'doodle attached 🎨';
  if (note.html.trim()) return '…';
  return 'empty note — tap to start writing~';
}

export default function NotesView() {
  const now = useNow(30000);
  const nowMs = now.getTime();
  const t = useT();

  const notes = useApp((s) => s.notes);
  const folders = useApp((s) => s.folders);
  const addNote = useApp((s) => s.addNote);
  const updateNote = useApp((s) => s.updateNote);
  const deleteNote = useApp((s) => s.deleteNote);
  const togglePin = useApp((s) => s.togglePin);
  const addFolder = useApp((s) => s.addFolder);
  const updateFolder = useApp((s) => s.updateFolder);
  const removeFolder = useApp((s) => s.removeFolder);
  const settings = useApp((s) => s.settings);
  const setSettings = useApp((s) => s.setSettings);
  const decks = useApp((s) => s.decks);
  const addDeck = useApp((s) => s.addDeck);
  const importCards = useApp((s) => s.importCards);
  const unlockedStickers = useApp((s) => s.unlockedStickers);

  const [search, setSearch] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<EditorTab>('write');
  const [sort, setSort] = useState<SortMode>('recent');
  const [openMenu, setOpenMenu] = useState<MenuId>(null);
  const [confirmNote, setConfirmNote] = useState<Note | null>(null);
  const [confirmFolder, setConfirmFolder] = useState<Folder | null>(null);
  const [folderModal, setFolderModal] = useState<{ mode: 'add' | 'rename'; folder: Folder | null } | null>(null);
  const [folderDraft, setFolderDraft] = useState({ name: '', icon: '📁', color: PALETTE[0] });
  const [tagDraft, setTagDraft] = useState('');
  const [savedKey, setSavedKey] = useState(0);

  const [tplOpen, setTplOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiAction, setAiAction] = useState<AiPanel | null>(null);
  const [sumBusy, setSumBusy] = useState(false);
  const [sumBullets, setSumBullets] = useState<string[] | null>(null);
  const [sumEngine, setSumEngine] = useState<AiEngine>('local');
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [aiCopied, setAiCopied] = useState(false);
  const [cardsBusy, setCardsBusy] = useState(false);
  const [genCards, setGenCards] = useState<GeneratedCard[]>([]);
  const [cardsEngine, setCardsEngine] = useState<AiEngine>('local');
  const [deckChoice, setDeckChoice] = useState('');
  const [newDeckName, setNewDeckName] = useState('');
  const [cardsMsg, setCardsMsg] = useState<string | null>(null);
  const [speakingNow, setSpeakingNow] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareErr, setShareErr] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);

  const surfaceRef = useRef<HTMLDivElement>(null);
  const currentIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<number | undefined>(undefined);
  const savedTimerRef = useRef<number | undefined>(undefined);

  const selected = useMemo(() => notes.find((n) => n.id === selectedId) ?? null, [notes, selectedId]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const note of notes) for (const tag of note.tags) set.add(tag);
    return [...set].sort();
  }, [notes]);

  const visibleNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = notes.filter((note) => {
      if (activeFolderId === UNCATEGORIZED) {
        if (note.folderId !== null) return false;
      } else if (activeFolderId && note.folderId !== activeFolderId) {
        return false;
      }
      if (activeTag && !note.tags.includes(activeTag)) return false;
      if (!q) return true;
      return (
        note.title.toLowerCase().includes(q) ||
        note.text.toLowerCase().includes(q) ||
        note.tags.some((t) => t.includes(q))
      );
    });
    if (sort === 'alpha') return [...list].sort((a, b) => a.title.localeCompare(b.title));
    return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
  }, [notes, search, activeFolderId, activeTag, sort]);

  const uncategorizedCount = notes.filter((n) => n.folderId === null).length;

  const ttsOk = useMemo(() => ttsAvailable(), []);
  const syncOk = syncConfigured(settings.sync);
  const deckValue = deckChoice || decks[0]?.id || NEW_DECK;
  const shareUrl = selected?.share
    ? shareUrlFor(selected.share.slug, { url: settings.sync.url, anonKey: settings.sync.anonKey })
    : null;

  const rareStickers = useMemo(
    () =>
      [...new Set(unlockedStickers)]
        .map((id) => stickerById(id)?.emoji)
        .filter((emoji): emoji is string => Boolean(emoji)),
    [unlockedStickers],
  );

  const appendDictation = (raw: string) => {
    const chunk = raw.trim();
    if (!chunk) return;
    const id = currentIdRef.current;
    if (!id) return;
    const el = surfaceRef.current;
    if (el) {
      window.clearTimeout(saveTimerRef.current);
      const p = document.createElement('p');
      p.textContent = chunk;
      el.appendChild(p);
      updateNote(id, { html: el.innerHTML });
      flashSaved();
      return;
    }
    const storeNote = useApp.getState().notes.find((n) => n.id === id);
    if (!storeNote) return;
    updateNote(id, { html: `${storeNote.html}<p>${escapeHtml(chunk)}</p>` });
    flashSaved();
  };

  const dict = useDictation(appendDictation);

  const toggleReadAloud = () => {
    if (speakingNow) {
      stopSpeaking();
      setSpeakingNow(false);
      return;
    }
    if (!selected || !ttsOk) return;
    commitNow();
    const fresh = useApp.getState().notes.find((n) => n.id === selected.id);
    const text = fresh?.text ?? selected.text;
    if (!text.trim()) return;
    const ok = speak(text, {
      voiceURI: settings.accessibility.ttsVoice || undefined,
      rate: settings.accessibility.speechRate,
      onEnd: () => setSpeakingNow(false),
      onError: () => setSpeakingNow(false),
    });
    setSpeakingNow(ok);
  };

  const publish = async () => {
    if (!selected || !syncOk) return;
    setShareBusy(true);
    setShareErr(null);
    try {
      await publishNote(selected);
    } catch (err) {
      setShareErr(errText(err));
    } finally {
      setShareBusy(false);
    }
  };

  const unpublish = async () => {
    if (!selected) return;
    setConfirmUnpublish(false);
    setShareErr(null);
    try {
      await unpublishNote(selected.id);
    } catch (err) {
      setShareErr(errText(err));
    }
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1800);
    } catch {
      setShareErr(t('notes.copyFailed'));
    }
  };

  const openAi = () => {
    setAiAction(null);
    setSumBusy(false);
    setSumBullets(null);
    setAiMsg(null);
    setAiCopied(false);
    setCardsBusy(false);
    setGenCards([]);
    setCardsMsg(null);
    setNewDeckName('');
    setAiOpen(true);
  };

  const runSummarize = async () => {
    if (!selected) return;
    commitNow();
    setAiAction('summarize');
    setSumBusy(true);
    setSumBullets(null);
    setAiMsg(null);
    setAiCopied(false);
    try {
      const fresh = useApp.getState().notes.find((n) => n.id === selected.id);
      const res = await aiSummarize(fresh?.text ?? selected.text, fresh?.title ?? selected.title, settings.ai);
      setSumBullets(res.bullets);
      setSumEngine(res.engine);
      if (res.bullets.length === 0) setAiMsg(t('notes.aiEmpty'));
    } catch (err) {
      setAiMsg(errText(err));
    } finally {
      setSumBusy(false);
    }
  };

  const copySummary = async () => {
    if (!sumBullets || sumBullets.length === 0) return;
    try {
      await navigator.clipboard.writeText(sumBullets.map((b) => `• ${b}`).join('\n'));
      setAiCopied(true);
      window.setTimeout(() => setAiCopied(false), 1800);
    } catch {
      setAiMsg(t('notes.copyFailed'));
    }
  };

  const runMakeCards = async () => {
    if (!selected) return;
    commitNow();
    setAiAction('cards');
    setCardsBusy(true);
    setGenCards([]);
    setCardsMsg(null);
    setAiMsg(null);
    try {
      const fresh = useApp.getState().notes.find((n) => n.id === selected.id);
      const res = await aiMakeCards(fresh?.text ?? selected.text, fresh?.title ?? selected.title, settings.ai, 8);
      setGenCards(res.cards);
      setCardsEngine(res.engine);
      if (res.cards.length === 0) setAiMsg(t('notes.aiNoCards'));
    } catch (err) {
      setAiMsg(errText(err));
    } finally {
      setCardsBusy(false);
    }
  };

  const importGenerated = () => {
    setAiMsg(null);
    setCardsMsg(null);
    if (genCards.length === 0) {
      setAiMsg(t('notes.aiNoCards'));
      return;
    }
    let deckId = deckValue;
    let deckName = decks.find((d) => d.id === deckId)?.name ?? '';
    if (deckId === NEW_DECK) {
      const name = newDeckName.trim();
      if (!name) {
        setAiMsg(t('notes.aiDeckNameNeeded'));
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
        genCards.map((c) => ({ front: c.front, back: c.back })),
      );
      setCardsMsg(t('notes.aiImported', { n, deck: deckName }));
    } catch (err) {
      setAiMsg(errText(err));
    }
  };

  const createFromTemplate = (tpl: NoteTemplate) => {
    commitNow();
    const folderId = activeFolderId && activeFolderId !== UNCATEGORIZED ? activeFolderId : null;
    const patch = noteFromTemplate(tpl.id, folderId);
    const id = addNote({ title: patch.title, html: patch.html, color: patch.color, folderId: patch.folderId });
    updateNote(id, { tags: patch.tags });
    setTplOpen(false);
    setSelectedId(id);
    setTagDraft('');
    setTab('write');
  };

  const flashSaved = () => {
    setSavedKey((k) => k + 1);
    window.clearTimeout(savedTimerRef.current);
    savedTimerRef.current = window.setTimeout(() => setSavedKey(0), 1900);
  };

  const scheduleCommit = () => {
    const el = surfaceRef.current;
    const id = currentIdRef.current;
    if (!el || !id) return;
    const html = el.innerHTML;
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      updateNote(id, { html });
      flashSaved();
    }, 450);
  };

  const commitNow = () => {
    const el = surfaceRef.current;
    const id = currentIdRef.current;
    if (!el || !id) return;
    window.clearTimeout(saveTimerRef.current);
    updateNote(id, { html: el.innerHTML });
    flashSaved();
  };

  const openNote = (id: string) => {
    if (id !== selectedId) commitNow();
    setSelectedId(id);
    setTagDraft('');
    setTab('write');
  };

  useEffect(() => {
    currentIdRef.current = selectedId;
    const el = surfaceRef.current;
    if (!el) return;
    el.innerHTML = selected?.html ?? '';
  }, [selectedId, tab]);

  useEffect(() => {
    setOpenMenu(null);
  }, [selectedId, tab]);

  useEffect(() => {
    stopSpeaking();
    setSpeakingNow(false);
    setShareErr(null);
    setShareCopied(false);
    setConfirmUnpublish(false);
    setAiOpen(false);
    return () => stopSpeaking();
  }, [selectedId]);

  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || typeof target.closest !== 'function') return;
      if (target.closest('[data-popover]') || target.closest('[data-menu-trigger]')) return;
      setOpenMenu(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openMenu]);

  useEffect(
    () => () => {
      window.clearTimeout(saveTimerRef.current);
      window.clearTimeout(savedTimerRef.current);
    },
    [],
  );

  const exec = (cmd: string, value?: string) => {
    const el = surfaceRef.current;
    if (!el) return;
    if (document.activeElement !== el) el.focus();
    document.execCommand(cmd, false, value);
    commitNow();
  };

  const toggleMenu = (menu: Exclude<MenuId, null>) => {
    setOpenMenu((current) => (current === menu ? null : menu));
  };

  const changeTab = (next: EditorTab) => {
    if (next === tab) return;
    if (tab === 'write') commitNow();
    setTab(next);
    setOpenMenu(null);
  };

  const newNote = () => {
    commitNow();
    const input = activeFolderId && activeFolderId !== UNCATEGORIZED ? { folderId: activeFolderId } : {};
    const id = addNote(input);
    setSelectedId(id);
    setTagDraft('');
    setTab('write');
  };

  const commitTag = () => {
    if (!selected) return;
    const tag = tagDraft.trim().toLowerCase().replace(/\s+/g, '-');
    if (!tag || selected.tags.includes(tag) || selected.tags.length >= 12) {
      setTagDraft('');
      return;
    }
    updateNote(selected.id, { tags: [...selected.tags, tag] });
    setTagDraft('');
  };

  const removeTag = (tag: string) => {
    if (!selected) return;
    updateNote(selected.id, { tags: selected.tags.filter((t) => t !== tag) });
    if (activeTag === tag) setActiveTag(null);
  };

  const openAddFolder = () => {
    setFolderDraft({ name: '', icon: '📁', color: PALETTE[0] });
    setFolderModal({ mode: 'add', folder: null });
  };

  const openRenameFolder = (folder: Folder) => {
    setFolderDraft({ name: folder.name, icon: folder.icon, color: folder.color });
    setFolderModal({ mode: 'rename', folder });
  };

  const saveFolder = () => {
    const name = folderDraft.name.trim();
    if (!folderModal || !name) return;
    if (folderModal.mode === 'add') {
      const id = addFolder(name, folderDraft.icon, folderDraft.color);
      setActiveFolderId(id);
    } else if (folderModal.folder) {
      updateFolder(folderModal.folder.id, { name, icon: folderDraft.icon, color: folderDraft.color });
    }
    setFolderModal(null);
  };

  const confirmDeleteFolder = () => {
    if (!confirmFolder) return;
    removeFolder(confirmFolder.id);
    if (activeFolderId === confirmFolder.id) setActiveFolderId(null);
    setConfirmFolder(null);
  };

  const confirmDeleteNote = () => {
    if (!confirmNote) return;
    deleteNote(confirmNote.id);
    if (selectedId === confirmNote.id) setSelectedId(null);
    setConfirmNote(null);
  };

  const keepFocus = (e: RMouseEvent<HTMLElement>) => e.preventDefault();

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <h1 className="page-title"><span aria-hidden="true">📝 </span>Notes</h1>
        <span className="page-sub">cozy pages, stickers & doodles</span>
        <span className="spacer" />
        <span className="tag">{notes.length} notes</span>
      </div>

      <div className="notes-layout">
        <div className="notes-col">
          <div className="row between">
            <span className="section-title" style={{ margin: 0 }}>
              Folders
            </span>
            <button type="button" className="btn btn-icon btn-soft" onClick={openAddFolder} title="Add folder" aria-label="Add folder">
              ＋
            </button>
          </div>

          <div className="stack" style={{ gap: 4 }}>
            <div className={`folder-row ${activeFolderId === null ? 'active' : ''}`}>
              <button
                type="button"
                className="folder-select"
                aria-current={activeFolderId === null ? 'true' : undefined}
                onClick={() => setActiveFolderId(null)}
              >
                <span className="folder-emoji" aria-hidden="true">🗂️</span>
                <span className="folder-name">All notes</span>
                <span className="folder-count">{notes.length}</span>
              </button>
            </div>

            {uncategorizedCount > 0 && (
              <div className={`folder-row ${activeFolderId === UNCATEGORIZED ? 'active' : ''}`}>
                <button
                  type="button"
                  className="folder-select"
                  aria-current={activeFolderId === UNCATEGORIZED ? 'true' : undefined}
                  onClick={() => setActiveFolderId(UNCATEGORIZED)}
                >
                  <span className="folder-emoji" aria-hidden="true">📂</span>
                  <span className="folder-name">No folder</span>
                  <span className="folder-count">{uncategorizedCount}</span>
                </button>
              </div>
            )}

            {folders.map((folder) => (
              <div key={folder.id} className={`folder-row ${activeFolderId === folder.id ? 'active' : ''}`}>
                <button
                  type="button"
                  className="folder-select"
                  aria-current={activeFolderId === folder.id ? 'true' : undefined}
                  onClick={() => setActiveFolderId(folder.id)}
                >
                  <span className="folder-emoji" aria-hidden="true">{folder.icon}</span>
                  <span className="folder-name">{folder.name}</span>
                  <span className="folder-count">{notes.filter((n) => n.folderId === folder.id).length}</span>
                </button>
                <span className="folder-actions">
                  <button type="button" onClick={() => openRenameFolder(folder)} title={`Rename ${folder.name}`} aria-label={`Rename ${folder.name}`}>
                    ✏️
                  </button>
                  <button type="button" onClick={() => setConfirmFolder(folder)} title={`Delete ${folder.name}`} aria-label={`Delete ${folder.name}`}>
                    🗑
                  </button>
                </span>
              </div>
            ))}
          </div>

          <div className="divider" />

          <span className="section-title" style={{ margin: 0 }}>
            Tags
          </span>
          <div className="row wrap" style={{ gap: 6 }}>
            {allTags.length === 0 && <span className="small muted">no tags yet~</span>}
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`chip ${activeTag === tag ? 'active' : ''}`}
                aria-pressed={activeTag === tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                title={`Filter by #${tag}`}
              >
                #{tag}
              </button>
            ))}
            {activeTag && (
              <button type="button" className="chip" onClick={() => setActiveTag(null)} title="Clear tag filter">
                ✕ clear
              </button>
            )}
          </div>
        </div>

        <div className="note-list-col">
          <div className="row" style={{ gap: 6 }}>
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={newNote}>
              <span aria-hidden="true">＋ </span>New note
            </button>
            <button
              type="button"
              className="btn btn-soft"
              onClick={() => setTplOpen(true)}
              title={t('notes.templatesBtn')}
            >
              {t('notes.templatesBtn')}
            </button>
          </div>

          <div className="search-box">
            <span className="search-icon" aria-hidden="true">🔍</span>
            <input
              className="input"
              placeholder="search notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search notes"
            />
          </div>

          <div className="row between small muted">
            <span>
              {visibleNotes.length} of {notes.length} notes
              {activeTag ? ` · #${activeTag}` : ''}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-soft"
              onClick={() => setSort(sort === 'recent' ? 'alpha' : 'recent')}
              title="Switch sorting"
            >
              <span aria-hidden="true">{sort === 'recent' ? '🕒' : '🔤'}</span> {sort === 'recent' ? 'recent' : 'A–Z'}
            </button>
          </div>

          <div className="note-list-scroll">
            {visibleNotes.length === 0 ? (
              <EmptyState
                emoji="🔍"
                title="No notes here"
                hint="try another search, folder or tag~"
                action={
                  <button type="button" className="btn btn-primary btn-sm" onClick={newNote}>
                    <span aria-hidden="true">✏️ </span>new note
                  </button>
                }
              />
            ) : (
              visibleNotes.map((note) => (
                <div
                  key={note.id}
                  className={`list-item note-card ${note.id === selectedId ? 'active' : ''} ${note.pinned ? 'pinned' : ''}`}
                  aria-current={note.id === selectedId ? 'true' : undefined}
                  onClick={() => openNote(note.id)}
                >
                  <span className="note-bar" aria-hidden="true" style={{ background: note.color }} />
                  <div className="note-card-body">
                    <div className="row between" style={{ gap: 8 }}>
                      <button
                        type="button"
                        className="note-card-title"
                        onClick={(e) => {
                          e.stopPropagation();
                          openNote(note.id);
                        }}
                      >
                        {note.title.trim() || 'Untitled note 🌸'}
                      </button>
                      <span className="small muted" style={{ flexShrink: 0 }}>
                        {relTime(note.updatedAt, nowMs)}
                      </span>
                    </div>
                    <p className="note-snippet">{snippet(note)}</p>
                    {note.tags.length > 0 && (
                      <div className="row wrap" style={{ gap: 5 }}>
                        {note.tags.slice(0, 3).map((tag) => (
                          <span className="tag" key={tag}>
                            #{tag}
                          </span>
                        ))}
                        {note.tags.length > 3 && <span className="small muted">+{note.tags.length - 3}</span>}
                      </div>
                    )}
                  </div>
                  <div className="note-card-actions">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin(note.id);
                      }}
                      title={note.pinned ? 'Unpin note' : 'Pin note'}
                      aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                      aria-pressed={note.pinned}
                    >
                      📌
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmNote(note);
                      }}
                      title="Delete note"
                      aria-label="Delete note"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="note-editor-col">
          {!selected ? (
            <EmptyState
              emoji="🌸"
              title="Pick a note to open"
              hint="choose a page from the list, or start a brand new one~"
              action={
                <button type="button" className="btn btn-primary" onClick={newNote}>
                  <span aria-hidden="true">✏️ </span>new note
                </button>
              }
            />
          ) : (
            <>
              <input
                className="input title-input"
                value={selected.title}
                placeholder="Untitled note 🌸"
                onChange={(e) => updateNote(selected.id, { title: e.target.value })}
                aria-label="Note title"
              />

              <div className="row wrap editor-head">
                <Segmented
                  options={[
                    { value: 'write', label: '✍️ Write' },
                    { value: 'doodle', label: '🎨 Doodle' },
                  ]}
                  value={tab}
                  onChange={changeTab}
                />
                <span className="spacer" />
                <span className="share-slot">
                  {selected.share && shareUrl ? (
                    <span className="tag share-chip" title={shareUrl}>
                      <span aria-hidden="true">🔗 </span>
                      <span className="share-slug">/share/{selected.share.slug}</span>
                      <button
                        type="button"
                        onClick={() => void copyShareLink()}
                        title={shareCopied ? t('notes.copied') : t('notes.copyLink')}
                        aria-label={t('notes.copyLink')}
                      >
                        {shareCopied ? '✓' : '📋'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmUnpublish(true)}
                        title={t('notes.unpublish')}
                        aria-label={t('notes.unpublish')}
                      >
                        ✕
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm btn-soft"
                      onClick={() => void publish()}
                      disabled={!syncOk || shareBusy || !settings.legal.publish}
                      title={
                        !syncOk
                          ? t('notes.syncHint')
                          : !settings.legal.publish
                            ? t('notes.consentNeeded')
                            : t('notes.publish')
                      }
                    >
                      <span aria-hidden="true">{shareBusy ? '⏳' : '🌐'}</span>{' '}
                      {shareBusy ? t('notes.publishing') : t('notes.publish')}
                    </button>
                  )}
                </span>
                <span className="save-slot">
                  {savedKey > 0 && (
                    <span key={savedKey} className="save-flash" role="status">
                      saved ✓
                    </span>
                  )}
                </span>
              </div>

              {!syncOk && !selected.share && (
                <p className="notes-alert muted-line">{t('notes.syncHint')}</p>
              )}
              {!selected.share && syncOk && (
                <label className="consent-row" htmlFor="publish-consent">
                  <input
                    id="publish-consent"
                    type="checkbox"
                    checked={!!settings.legal.publish}
                    onChange={(e) =>
                      setSettings({ legal: { ...settings.legal, publish: e.target.checked ? Date.now() : null } })
                    }
                  />
                  <span>
                    {t('notes.consentPublish')} <a href="#/privacy">{t('notes.consentPrivacy')}</a>
                  </span>
                </label>
              )}
              {shareErr && (
                <p className="notes-alert error" role="status">
                  <span aria-hidden="true">⚠️ </span>
                  {shareErr}
                </p>
              )}

              {tab === 'write' ? (
                <div>
                  <div className="toolbar">
                    <button type="button" title="Bold" aria-label="Bold" onMouseDown={keepFocus} onClick={() => exec('bold')}>
                      <b>B</b>
                    </button>
                    <button type="button" title="Italic" aria-label="Italic" onMouseDown={keepFocus} onClick={() => exec('italic')}>
                      <i>I</i>
                    </button>
                    <button type="button" title="Underline" aria-label="Underline" onMouseDown={keepFocus} onClick={() => exec('underline')}>
                      <u>U</u>
                    </button>
                    <button type="button" title="Strikethrough" aria-label="Strikethrough" onMouseDown={keepFocus} onClick={() => exec('strikeThrough')}>
                      <s>S</s>
                    </button>
                    <span className="sep" />

                    <button type="button" title="Heading 1" aria-label="Heading 1" onMouseDown={keepFocus} onClick={() => exec('formatBlock', '<h1>')}>
                      H1
                    </button>
                    <button type="button" title="Heading 2" aria-label="Heading 2" onMouseDown={keepFocus} onClick={() => exec('formatBlock', '<h2>')}>
                      H2
                    </button>
                    <button type="button" title="Quote" aria-label="Block quote" onMouseDown={keepFocus} onClick={() => exec('formatBlock', '<blockquote>')}>
                      ❝
                    </button>
                    <span className="sep" />

                    <button
                      type="button"
                      title="Bullet list"
                      aria-label="Bullet list"
                      onMouseDown={keepFocus}
                      onClick={() => exec('insertUnorderedList')}
                    >
                      •≡
                    </button>
                    <button
                      type="button"
                      title="Numbered list"
                      aria-label="Numbered list"
                      onMouseDown={keepFocus}
                      onClick={() => exec('insertOrderedList')}
                    >
                      1.
                    </button>
                    <button type="button" title="Horizontal line" aria-label="Horizontal line" onMouseDown={keepFocus} onClick={() => exec('insertHorizontalRule')}>
                      —
                    </button>
                    <span className="sep" />

                    <span className="pop-anchor">
                      <button
                        type="button"
                        data-menu-trigger=""
                        title="Highlight color"
                        aria-label="Highlight color"
                        aria-haspopup="menu"
                        aria-expanded={openMenu === 'hilite'}
                        onMouseDown={keepFocus}
                        onClick={() => toggleMenu('hilite')}
                      >
                        🖍️
                      </button>
                      {openMenu === 'hilite' && (
                        <div className="popover" data-popover="" role="menu">
                          <div className="pop-title">highlight</div>
                          <div className="pick-row">
                            {HILITE_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                className="color-pick"
                                style={{ background: c }}
                                onMouseDown={keepFocus}
                                onClick={() => {
                                  exec('hiliteColor', c);
                                  setOpenMenu(null);
                                }}
                                title={`Highlight ${c}`}
                                aria-label={`Highlight color ${c}`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </span>

                    <span className="pop-anchor">
                      <button
                        type="button"
                        data-menu-trigger=""
                        title="Text color"
                        aria-label="Text color"
                        aria-haspopup="menu"
                        aria-expanded={openMenu === 'fore'}
                        onMouseDown={keepFocus}
                        onClick={() => toggleMenu('fore')}
                      >
                        A
                      </button>
                      {openMenu === 'fore' && (
                        <div className="popover" data-popover="" role="menu">
                          <div className="pop-title">text color</div>
                          <div className="pick-row">
                            {TEXT_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                className="color-pick"
                                style={{ background: c }}
                                onMouseDown={keepFocus}
                                onClick={() => {
                                  exec('foreColor', c);
                                  setOpenMenu(null);
                                }}
                                title={`Text color ${c}`}
                                aria-label={`Text color ${c}`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </span>

                    <button
                      type="button"
                      title="Clear formatting"
                      aria-label="Clear formatting"
                      onMouseDown={keepFocus}
                      onClick={() => exec('removeFormat')}
                    >
                      Tx
                    </button>

                    <span className="pop-anchor">
                      <button
                        type="button"
                        data-menu-trigger=""
                        title="Insert sticker"
                        aria-label="Insert sticker"
                        aria-haspopup="menu"
                        aria-expanded={openMenu === 'sticker'}
                        onMouseDown={keepFocus}
                        onClick={() => toggleMenu('sticker')}
                      >
                        🌸
                      </button>
                      {openMenu === 'sticker' && (
                        <div className="popover" data-popover="" role="menu">
                          <div className="pop-title">stickers</div>
                          {STICKER_SETS.map((set) => (
                            <div key={set.name}>
                              <div className="small muted bold">{set.name}</div>
                              <div className="sticker-grid">
                                {set.items.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    className="sticker-btn"
                                    onMouseDown={keepFocus}
                                    onClick={() => {
                                      exec('insertHTML', `<span style="font-size:1.5em">${emoji}</span>`);
                                      setOpenMenu(null);
                                    }}
                                    title={`Insert ${emoji}`}
                                    aria-label={`Insert sticker ${emoji}`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                          {rareStickers.length > 0 && (
                            <div>
                              <div className="small muted bold">{t('notes.rareStickers')}</div>
                              <div className="sticker-grid">
                                {rareStickers.map((emoji) => (
                                  <button
                                    key={`rare-${emoji}`}
                                    type="button"
                                    className="sticker-btn"
                                    onMouseDown={keepFocus}
                                    onClick={() => {
                                      exec('insertHTML', `<span style="font-size:1.5em">${emoji}</span>`);
                                      setOpenMenu(null);
                                    }}
                                    title={`Insert ${emoji}`}
                                    aria-label={`Insert rare sticker ${emoji}`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </span>

                    {dict.supported && (
                      <>
                        <span className="sep" />
                        <button
                          type="button"
                          title={dict.listening ? t('notes.micStop') : t('notes.mic')}
                          aria-label={dict.listening ? t('notes.micStop') : t('notes.mic')}
                          aria-pressed={dict.listening}
                          onMouseDown={keepFocus}
                          onClick={dict.toggle}
                        >
                          {dict.listening ? '🔴' : '🎤'}
                        </button>
                        {dict.listening && (
                          <span className="tag listening-tag" role="status">
                            ● {t('notes.listening')}
                          </span>
                        )}
                      </>
                    )}

                    <span className="sep" />
                    <button
                      type="button"
                      title={
                        !ttsOk
                          ? t('notes.ttsOff')
                          : speakingNow
                            ? t('notes.stopAloud')
                            : selected.text.trim()
                              ? t('notes.readAloud')
                              : t('notes.ttsEmpty')
                      }
                      aria-label={speakingNow ? t('notes.stopAloud') : t('notes.readAloud')}
                      disabled={!ttsOk || (!speakingNow && !selected.text.trim())}
                      onMouseDown={keepFocus}
                      onClick={toggleReadAloud}
                    >
                      {speakingNow ? '⏹' : '🔊'}
                    </button>
                    <button
                      type="button"
                      title={t('notes.aiBtn')}
                      aria-label={t('notes.aiBtn')}
                      onMouseDown={keepFocus}
                      onClick={openAi}
                    >
                      ✨
                    </button>
                  </div>

                  <div
                    ref={surfaceRef}
                    className="editor-surface"
                    contentEditable
                    suppressContentEditableWarning
                    role="textbox"
                    aria-multiline="true"
                    aria-label="Note body"
                    data-placeholder="start writing something cute… ✨"
                    onInput={() => scheduleCommit()}
                    onBlur={() => commitNow()}
                  />
                </div>
              ) : (
                <NoteDrawing noteId={selected.id} drawing={selected.drawing} />
              )}

              <div className="divider" />

              <div className="row wrap tag-editor">
                {selected.tags.map((tag) => (
                  <span className="tag" key={tag}>
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} title={`Remove tag ${tag}`} aria-label={`Remove tag ${tag}`}>
                      ✕
                    </button>
                  </span>
                ))}
                <input
                  className="input tag-input"
                  value={tagDraft}
                  placeholder="add tag…"
                  maxLength={24}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitTag();
                    }
                  }}
                  onBlur={commitTag}
                  aria-label="Add tag"
                />
                <span className="small muted">{selected.tags.length}/12</span>
              </div>

              <div className="row wrap note-tags-row">
                <span className="small bold muted">note color</span>
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-pick ${selected.color === c ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => updateNote(selected.id, { color: c })}
                    title={`Note color ${c}`}
                    aria-label={`Note color ${c}`}
                    aria-pressed={selected.color === c}
                  />
                ))}
              </div>

              <div className="divider" />

              <div className="row wrap editor-footer">
                <span className="small muted">{relTime(selected.updatedAt, nowMs)}</span>
                <span className="small muted hide-mobile">· created {new Date(selected.createdAt).toLocaleDateString()}</span>
                <span className="spacer" />
                <span className="pop-anchor">
                  <button
                    type="button"
                    className="btn btn-sm"
                    data-menu-trigger=""
                    aria-haspopup="menu"
                    aria-expanded={openMenu === 'export'}
                    onClick={() => toggleMenu('export')}
                    title="Export note"
                  >
                    <span aria-hidden="true">📤 </span>export
                  </button>
                  {openMenu === 'export' && (
                    <div className="popover right" data-popover="" role="menu">
                      <div className="pop-title">export as</div>
                      {EXPORT_ITEMS.map((item) => (
                        <button
                          key={item.format}
                          type="button"
                          className="menu-item"
                          role="menuitem"
                          onClick={() => {
                            setOpenMenu(null);
                            void exportNote(selected, item.format);
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </span>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirmNote(selected)} title="Delete note">
                  <span aria-hidden="true">🗑 </span>delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        open={folderModal !== null}
        title={folderModal?.mode === 'rename' ? 'Rename folder' : 'New folder'}
        onClose={() => setFolderModal(null)}
        actions={
          <>
            <button type="button" className="btn btn-soft" onClick={() => setFolderModal(null)}>
              cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={saveFolder} disabled={!folderDraft.name.trim()}>
              save folder
            </button>
          </>
        }
      >
        <div className="stack">
          <div>
            <label className="field-label" htmlFor="notes-folder-name">
              name
            </label>
            <input
              id="notes-folder-name"
              className="input"
              value={folderDraft.name}
              placeholder="folder name"
              onChange={(e) => setFolderDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
          <div>
            <span className="field-label">emoji</span>
            <div className="row wrap" style={{ gap: 6 }} role="group" aria-label="Folder emoji">
              {FOLDER_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`emoji-pick ${folderDraft.icon === emoji ? 'active' : ''}`}
                  onClick={() => setFolderDraft((d) => ({ ...d, icon: emoji }))}
                  title={`Use ${emoji}`}
                  aria-label={`Use ${emoji}`}
                  aria-pressed={folderDraft.icon === emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="field-label">color</span>
            <div className="row wrap" style={{ gap: 8 }} role="group" aria-label="Folder color">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-pick ${folderDraft.color === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setFolderDraft((d) => ({ ...d, color: c }))}
                  title={`Color ${c}`}
                  aria-label={`Folder color ${c}`}
                  aria-pressed={folderDraft.color === c}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={confirmFolder !== null}
        title="Delete this folder?"
        onClose={() => setConfirmFolder(null)}
        actions={
          <>
            <button type="button" className="btn btn-soft" onClick={() => setConfirmFolder(null)}>
              keep it
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmDeleteFolder}>
              delete folder
            </button>
          </>
        }
      >
        <p style={{ margin: 0, fontWeight: 700 }}>
          “{confirmFolder?.name}” will be removed 🗑 the notes inside are safe — they just move to “No folder”~
        </p>
      </Modal>

      <Modal
        open={confirmNote !== null}
        title="Delete this note?"
        onClose={() => setConfirmNote(null)}
        actions={
          <>
            <button type="button" className="btn btn-soft" onClick={() => setConfirmNote(null)}>
              keep it
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmDeleteNote}>
              delete note
            </button>
          </>
        }
      >
        <p style={{ margin: 0, fontWeight: 700 }}>
          “{confirmNote?.title.trim() || 'Untitled note 🌸'}” will be gone forever 🥺 this can’t be undone.
        </p>
      </Modal>

      <Modal open={tplOpen} title={t('notes.templatesTitle')} onClose={() => setTplOpen(false)}>
        <div className="tpl-grid">
          {NOTE_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              className="tpl-card"
              onClick={() => createFromTemplate(tpl)}
              title={tpl.name}
            >
              <span className="tpl-icon" aria-hidden="true">{tpl.icon}</span>
              <strong className="tpl-name">{tpl.name}</strong>
              <span className="small muted">{tpl.desc}</span>
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        open={aiOpen && selected !== null}
        title={t('notes.aiTitle')}
        onClose={() => setAiOpen(false)}
        wide
        actions={
          aiAction === 'summarize' && sumBullets && sumBullets.length > 0 ? (
            <button type="button" className="btn btn-primary" onClick={() => void copySummary()}>
              {aiCopied ? t('notes.aiCopied') : t('notes.aiCopy')}
            </button>
          ) : aiAction === 'cards' && genCards.length > 0 ? (
            <button type="button" className="btn btn-primary" onClick={importGenerated}>
              {t('notes.aiImportN', { n: genCards.length })}
            </button>
          ) : undefined
        }
      >
        <div className="stack">
          <div className="row wrap" style={{ gap: 8 }}>
            <button
              type="button"
              className={`btn btn-sm ${aiAction === 'summarize' ? 'btn-primary' : 'btn-soft'}`}
              onClick={() => void runSummarize()}
              disabled={sumBusy || cardsBusy || !selected?.text.trim()}
            >
              <span aria-hidden="true">📝 </span>
              {t('notes.aiSummarize')}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${aiAction === 'cards' ? 'btn-primary' : 'btn-soft'}`}
              onClick={() => void runMakeCards()}
              disabled={sumBusy || cardsBusy || !selected?.text.trim()}
            >
              <span aria-hidden="true">🃏 </span>
              {t('notes.aiCards')}
            </button>
            <span className="spacer" />
            {aiAction === 'summarize' && sumBullets !== null && (
              <span className={`engine-pill ${sumEngine === 'remote' ? 'remote' : ''}`}>
                {sumEngine === 'remote' ? t('notes.aiEngineRemote') : t('notes.aiEngineLocal')}
              </span>
            )}
            {aiAction === 'cards' && genCards.length > 0 && (
              <span className={`engine-pill ${cardsEngine === 'remote' ? 'remote' : ''}`}>
                {cardsEngine === 'remote' ? t('notes.aiEngineRemote') : t('notes.aiEngineLocal')}
              </span>
            )}
          </div>

          {(sumBusy || cardsBusy) && (
            <p className="small muted" style={{ margin: 0 }} role="status">
              {t('notes.aiWorking')}
            </p>
          )}
          {aiMsg && (
            <p className="notes-alert error" style={{ margin: 0 }} role="status">
              <span aria-hidden="true">⚠️ </span>
              {aiMsg}
            </p>
          )}
          {cardsMsg && (
            <p className="notes-alert ok" style={{ margin: 0 }} role="status">
              <span aria-hidden="true">🎉 </span>
              {cardsMsg}
            </p>
          )}

          {aiAction === 'summarize' && sumBullets !== null && sumBullets.length > 0 && (
            <ul className="ai-bullets">
              {sumBullets.map((bullet, i) => (
                <li key={`${i}-${bullet.slice(0, 16)}`}>{bullet}</li>
              ))}
            </ul>
          )}

          {aiAction === 'cards' && genCards.length > 0 && (
            <div className="stack" style={{ gap: 8 }}>
              <div className="row wrap" style={{ gap: 8 }}>
                <select
                  className="select"
                  style={{ width: 'auto', minWidth: 170 }}
                  value={deckValue}
                  onChange={(e) => {
                    setDeckChoice(e.target.value);
                    setCardsMsg(null);
                  }}
                  aria-label={t('notes.aiDeck')}
                >
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.icon} {deck.name}
                    </option>
                  ))}
                  <option value={NEW_DECK}>{t('notes.aiNewDeck')}</option>
                </select>
                {deckValue === NEW_DECK && (
                  <input
                    className="input"
                    style={{ width: 'auto', minWidth: 170 }}
                    placeholder={t('notes.aiDeckName')}
                    value={newDeckName}
                    onChange={(e) => setNewDeckName(e.target.value)}
                    aria-label={t('notes.aiDeckName')}
                  />
                )}
              </div>
              <div className="ai-card-list">
                {genCards.map((card, i) => (
                  <div key={`${i}-${card.front.slice(0, 16)}`} className="ai-card-row">
                    <strong>{card.front}</strong>
                    <span className="small muted">{card.back}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={confirmUnpublish}
        title={t('notes.unpublishTitle')}
        onClose={() => setConfirmUnpublish(false)}
        actions={
          <>
            <button type="button" className="btn btn-soft" onClick={() => setConfirmUnpublish(false)}>
              {t('notes.keepShared')}
            </button>
            <button type="button" className="btn btn-danger" onClick={() => void unpublish()}>
              {t('notes.unpublishConfirm')}
            </button>
          </>
        }
      >
        <p style={{ margin: 0, fontWeight: 700 }}>{t('notes.unpublishBody')}</p>
      </Modal>
    </div>
  );
}
