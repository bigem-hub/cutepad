import { useState, type FormEvent } from 'react';
import {
  applyAuthUser,
  firebaseLogin,
  firebaseResetPassword,
  firebaseSignUp,
  performSync,
  restoreAccountData,
  useApp,
  type AuthUser,
} from '@cutepad/core';
import { Ic, Mascot, type IconName } from '@cutepad/ui';
import { REMEMBER_LOGIN_KEY, useHashRoute } from '../hooks';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 4 }}>
      <div className="brand" style={{ justifyContent: 'center' }}>
        <span className="brand-dot" aria-hidden="true">
          <Ic name="flower" size={16} />
        </span>
        Cutepad
      </div>
      {subtitle && <p className="auth-sub">{subtitle}</p>}
    </div>
  );
}

function FieldError({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="form-error" role="alert">
      {msg}
    </div>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  hint?: string;
}

function PasswordField({ id, label, value, onChange, autoComplete, hint }: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="pw-wrap">
        <input
          id={id}
          className="input"
          type={show ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="pw-toggle"
          aria-label={show ? 'hide password' : 'show password'}
          title={show ? 'hide password' : 'show password'}
          onClick={() => setShow((s) => !s)}
        >
          <Ic name={show ? 'eyeOff' : 'eye'} size={17} />
        </button>
      </div>
      {hint && <div className="small muted" style={{ marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

/** shared post-auth steps: persist the session + land them in the app instantly; the network
 * backup restore runs in the background (guarded — never blocks or hijacks the UI) */
function finishAuth(navigate: (to: string) => void, user: AuthUser) {
  applyAuthUser(user);
  const s = useApp.getState();
  s.completeOnboarding();
  navigate('/');
  void restoreAccountData(user.email).then(() => {
    const s2 = useApp.getState();
    if (s2.settings.legal.sync) void performSync();
  });
}

export function LoginPage() {
  const [, navigate] = useHashRoute();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [remember, setRemember] = useState(() => localStorage.getItem(REMEMBER_LOGIN_KEY) !== '0');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onEmail = (v: string) => {
    setEmail(v);
    if (err) setErr(null);
  };
  const onPass = (v: string) => {
    setPass(v);
    if (err) setErr(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr(null);
    if (!EMAIL_RE.test(email.trim())) {
      setErr('please enter a valid email address');
      return;
    }
    if (!pass) {
      setErr('please enter your password');
      return;
    }
    setBusy(true);
    try {
      const user = await firebaseLogin(email.trim(), pass);
      localStorage.setItem(REMEMBER_LOGIN_KEY, remember ? '1' : '0');
      finishAuth(navigate, user);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'login failed — please try again');
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <Brand subtitle="welcome back — let’s get you cozy again" />
      <div className="card pad" style={{ marginTop: 10 }}>
        <h1 className="auth-title">log in</h1>
        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label className="field-label" htmlFor="login-email">
              email
            </label>
            <input
              id="login-email"
              className="input"
              type="email"
              value={email}
              autoComplete="username"
              placeholder="you@example.com"
              autoFocus
              onChange={(e) => onEmail(e.target.value)}
            />
          </div>
          <PasswordField
            id="login-pass"
            label="password"
            value={pass}
            onChange={onPass}
            autoComplete="current-password"
          />
          <FieldError msg={err} />
          <div className="auth-row">
            <label>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              remember me
            </label>
            <button type="button" className="link-btn" onClick={() => navigate('/forgot')}>
              forgot password?
            </button>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy} aria-busy={busy}>
            {busy ? 'logging in…' : 'log in'}
          </button>
        </form>
        <div className="auth-alt">
          new to cutepad?
          <button type="button" className="link-btn" onClick={() => navigate('/signup')}>
            create an account
          </button>
        </div>
      </div>
      <div className="auth-alt">
        <button type="button" className="link-btn" onClick={() => navigate('/welcome')}>
          ← back to welcome
        </button>
      </div>
    </div>
  );
}

export function SignupPage() {
  const [, navigate] = useHashRoute();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const edit = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    if (err) setErr(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr(null);
    if (!name.trim()) {
      setErr('please tell us your name');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setErr('please enter a valid email address');
      return;
    }
    if (pass.length < 6) {
      setErr('password must be at least 6 characters');
      return;
    }
    if (pass !== confirm) {
      setErr('passwords don’t match');
      return;
    }
    setBusy(true);
    try {
      const user = await firebaseSignUp(name, email.trim(), pass);
      const s = useApp.getState();
      if (!s.settings.studyBuddyName) {
        s.setSettings({ studyBuddyName: name.trim().split(/\s+/)[0] });
      }
      localStorage.setItem(REMEMBER_LOGIN_KEY, '1');
      finishAuth(navigate, user);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'sign up failed — please try again');
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <Brand subtitle="one account for your notes, streaks & backups" />
      <div className="card pad" style={{ marginTop: 10 }}>
        <h1 className="auth-title">create account</h1>
        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label className="field-label" htmlFor="signup-name">
              name
            </label>
            <input
              id="signup-name"
              className="input"
              type="text"
              value={name}
              autoComplete="name"
              placeholder="what should we call you?"
              autoFocus
              onChange={(e) => edit(setName)(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="signup-email">
              email
            </label>
            <input
              id="signup-email"
              className="input"
              type="email"
              value={email}
              autoComplete="email"
              placeholder="you@example.com"
              onChange={(e) => edit(setEmail)(e.target.value)}
            />
          </div>
          <PasswordField
            id="signup-pass"
            label="password"
            value={pass}
            onChange={edit(setPass)}
            autoComplete="new-password"
            hint="at least 6 characters"
          />
          <PasswordField
            id="signup-confirm"
            label="confirm password"
            value={confirm}
            onChange={edit(setConfirm)}
            autoComplete="new-password"
          />
          <FieldError msg={err} />
          <div style={{ marginTop: 14 }}>
            <button type="submit" className="btn btn-primary btn-block" disabled={busy} aria-busy={busy}>
              {busy ? 'creating your account…' : 'create account'}
            </button>
          </div>
        </form>
        <div className="auth-alt">
          already have an account?
          <button type="button" className="link-btn" onClick={() => navigate('/login')}>
            log in
          </button>
        </div>
      </div>
      <div className="auth-alt">
        <button type="button" className="link-btn" onClick={() => navigate('/welcome')}>
          ← back to welcome
        </button>
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const [, navigate] = useHashRoute();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const onEmail = (v: string) => {
    setEmail(v);
    if (err) setErr(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr(null);
    if (!EMAIL_RE.test(email.trim())) {
      setErr('please enter a valid email address');
      return;
    }
    setBusy(true);
    try {
      await firebaseResetPassword(email.trim());
      setSent(email.trim());
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'could not send the reset email — try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <Brand subtitle="oops happens — let’s get you back in" />
      <div className="card pad" style={{ marginTop: 10 }}>
        {sent ? (
          <div className="stack" style={{ gap: 12, textAlign: 'center' }}>
            <div style={{ display: 'grid', placeItems: 'center' }}>
              <Ic name="send" size={34} strokeWidth={1.7} />
            </div>
            <h1 className="auth-title" style={{ margin: 0 }}>
              check your inbox 💌
            </h1>
            <p className="small muted" style={{ margin: 0 }}>
              if an account exists for <b>{sent}</b>, we’ve sent a link to choose a new password. it may take a
              minute — peek in spam if you don’t see it.
            </p>
            <button type="button" className="btn btn-primary btn-block" onClick={() => navigate('/login')}>
              back to log in
            </button>
            <button type="button" className="link-btn" onClick={() => setSent(null)}>
              try a different email
            </button>
          </div>
        ) : (
          <>
            <h1 className="auth-title">forgot password?</h1>
            <p className="small muted" style={{ marginTop: 0 }}>
              enter your email and we’ll send you a reset link.
            </p>
            <form onSubmit={onSubmit} noValidate>
              <div className="field">
                <label className="field-label" htmlFor="forgot-email">
                  email
                </label>
                <input
                  id="forgot-email"
                  className="input"
                  type="email"
                  value={email}
                  autoComplete="email"
                  placeholder="you@example.com"
                  autoFocus
                  onChange={(e) => onEmail(e.target.value)}
                />
                <FieldError msg={err} />
              </div>
              <div style={{ marginTop: 14 }}>
                <button type="submit" className="btn btn-primary btn-block" disabled={busy} aria-busy={busy}>
                  {busy ? 'sending…' : 'send reset link'}
                </button>
              </div>
            </form>
            <div className="auth-alt">
              remembered it?
              <button type="button" className="link-btn" onClick={() => navigate('/login')}>
                back to log in
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface TourStep {
  icon: IconName;
  title: string;
  text: string;
  chips: string[];
}

const TOUR: TourStep[] = [
  {
    icon: 'notes',
    title: 'write everything down',
    text: 'cute notes, sticky reminders & rich documents — one cozy home for every idea, saved on your device.',
    chips: ['notes', 'stickies', 'documents'],
  },
  {
    icon: 'timer',
    title: 'focus without stress',
    text: 'a gentle planner, focus timer, task list & flashcards keep your study days calm and on track.',
    chips: ['planner', 'focus', 'tasks', 'flashcards'],
  },
  {
    icon: 'trophy',
    title: 'grow your streak',
    text: 'badges, mood checks & a study buddy cheer you on every day you show up. little by little 💗',
    chips: ['badges', 'mood', 'buddy'],
  },
];

export function WelcomePage() {
  const [, navigate] = useHashRoute();
  const step = useApp((s) => s.settings.onboarding.step);
  const current = TOUR[Math.min(Math.max(step, 0), TOUR.length - 1)];
  const index = TOUR.indexOf(current);

  const finish = () => {
    useApp.getState().completeOnboarding();
    navigate('/');
  };
  const go = (i: number) => useApp.getState().setOnboardingStep(Math.min(Math.max(i, 0), TOUR.length - 1));

  return (
    <div className="welcome-page">
      <Brand />
      <div className="welcome-hero">
        <div className="welcome-mascot">
          <Mascot mood="love" size={76} />
        </div>
        <h1>hi, welcome to cutepad 🌸</h1>
        <p className="welcome-sub">
          your kawaii notepad &amp; study buddy — notes, focus tools and gentle motivation in one place. everything
          stays on your device unless you turn on cloud sync.
        </p>
      </div>

      <div className="card pad welcome-tour" aria-live="polite">
        <div className="welcome-step">
          <span className="welcome-step-icon" aria-hidden="true">
            <Ic name={current.icon} size={26} />
          </span>
          <div>
            <div className="bold" style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>
              {current.title}
            </div>
            <p className="small muted" style={{ margin: '4px 0 0' }}>
              {current.text}
            </p>
            <div className="welcome-chips">
              {current.chips.map((c) => (
                <span className="tag" key={c}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="welcome-tour-foot">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="previous feature"
          >
            <Ic name="arrowLeft" size={16} />
          </button>
          <div className="welcome-dots" role="tablist" aria-label="feature tour">
            {TOUR.map((s, i) => (
              <span key={s.title} className={i === index ? 'on' : ''}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`step ${i + 1}: ${s.title}`}
                  onClick={() => go(i)}
                />
              </span>
            ))}
          </div>
          {index < TOUR.length - 1 ? (
            <button type="button" className="btn btn-soft btn-sm" onClick={() => go(index + 1)} aria-label="next feature">
              next
            </button>
          ) : (
            <button type="button" className="btn btn-soft btn-sm" onClick={finish}>
              get started
            </button>
          )}
        </div>
      </div>

      <div className="welcome-cta">
        <button type="button" className="btn btn-primary" onClick={finish}>
          get started ✨
        </button>
        <button type="button" className="btn btn-soft" onClick={() => navigate('/signup')}>
          create account
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/login')}>
          log in
        </button>
      </div>
      <p className="small muted" style={{ textAlign: 'center', marginTop: 14 }}>
        free forever · works offline · no ads
      </p>
    </div>
  );
}
