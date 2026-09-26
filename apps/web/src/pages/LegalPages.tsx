import type { ReactNode } from 'react';
import { useT } from '../i18n';
import { BUSINESS } from '../legal/business';

function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  const t = useT();
  return (
    <div className="legal-page">
      <header className="legal-head">
        <a className="btn btn-soft btn-sm" href="#/">
          {t('legal.back')}
        </a>
        <h1>{title}</h1>
        <p className="muted small">
          {t('legal.meta', {
            effective: BUSINESS.effective,
            product: BUSINESS.product,
            operatedBy: BUSINESS.operatedBy,
            country: BUSINESS.country,
            email: BUSINESS.email,
          })}
        </p>
      </header>
      <article className="legal-body">{children}</article>
      <nav className="share-legal" aria-label={t('legal.navLabel')}>
        <a href="#/privacy">{t('legal.navPrivacy')}</a>
        <a href="#/terms">{t('legal.navTerms')}</a>
        <a href="#/cookies">{t('legal.navCookies')}</a>
        <a href="#/refunds">{t('legal.navRefunds')}</a>
      </nav>
    </div>
  );
}

export function PrivacyPage() {
  const t = useT();
  return (
    <LegalShell title={t('legal.p.title')}>
      <p>
        <strong>{t('legal.p.shortLabel')}</strong> {t('legal.p.shortBody1')}{' '}
        <strong>{t('legal.p.shortStrong')}</strong>
        {t('legal.p.shortBody2')}
      </p>

      <h2>{t('legal.p.s1')}</h2>
      <p>
        {t('legal.p.who', {
          product: BUSINESS.product,
          operatedBy: BUSINESS.operatedBy,
          address: BUSINESS.address,
          email: BUSINESS.email,
        })}
      </p>

      <h2>{t('legal.p.s2')}</h2>
      <h3>{t('legal.p.s2a')}</h3>
      <ul>
        <li>
          <strong>{t('legal.p.contentLabel')}</strong> {t('legal.p.contentBody1')}{' '}
          <code>cutepad-state</code>
          {t('legal.p.contentBody2')}
        </li>
        <li>
          <strong>{t('legal.p.cfgLabel')}</strong> {t('legal.p.cfgBody1')}{' '}
          <em>{t('legal.your')}</em>
          {t('legal.p.cfgBody2')}
        </li>
        <li>
          <strong>{t('legal.p.backupLabel')}</strong> {t('legal.p.backupBody1')}{' '}
          <code>%APPDATA%/Cutepad/backups/</code> {t('legal.p.backupBody2')}
        </li>
      </ul>
      <h3>{t('legal.p.s2b')}</h3>
      <ul>
        <li>
          <strong>{t('legal.p.cloudLabel')}</strong> {t('legal.p.cloudBody1')}{' '}
          <em>{t('legal.you')}</em> {t('legal.p.cloudBody2')}
        </li>
        <li>
          <strong>{t('legal.p.pubLabel')}</strong> {t('legal.p.pubBody')}
        </li>
        <li>
          <strong>{t('legal.p.buddyLabel')}</strong> {t('legal.p.buddyBody')}
        </li>
        <li>
          <strong>{t('legal.p.aiLabel')}</strong> {t('legal.p.aiBody1')}{' '}
          <em>{t('legal.you')}</em> {t('legal.p.aiBody2')}
        </li>
        <li>
          <strong>{t('legal.p.speechLabel')}</strong> {t('legal.p.speechBody')}
        </li>
      </ul>

      <h2>{t('legal.p.s3')}</h2>
      <ul>
        <li>{t('legal.p.never1')}</li>
        <li>{t('legal.p.never2')}</li>
        <li>{t('legal.p.never3')}</li>
        <li>
          {t('legal.p.never4a')} <a href="#/cookies">{t('legal.p.cookieLink')}</a>).
        </li>
        <li>{t('legal.p.never5')}</li>
      </ul>

      <h2>{t('legal.p.s4')}</h2>
      <p>{t('legal.p.dpdp')}</p>
      <ul>
        <li>
          <strong>{t('legal.p.purposeLabel')}</strong> {t('legal.p.purposeBody')}
        </li>
        <li>
          <strong>{t('legal.p.storageLabel')}</strong> {t('legal.p.storageBody')}
        </li>
        <li>
          <strong>{t('legal.p.rightsLabel')}</strong>{' '}
          {t('legal.p.rightsBody', { email: BUSINESS.email })}
        </li>
        <li>
          <strong>{t('legal.p.childrenLabel')}</strong> {t('legal.p.childrenBody')}
        </li>
        <li>
          <strong>{t('legal.p.crossLabel')}</strong> {t('legal.p.crossBody1')}{' '}
          <em>{t('legal.you')}</em> {t('legal.p.crossBody2')}
        </li>
        <li>
          <strong>{t('legal.p.breachLabel')}</strong> {t('legal.p.breachBody')}
        </li>
      </ul>

      <h2>{t('legal.p.s5')}</h2>
      <p>
        {t('legal.p.thirdBody1')} <em>{t('legal.you')}</em> {t('legal.p.thirdBody2')}
      </p>

      <h2>{t('legal.p.s6')}</h2>
      <p>{t('legal.p.security')}</p>

      <h2>{t('legal.p.s7')}</h2>
      <p>
        {t('legal.p.changes1')} {BUSINESS.email} {t('legal.p.changes2')}
      </p>
    </LegalShell>
  );
}

export function TermsPage() {
  const t = useT();
  return (
    <LegalShell title={t('legal.t.title')}>
      <p>
        {t('legal.t.intro', {
          product: BUSINESS.product,
          operatedBy: BUSINESS.operatedBy,
          address: BUSINESS.address,
          country: BUSINESS.country,
          email: BUSINESS.email,
        })}
      </p>

      <h2>{t('legal.t.s1')}</h2>
      <p>{t('legal.t.s1Body')}</p>

      <h2>{t('legal.t.s2')}</h2>
      <p>{t('legal.t.s2Body')}</p>

      <h2>{t('legal.t.s3')}</h2>
      <ul>
        <li>{t('legal.t.c1')}</li>
        <li>{t('legal.t.c2')}</li>
        <li>{t('legal.t.c3')}</li>
      </ul>

      <h2>{t('legal.t.s4')}</h2>
      <p>{t('legal.t.s4Body')}</p>

      <h2>{t('legal.t.s5')}</h2>
      <p>
        {t('legal.t.s5Body1')} <em>{t('legal.you')}</em> {t('legal.t.s5Body2')}
      </p>

      <h2>{t('legal.t.s6')}</h2>
      <p>{t('legal.t.s6Body')}</p>

      <h2>{t('legal.t.s7')}</h2>
      <p>{t('legal.t.s7Body')}</p>

      <h2>{t('legal.t.s8')}</h2>
      <p>{t('legal.t.s8Body')}</p>

      <h2>{t('legal.t.s9')}</h2>
      <p>{t('legal.t.s9Body')}</p>

      <h2>{t('legal.t.s10')}</h2>
      <p>{t('legal.t.s10Body')}</p>

      <h2>{t('legal.t.s11')}</h2>
      <p>{t('legal.t.s11Body')}</p>
    </LegalShell>
  );
}

export function CookiesPage() {
  const t = useT();
  return (
    <LegalShell title={t('legal.c.title')}>
      <p>
        <strong>{t('legal.c.shortStrong')}</strong> {t('legal.c.shortBody')}
      </p>

      <h2>{t('legal.c.s1')}</h2>
      <p>
        {t('legal.c.body1')} <strong>{t('legal.c.ls')}</strong> ({t('legal.c.keyLabel')}{' '}
        <code>cutepad-state</code>) {t('legal.c.body3')}
      </p>

      <h2>{t('legal.c.s2')}</h2>
      <p>
        {t('legal.c.s2Body1')} <code>document.cookie</code> {t('legal.c.s2Body2')}
      </p>

      <h2>{t('legal.c.s3')}</h2>
      <p>
        {t('legal.c.s3Body1')} <em>{t('legal.you')}</em> {t('legal.c.s3Body2')}
      </p>

      <h2>{t('legal.c.s4')}</h2>
      <ul>
        <li>{t('legal.c.m1')}</li>
        <li>
          {t('legal.c.m2Body1')} <code>%APPDATA%/Cutepad/backups/</code> {t('legal.c.m2Body2')}
        </li>
      </ul>

      <h2>{t('legal.c.s5')}</h2>
      <p>{t('legal.c.changes', { email: BUSINESS.email })}</p>
    </LegalShell>
  );
}

export function RefundsPage() {
  const t = useT();
  return (
    <LegalShell title={t('legal.r.title')}>
      <p>
        <strong>{t('legal.r.shortStrong')}</strong>
      </p>

      <h2>{t('legal.r.s1')}</h2>
      <p>{t('legal.r.s1Body')}</p>

      <h2>{t('legal.r.s2')}</h2>
      <p>
        {t('legal.r.s2Body1')} <em>{t('legal.r.before')}</em> {t('legal.r.s2Body2')}
      </p>

      <h2>{t('legal.r.s3')}</h2>
      <p>{t('legal.r.s3Body')}</p>

      <h2>{t('legal.r.s4')}</h2>
      <p>
        {t('legal.r.reach')} {BUSINESS.email} ({BUSINESS.operatedBy}, {BUSINESS.address}).
      </p>
    </LegalShell>
  );
}
