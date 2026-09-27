import { useMemo, useState } from 'react';
import { useApp, type Priority, type Task } from '@cutepad/core';
import { EmptyState, Ic, Mascot, ProgressBar, Segmented, type IconName } from '@cutepad/ui';
import './TasksView.css';

interface TaskDraft {
  id?: string;
  title: string;
  subjectId: string;
  priority: Priority;
  due: string;
}

export default function TasksView() {
  const tasks = useApp((s) => s.tasks);
  const subjects = useApp((s) => s.subjects);
  const addTask = useApp((s) => s.addTask);
  const updateTask = useApp((s) => s.updateTask);
  const deleteTask = useApp((s) => s.deleteTask);
  const toggleTask = useApp((s) => s.toggleTask);

  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('active');
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [doneOpen, setDoneOpen] = useState(false);
  const [draft, setDraft] = useState<TaskDraft>({
    title: '',
    subjectId: '',
    priority: 'medium',
    due: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [wiggle, setWiggle] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKeyStr = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}-${`${today.getDate()}`.padStart(2, '0')}`;

  const doneCount = tasks.filter((t) => t.done).length;
  const dueToday = tasks.filter((t) => !t.done && t.due === todayKeyStr);
  const allDueDone = dueToday.length === 0;

  const visible = useMemo(() => {
    let list = tasks;
    if (filter === 'active') list = list.filter((t) => !t.done);
    if (filter === 'done') list = list.filter((t) => t.done);
    if (priorities.length > 0) list = list.filter((t) => priorities.includes(t.priority));
    if (subjectFilter) list = list.filter((t) => t.subjectId === subjectFilter);
    return list;
  }, [tasks, filter, priorities, subjectFilter]);

  const groups: { key: Priority; label: string; icon: IconName }[] = [
    { key: 'high', label: 'high', icon: 'zap' },
    { key: 'medium', label: 'medium', icon: 'star' },
    { key: 'low', label: 'low', icon: 'sprout' },
  ];

  const activeList = visible.filter((t) => !t.done);
  const doneList = visible.filter((t) => t.done);

  const subjectOf = (id: string | null) => subjects.find((s) => s.id === id) ?? null;

  const commitAdd = () => {
    const title = draft.title.trim();
    if (!title) return;
    addTask({
      title,
      subjectId: draft.subjectId || null,
      priority: draft.priority,
      due: draft.due || null,
    });
    setDraft({ title: '', subjectId: '', priority: 'medium', due: '' });
  };

  const onToggle = (task: Task) => {
    toggleTask(task.id);
    if (!task.done) {
      setWiggle(task.id);
      window.setTimeout(() => setWiggle((w) => (w === task.id ? null : w)), 550);
    }
  };

  const dueInfo = (due: string) => {
    const [y, m, d] = due.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    const days = Math.round((target.getTime() - today.getTime()) / 86400000);
    if (days < 0) return { text: `${-days}d late`, late: true };
    if (days === 0) return { text: 'today', late: false };
    if (days === 1) return { text: 'tomorrow', late: false };
    if (days <= 7) return { text: `${days}d`, late: false };
    return { text: target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), late: false };
  };

  const togglePriorityFilter = (p: Priority) =>
    setPriorities((list) => (list.includes(p) ? list.filter((x) => x !== p) : [...list, p]));

  const renderTask = (task: Task) => {
    const subject = subjectOf(task.subjectId);
    const due = task.due ? dueInfo(task.due) : null;
    const editing = editingId === task.id;
    return (
      <div
        key={task.id}
        className={`task-row priority-${task.priority} ${task.done ? 'done' : ''} ${wiggle === task.id ? 'anim-wiggle' : ''}`}
      >
        <button
          type="button"
          className={`check ${task.done ? 'done' : ''}`}
          aria-label={task.done ? `Mark ${task.title} as not done` : `Complete ${task.title}`}
          aria-pressed={task.done}
          onClick={() => onToggle(task)}
        >
          ✓
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              className="input"
              autoFocus
              value={editTitle}
              aria-label="Task title"
              style={{ padding: '6px 10px' }}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => {
                if (editTitle.trim()) updateTask(task.id, { title: editTitle.trim() });
                setEditingId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') setEditingId(null);
              }}
            />
          ) : (
            <div
              className={`bold small ${task.done ? 'strike' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setEditingId(task.id);
                setEditTitle(task.title);
              }}
              title="Click to edit"
            >
              {task.title}
            </div>
          )}
          <div className="row wrap" style={{ gap: 6, marginTop: 3 }}>
            {subject && (
              <span className="pill small">
                <span className="dot" style={{ background: subject.color }} />
                <span aria-hidden="true">{subject.icon} </span>
                {subject.name}
              </span>
            )}
            {due && (
              <span
                className="tag"
                style={due.late && !task.done ? { background: '#ffd7e3', color: '#c2436a' } : undefined}
              >
                <Ic name="calendar" size={15} /> 
                {due.text}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-soft"
          title="Edit task"
          aria-label="Edit task"
          onClick={() => {
            setEditingId(task.id);
            setEditTitle(task.title);
          }}
        >
          <Ic name="pencil" size={14} />
        </button>
        <button
          type="button"
          className="btn btn-sm btn-soft"
          title="Change due date"
          aria-label="Change due date"
          onClick={() => {
            const value = prompt('Due date (YYYY-MM-DD), empty to clear:', task.due ?? '');
            if (value !== null) updateTask(task.id, { due: value.trim() || null });
          }}
        >
          <Ic name="calendar" size={14} />
        </button>
        <button
          type="button"
          className="btn btn-sm btn-danger"
          title="Delete task"
          aria-label="Delete task"
          onClick={() => {
            if (confirm(`Delete "${task.title}"?`)) deleteTask(task.id);
          }}
        >
          <Ic name="trash" size={14} />
        </button>
      </div>
    );
  };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head">
        <div>
          <div className="page-title" role="heading" aria-level={1}>Tasks <Ic className="inline-icon" name="checkCircle" size={20} /></div>
          <div className="page-sub">tiny checkboxes, big celebrations</div>
        </div>
        <span className="spacer" />
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'all', label: 'All' },
            { value: 'done', label: 'Done' },
          ]}
        />
      </div>

      <div className="card pad">
        <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
          <Mascot mood={allDueDone && dueToday.length > 0 ? 'cheer' : 'idle'} size={76} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="row between" style={{ marginBottom: 6 }}>
              <strong className="small">
                {doneCount} of {tasks.length} done
                {dueToday.length > 0 ? ` · ${dueToday.filter((t) => t.done).length}/${dueToday.length} due today` : ''}
              </strong>
              <span className="muted small">
                {allDueDone && tasks.length > 0 ? 'everything due today is done! 🎀' : 'you got this~ 💪'}
              </span>
            </div>
            <ProgressBar pct={tasks.length ? (doneCount / tasks.length) * 100 : 0} />
            <div className="row wrap" style={{ marginTop: 12, gap: 8 }}>
              {groups.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  className={`chip ${priorities.includes(g.key) ? 'active' : ''}`}
                  aria-pressed={priorities.includes(g.key)}
                  onClick={() => togglePriorityFilter(g.key)}
                >
                  <Ic name={g.icon} size={14} /> 
                  {g.label}
                </button>
              ))}
              <button
                type="button"
                className={`chip ${subjectFilter === 'all' || !subjectFilter ? 'active' : ''}`}
                aria-pressed={subjectFilter === 'all' || !subjectFilter}
                onClick={() => setSubjectFilter(null)}
              >
                all subjects
              </button>
              {subjects.slice(0, 5).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`chip ${subjectFilter === s.id ? 'active' : ''}`}
                  aria-pressed={subjectFilter === s.id}
                  onClick={() => setSubjectFilter(s.id)}
                >
                  <span aria-hidden="true">{s.icon} </span>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card pad">
        <div className="card-title"><Ic name="plus" size={17} /> add a task</div>
        <div className="row wrap" style={{ gap: 10 }}>
          <input
            className="input"
            style={{ flex: 2, minWidth: 200 }}
            placeholder="what needs doing? 🌼"
            aria-label="Task title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && commitAdd()}
          />
          <select
            className="select"
            style={{ flex: 1, minWidth: 140 }}
            aria-label="Subject"
            value={draft.subjectId}
            onChange={(e) => setDraft({ ...draft, subjectId: e.target.value })}
          >
            <option value="">— subject —</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {s.name}
              </option>
            ))}
          </select>
          <Segmented
            value={draft.priority}
            onChange={(p) => setDraft({ ...draft, priority: p })}
            options={[
              { value: 'high', label: <><Ic name="zap" size={14} /> high</> },
              { value: 'medium', label: <><Ic name="star" size={14} /> med</> },
              { value: 'low', label: <><Ic name="sprout" size={14} /> low</> },
            ]}
          />
          <input
            className="input"
            type="date"
            style={{ width: 'auto', minWidth: 150 }}
            aria-label="Due date"
            value={draft.due}
            onChange={(e) => setDraft({ ...draft, due: e.target.value })}
          />
          <button type="button" className="btn btn-primary" onClick={commitAdd} disabled={!draft.title.trim()}>
            add <Ic name="pencil" size={15} />
          </button>
        </div>
      </div>

      {activeList.length > 0 && filter !== 'done' && (
        <div className="stack" style={{ gap: 14 }}>
          {groups.map((g) => {
            const rows = activeList.filter((t) => t.priority === g.key);
            if (rows.length === 0) return null;
            return (
              <div key={g.key} className="stack" style={{ gap: 8 }}>
                <div className="section-title">
                  <Ic name={g.icon} size={14} /> {g.label} <span className="muted small">({rows.length})</span>
                </div>
                {rows.map(renderTask)}
              </div>
            );
          })}
        </div>
      )}

      {filter !== 'active' && doneList.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          <button
            type="button"
            className="btn btn-soft btn-sm"
            style={{ alignSelf: 'flex-start' }}
            aria-expanded={doneOpen}
            onClick={() => setDoneOpen((o) => !o)}
          >
            <span aria-hidden="true">{doneOpen ? '▾' : '▸'}</span> done ({doneList.length})
          </button>
          {doneOpen && doneList.map(renderTask)}
        </div>
      )}

      {visible.length === 0 && (
        <EmptyState
          icon={filter === 'done' ? 'gift' : 'cloud'}
          title={filter === 'done' ? 'nothing finished yet' : 'no tasks here'}
          hint={filter === 'done' ? 'complete a task to see it sparkle' : 'add one above — or enjoy the calm~'}
        />
      )}
    </div>
  );
}
