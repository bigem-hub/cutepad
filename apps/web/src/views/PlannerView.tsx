import { useMemo, useRef, useState } from 'react';
import { DAY_LABELS, dayKey, formatTime12, useApp, type Reminder, type TimeBlock } from '@cutepad/core';
import { EmptyState, Modal, Segmented, Toggle } from '@cutepad/ui';
import { ensureNotificationPermission, useHashRoute, useNow } from '../hooks';
import './PlannerView.css';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);
const HOUR_PX = 40;
const DAY_START = 7 * 60;
const SNAP = 15;

const pad = (n: number) => `${n}`.padStart(2, '0');

function minutesToLabel(min: number): string {
  return formatTime12(`${pad(Math.floor(min / 60))}:${pad(min % 60)}`);
}

function addDays(date: Date, count: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + count);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

interface BlockDraft {
  id?: string;
  title: string;
  subjectId: string;
  date: string;
  startMin: number;
  durationMin: number;
  color: string;
}

function toDraft(block: TimeBlock): BlockDraft {
  return {
    id: block.id,
    title: block.title,
    subjectId: block.subjectId ?? '',
    date: block.date,
    startMin: block.startMin,
    durationMin: block.durationMin,
    color: block.color,
  };
}

export default function PlannerView() {
  const now = useNow(60_000);
  const [, navigate] = useHashRoute();
  const blocks = useApp((s) => s.blocks);
  const tasks = useApp((s) => s.tasks);
  const subjects = useApp((s) => s.subjects);
  const reminders = useApp((s) => s.reminders);
  const addBlock = useApp((s) => s.addBlock);
  const updateBlock = useApp((s) => s.updateBlock);
  const deleteBlock = useApp((s) => s.deleteBlock);
  const addReminder = useApp((s) => s.addReminder);
  const updateReminder = useApp((s) => s.updateReminder);
  const deleteReminder = useApp((s) => s.deleteReminder);

  const [view, setView] = useState<'week' | 'month'>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [blockDraft, setBlockDraft] = useState<BlockDraft | null>(null);
  const [reminderDraft, setReminderDraft] = useState<
    (Partial<Reminder> & { id?: string; title: string; time: string; days: number[] }) | null
  >(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    block: TimeBlock;
    mode: 'move' | 'resize';
    grabOffsetY: number;
    moved: boolean;
  } | null>(null);
  const [preview, setPreview] = useState<{ id: string; date: string; startMin: number; durationMin: number } | null>(null);

  const today = dayKey(now);
  const weekStart = useMemo(() => addDays(startOfWeek(now), weekOffset * 7), [now, weekOffset]);
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(weekStart, i);
        return { key: dayKey(d), label: DAY_LABELS[d.getDay()], num: d.getDate() };
      }),
    [weekStart],
  );

  const monthCursor = useMemo(
    () => new Date(now.getFullYear(), now.getMonth() + monthOffset, 1),
    [now, monthOffset],
  );
  const monthCells = useMemo(() => {
    const firstDow = (monthCursor.getDay() + 6) % 7;
    const days = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();
    const cells: (string | null)[] = Array.from({ length: firstDow }, () => null);
    for (let i = 1; i <= days; i++) cells.push(dayKey(new Date(monthCursor.getFullYear(), monthCursor.getMonth(), i)));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [monthCursor]);

  const blocksByDay = useMemo(() => {
    const map = new Map<string, TimeBlock[]>();
    for (const b of blocks) {
      const list = map.get(b.date) ?? [];
      list.push(b);
      map.set(b.date, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.startMin - b.startMin);
    return map;
  }, [blocks]);

  const deadlines = useMemo(
    () =>
      tasks
        .filter((t) => !t.done && t.due)
        .map((t) => {
          const [y, m, d] = t.due!.split('-').map(Number);
          const target = new Date(y, m - 1, d).getTime();
          const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          return { task: t, days: Math.round((target - startToday) / 86400000) };
        })
        .filter((x) => x.days <= 21)
        .sort((a, b) => a.days - b.days),
    [tasks, now],
  );

  const subjectName = (id: string | null) => subjects.find((s) => s.id === id) ?? null;

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const snap = (v: number) => Math.round(v / SNAP) * SNAP;

  const beginDrag = (
    e: React.PointerEvent,
    block: TimeBlock,
    mode: 'move' | 'resize',
    grabOffsetY: number,
  ) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { block, mode, grabOffsetY, moved: false };
    setPreview({ id: block.id, date: block.date, startMin: block.startMin, durationMin: block.durationMin });
  };

  const columnFromX = (clientX: number): { date: string; top: number } | null => {
    const grid = gridRef.current;
    if (!grid) return null;
    const cols = grid.querySelectorAll<HTMLElement>('[data-date]');
    for (const col of Array.from(cols)) {
      const rect = col.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) return { date: col.dataset.date!, top: rect.top };
    }
    return null;
  };

  const onDragMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) drag.moved = true;
    const hit = columnFromX(e.clientX);
    if (!hit) return;
    setDragOver(hit.date);
    if (drag.mode === 'move') {
      const raw = ((e.clientY - hit.top - drag.grabOffsetY) / HOUR_PX) * 60 + DAY_START;
      const startMin = clamp(snap(raw), DAY_START, 23 * 60 - drag.block.durationMin);
      setPreview((p) => (p ? { ...p, date: hit.date, startMin, durationMin: drag.block.durationMin } : p));
    } else {
      const raw = ((e.clientY - hit.top) / HOUR_PX) * 60 + DAY_START - drag.block.startMin;
      const durationMin = clamp(snap(raw), SNAP, 360);
      setPreview((p) => (p ? { ...p, date: hit.date, startMin: drag.block.startMin, durationMin } : p));
    }
  };

  const endDrag = () => {
    const drag = dragRef.current;
    const current = preview;
    dragRef.current = null;
    setDragOver(null);
    if (!drag || !current) return;
    if (drag.moved) {
      updateBlock(drag.block.id, {
        date: current.date,
        startMin: current.startMin,
        durationMin: current.durationMin,
      });
    } else if (drag.mode === 'move') {
      setBlockDraft(toDraft(drag.block));
    }
    setPreview(null);
  };

  const openAdd = (date: string, startMin = 16 * 60) => {
    const fallback = subjects[0];
    setBlockDraft({
      title: '',
      subjectId: fallback?.id ?? '',
      date,
      startMin: clamp(snap(startMin), DAY_START, 22 * 60),
      durationMin: 60,
      color: fallback?.color ?? '#ffd1e3',
    });
  };

  const saveBlock = () => {
    if (!blockDraft) return;
    const title = blockDraft.title.trim() || 'Study block 🌸';
    if (blockDraft.id) {
      updateBlock(blockDraft.id, {
        title,
        subjectId: blockDraft.subjectId || null,
        date: blockDraft.date,
        startMin: blockDraft.startMin,
        durationMin: blockDraft.durationMin,
        color: blockDraft.color,
      });
    } else {
      addBlock({
        title,
        subjectId: blockDraft.subjectId || null,
        date: blockDraft.date,
        startMin: blockDraft.startMin,
        durationMin: blockDraft.durationMin,
        color: blockDraft.color,
      });
    }
    setBlockDraft(null);
  };

  const saveReminder = async () => {
    if (!reminderDraft) return;
    if (reminderDraft.days.length === 0 || !reminderDraft.title.trim()) return;
    if (reminderDraft.id) {
      updateReminder(reminderDraft.id, {
        title: reminderDraft.title,
        time: reminderDraft.time,
        days: reminderDraft.days,
        subjectId: reminderDraft.subjectId ?? null,
      });
    } else {
      addReminder({
        title: reminderDraft.title,
        time: reminderDraft.time,
        days: reminderDraft.days,
        subjectId: reminderDraft.subjectId ?? null,
      });
      await ensureNotificationPermission();
    }
    setReminderDraft(null);
  };

  const dayLabel = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const timeOptions = (value: number, onChange: (min: number) => void) => (
    <select
      id="block-start"
      className="select"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {Array.from({ length: ((23 * 60 - DAY_START) / SNAP) + 1 }, (_, i) => DAY_START + i * SNAP).map((min) => (
        <option key={min} value={min}>
          {minutesToLabel(min)}
        </option>
      ))}
    </select>
  );

  const renderBlock = (block: TimeBlock) => {
    const shown = preview?.id === block.id ? { ...block, ...preview } : block;
    const subject = subjectName(block.subjectId);
    const top = ((shown.startMin - DAY_START) / 60) * HOUR_PX;
    const height = (shown.durationMin / 60) * HOUR_PX - 4;
    return (
      <div
        key={block.id}
        className="time-block"
        data-block-id={block.id}
        role="button"
        tabIndex={0}
        aria-label={`${block.title}, ${dayLabel(block.date)} at ${minutesToLabel(block.startMin)}, ${block.durationMin} minutes — press Enter to edit, drag to move`}
        style={{
          top: Math.max(0, top),
          height: Math.max(24, height),
          background: shown.color,
          outline: preview?.id === block.id ? '2px dashed var(--accent)' : undefined,
        }}
        title={`${block.title} · ${minutesToLabel(block.startMin)}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setBlockDraft(toDraft(block));
          }
        }}
        onPointerDown={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          beginDrag(e, block, 'move', e.clientY - rect.top);
        }}
        onPointerMove={onDragMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="block-title-row">
          <span className="block-title">{block.title}</span>
        </div>
        <div className="block-sub">
          {subject ? `${subject.icon} ` : ''}
          {minutesToLabel(block.startMin)} · {block.durationMin}m
        </div>
        <span
          className="resize-handle"
          aria-hidden="true"
          onPointerDown={(e) => {
            e.stopPropagation();
            const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
            beginDrag(e, block, 'resize', e.clientY - rect.top);
          }}
          onPointerMove={onDragMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />
      </div>
    );
  };

  const selectedDayBlocks = selectedDay ? (blocksByDay.get(selectedDay) ?? []) : [];
  const selectedDayTasks = selectedDay
    ? tasks.filter((t) => !t.done && t.due === selectedDay)
    : [];

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head">
        <div>
          <div className="page-title" role="heading" aria-level={1}>Study Planner<span aria-hidden="true"> 🗓️</span></div>
          <div className="page-sub">drag blocks around to reshape your week</div>
        </div>
        <span className="spacer" />
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
          ]}
        />
        <button
          type="button"
          className="btn btn-soft"
          title="Import deadlines from a syllabus"
          onClick={() => (window.location.hash = '/smart?tab=syllabus')}
        >
          <span aria-hidden="true">✨ </span>import syllabus
        </button>
        <button type="button" className="btn btn-primary" onClick={() => openAdd(view === 'week' ? weekDays[0].key : today)}>
          <span aria-hidden="true">＋ </span>add block
        </button>
      </div>

      {view === 'week' ? (
        <>
          <div className="card pad" style={{ overflow: 'hidden' }}>
            <div className="row between" style={{ marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div className="row">
                <button type="button" className="btn btn-sm btn-soft" onClick={() => setWeekOffset((w) => w - 1)}>
                  ‹ prev
                </button>
                <button type="button" className="btn btn-sm" onClick={() => setWeekOffset(0)}>
                  this week
                </button>
                <button type="button" className="btn btn-sm btn-soft" onClick={() => setWeekOffset((w) => w + 1)}>
                  next ›
                </button>
              </div>
              <strong style={{ fontFamily: 'var(--font-display)' }}>
                {weekDays[0].num} {new Date(weekStart).toLocaleDateString(undefined, { month: 'short' })} –{' '}
                {weekDays[6].num} {new Date(addDays(weekStart, 6)).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
              </strong>
              <div className="row wrap" style={{ gap: 12 }}>
                {subjects.slice(0, 6).map((s) => (
                  <span className="pill" key={s.id}>
                    <span className="dot" style={{ background: s.color }} />
                    <span aria-hidden="true">{s.icon} </span>
                    {s.name}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto', paddingBottom: 6 }}>
              <div style={{ minWidth: 720 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ width: 54, flexShrink: 0 }} />
                  <div className="planner-grid" style={{ flex: 1 }}>
                    {weekDays.map((d) => (
                      <div
                        key={d.key}
                        className="center small bold"
                        style={{ color: d.key === today ? 'var(--link)' : 'var(--fg-muted)', paddingBottom: 6 }}
                      >
                        {d.label} <span style={{ opacity: 0.7 }}>{d.num}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ width: 54, flexShrink: 0 }}>
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        style={{
                          height: HOUR_PX,
                          fontSize: 11,
                          fontWeight: 800,
                          color: 'var(--fg-muted)',
                          textAlign: 'right',
                          paddingRight: 8,
                          marginTop: -6,
                        }}
                      >
                        {h % 12 === 0 ? 12 : h % 12}
                        {h < 12 ? 'a' : 'p'}
                      </div>
                    ))}
                  </div>
                  <div className="planner-grid" style={{ flex: 1 }} ref={gridRef}>
                    {weekDays.map((d) => (
                      <div
                        key={d.key}
                        data-date={d.key}
                        className={`planner-col ${d.key === today ? 'today' : ''} ${dragOver === d.key ? 'drag-over' : ''}`}
                        style={{ paddingTop: 0, height: HOURS.length * HOUR_PX + 8 }}
                        onDoubleClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const min = snap(((e.clientY - rect.top) / HOUR_PX) * 60 + DAY_START);
                          openAdd(d.key, clamp(min, DAY_START, 22 * 60));
                        }}
                      >
                        {HOURS.map((h) => (
                          <div className="hour-line" key={h} />
                        ))}
                        {(blocksByDay.get(d.key) ?? []).map(renderBlock)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="card pad">
            <div className="row between" style={{ marginBottom: 10 }}>
              <div className="row">
                <button type="button" className="btn btn-sm btn-soft" aria-label="Previous month" onClick={() => setMonthOffset((m) => m - 1)}>
                  ‹
                </button>
                <button type="button" className="btn btn-sm" onClick={() => setMonthOffset(0)}>
                  today
                </button>
                <button type="button" className="btn btn-sm btn-soft" aria-label="Next month" onClick={() => setMonthOffset((m) => m + 1)}>
                  ›
                </button>
              </div>
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: 17 }}>
                {monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </strong>
              <span className="small muted">{blocks.length} blocks</span>
            </div>
            <div className="month-grid">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
                <div key={label} className="center small bold muted" style={{ paddingBottom: 4 }}>
                  {label}
                </div>
              ))}
              {monthCells.map((key, i) => {
                if (!key) return <div key={`blank-${i}`} />;
                const dayBlocks = blocksByDay.get(key) ?? [];
                const dueCount = tasks.filter((t) => !t.done && t.due === key).length;
                const dayNum = Number(key.slice(8));
                return (
                  <button
                    key={key}
                    type="button"
                    className={`month-cell ${key === today ? 'today' : ''}`}
                    style={selectedDay === key ? { borderColor: 'var(--accent)' } : undefined}
                    aria-pressed={selectedDay === key}
                    onClick={() => setSelectedDay(key)}
                  >
                    <div className="row between">
                      <span>{dayNum}</span>
                      {dueCount > 0 && <span style={{ fontSize: 11 }}><span aria-hidden="true">📌</span>{dueCount}</span>}
                    </div>
                    <div className="month-dots">
                      {dayBlocks.slice(0, 6).map((b) => (
                        <span key={b.id} className="dot" style={{ background: b.color, width: 9, height: 9 }} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDay && (
            <div className="card pad">
              <div className="card-title">
                {dayLabel(selectedDay)}
                <span className="spacer" />
                <button type="button" className="btn btn-sm btn-primary" onClick={() => openAdd(selectedDay)}>
                  <span aria-hidden="true">＋ </span>add block
                </button>
              </div>
              {selectedDayBlocks.length === 0 && selectedDayTasks.length === 0 ? (
                <EmptyState emoji="🫧" title="Nothing planned" hint="a free day — rest or play!" />
              ) : (
                <div className="stack" style={{ gap: 8 }}>
                  {selectedDayBlocks.map((b) => (
                    <div key={b.id} className="row">
                      <span className="dot" style={{ background: b.color, width: 13, height: 13 }} />
                      <strong className="small">{minutesToLabel(b.startMin)}</strong>
                      <span className="small">{b.title}</span>
                      <span className="spacer" />
                      <button type="button" className="btn btn-sm btn-soft" aria-label={`Edit ${b.title}`} onClick={() => setBlockDraft(toDraft(b))}>
                        edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        aria-label={`Delete ${b.title}`}
                        onClick={() => {
                          if (confirm(`Delete "${b.title}"?`)) deleteBlock(b.id);
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  ))}
                  {selectedDayTasks.map((t) => (
                    <div key={t.id} className="row">
                      <span aria-hidden="true">📌</span>
                      <span className="small">{t.title}</span>
                      <span className="spacer" />
                      <button type="button" className="btn btn-sm btn-soft" onClick={() => navigate('/tasks')}>
                        open tasks
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="grid wide">
        <div className="card pad">
          <div className="card-title"><span aria-hidden="true">📌 </span>deadlines coming up</div>
          {deadlines.length === 0 ? (
            <EmptyState emoji="🌈" title="No deadlines soon" hint="everything is under control~" />
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {deadlines.map(({ task, days }) => (
                <button
                  key={task.id}
                  type="button"
                  className="row"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', color: 'inherit' }}
                  onClick={() => navigate('/tasks')}
                >
                  <span
                    className="tag"
                    style={days <= 0 ? { background: '#ffd7e3', color: '#c2436a' } : days <= 3 ? { background: '#ffe9c7' } : undefined}
                  >
                    {days < 0 ? `${-days}d late` : days === 0 ? 'today!' : `${days}d left`}
                  </span>
                  <span className="small bold">{task.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card pad">
          <div className="card-title">
            <span aria-hidden="true">🔔 </span>recurring reminders
            <span className="spacer" />
            <button
              type="button"
              className="btn btn-sm btn-primary"
              aria-label="New reminder"
              onClick={() => setReminderDraft({ title: '', time: '08:00', days: [1, 2, 3, 4, 5] })}
            >
              <span aria-hidden="true">＋ </span>new
            </button>
          </div>
          {reminders.length === 0 ? (
            <EmptyState emoji="⏰" title="No reminders" hint="set a cozy nudge for study time" />
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {reminders.map((r) => (
                <div key={r.id} className="row" style={{ gap: 10 }}>
                  <Toggle
                    checked={r.enabled}
                    label={`Enable ${r.title}`}
                    onChange={async (value) => {
                      updateReminder(r.id, { enabled: value });
                      if (value) await ensureNotificationPermission();
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="small bold" style={{ textDecoration: r.enabled ? 'none' : 'line-through', opacity: r.enabled ? 1 : 0.6 }}>
                      {r.title}
                    </div>
                    <div className="small muted">
                      {formatTime12(r.time)} · {r.days.length === 7 ? 'every day' : r.days.map((d) => DAY_LABELS[d]).join(' ')}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-soft"
                    title="Edit reminder"
                    aria-label="Edit reminder"
                    onClick={() =>
                      setReminderDraft({
                        id: r.id,
                        title: r.title,
                        time: r.time,
                        days: [...r.days],
                        subjectId: r.subjectId,
                      })
                    }
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    title="Delete reminder"
                    aria-label="Delete reminder"
                    onClick={() => {
                      if (confirm(`Delete reminder "${r.title}"?`)) deleteReminder(r.id);
                    }}
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={blockDraft !== null}
        title={blockDraft?.id ? 'Edit study block ✏️' : 'New study block 🌸'}
        onClose={() => setBlockDraft(null)}
        actions={
          <>
            {blockDraft?.id && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  if (confirm('Delete this block?')) deleteBlock(blockDraft.id!);
                  setBlockDraft(null);
                }}
              >
                delete
              </button>
            )}
            <button type="button" className="btn" onClick={() => setBlockDraft(null)}>
              cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={saveBlock}>
              save
            </button>
          </>
        }
      >
        {blockDraft && (
          <div className="stack">
            <label className="field-label" htmlFor="block-title">title</label>
            <input
              id="block-title"
              className="input"
              autoFocus
              placeholder="Calculus practice 📐"
              value={blockDraft.title}
              onChange={(e) => setBlockDraft({ ...blockDraft, title: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && saveBlock()}
            />
            <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <label className="field-label" htmlFor="block-subject">subject</label>
                <select
                  id="block-subject"
                  className="select"
                  value={blockDraft.subjectId}
                  onChange={(e) => {
                    const subject = subjects.find((s) => s.id === e.target.value);
                    setBlockDraft({
                      ...blockDraft,
                      subjectId: e.target.value,
                      color: subject ? subject.color : blockDraft.color,
                    });
                  }}
                >
                  <option value="">— none —</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.icon} {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="field-label" htmlFor="block-day">day</label>
                <select
                  id="block-day"
                  className="select"
                  value={blockDraft.date}
                  onChange={(e) => setBlockDraft({ ...blockDraft, date: e.target.value })}
                >
                  {view === 'week'
                    ? weekDays.map((d) => (
                        <option key={d.key} value={d.key}>
                          {d.label} {d.num}
                        </option>
                      ))
                    : monthCells.filter(Boolean).map((key) => (
                        <option key={key!} value={key!}>
                          {dayLabel(key!)}
                        </option>
                      ))}
                </select>
              </div>
            </div>
            <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <label className="field-label" htmlFor="block-start">start</label>
                {timeOptions(blockDraft.startMin, (min) =>
                  setBlockDraft({
                    ...blockDraft,
                    startMin: min,
                    durationMin: Math.min(blockDraft.durationMin, 23 * 60 - min),
                  }),
                )}
              </div>
              <div style={{ flex: 1 }}>
                <label className="field-label" htmlFor="block-duration">duration</label>
                <select
                  id="block-duration"
                  className="select"
                  value={blockDraft.durationMin}
                  onChange={(e) => setBlockDraft({ ...blockDraft, durationMin: Number(e.target.value) })}
                >
                  {[15, 30, 45, 60, 75, 90, 120, 150, 180, 240].map((m) => (
                    <option key={m} value={m}>
                      {m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="field-label">color</label>
            <div className="row wrap" role="group" aria-label="Block color">
              {['#ffd1e3', '#e3d1ff', '#cdeee4', '#cfe5ff', '#ffe9c7', '#ffd8c2', '#d0f0c0', '#f6c9e8'].map((color) => (
                <button
                  key={color}
                  type="button"
                  className="swatch-btn"
                  aria-label={`Color ${color}`}
                  aria-pressed={blockDraft.color === color}
                  style={{ background: color, width: 30, height: 30 }}
                  onClick={() => setBlockDraft({ ...blockDraft, color })}
                >
                  {blockDraft.color === color ? '✓' : ''}
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={reminderDraft !== null}
        title={reminderDraft?.id ? 'Edit reminder 🔔' : 'New reminder 🔔'}
        onClose={() => setReminderDraft(null)}
        actions={
          <>
            <button type="button" className="btn" onClick={() => setReminderDraft(null)}>
              cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={saveReminder}>
              save
            </button>
          </>
        }
      >
        {reminderDraft && (
          <div className="stack">
            <label className="field-label" htmlFor="reminder-title">what should we remind you?</label>
            <input
              id="reminder-title"
              className="input"
              autoFocus
              placeholder="Morning study session 🌤️"
              value={reminderDraft.title}
              onChange={(e) => setReminderDraft({ ...reminderDraft, title: e.target.value })}
            />
            <label className="field-label" htmlFor="reminder-time">time</label>
            <input
              id="reminder-time"
              className="input"
              type="time"
              value={reminderDraft.time}
              onChange={(e) => setReminderDraft({ ...reminderDraft, time: e.target.value })}
            />
            <label className="field-label">repeat on</label>
            <div className="row wrap" role="group" aria-label="Repeat on">
              {DAY_LABELS.map((label, index) => {
                const active = reminderDraft.days.includes(index);
                return (
                  <button
                    key={label}
                    type="button"
                    className={`chip ${active ? 'active' : ''}`}
                    aria-pressed={active}
                    onClick={() =>
                      setReminderDraft({
                        ...reminderDraft,
                        days: active
                          ? reminderDraft.days.filter((d) => d !== index)
                          : [...reminderDraft.days, index].sort(),
                      })
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="row">
              <button
                type="button"
                className="chip"
                onClick={() => setReminderDraft({ ...reminderDraft, days: [0, 1, 2, 3, 4, 5, 6] })}
              >
                every day
              </button>
              <button
                type="button"
                className="chip"
                onClick={() => setReminderDraft({ ...reminderDraft, days: [1, 2, 3, 4, 5] })}
              >
                weekdays
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
