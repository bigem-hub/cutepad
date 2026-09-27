import { useEffect, useState } from 'react';
import { fetchPublicNote, type PublicNotePayload, type PublicFetchConfig } from '@cutepad/core';
import { Ic } from '@cutepad/ui';
import { sanitizeNoteHtml } from '../lib/sanitize';

function parseParams(rest: string): { slug: string; config: PublicFetchConfig } {
  const qIndex = rest.indexOf('?');
  const path = qIndex >= 0 ? rest.slice(0, qIndex) : rest;
  const query = new URLSearchParams(qIndex >= 0 ? rest.slice(qIndex + 1) : '');
  return {
    slug: path.replace(/^\/?share\//, '').replace(/\/$/, ''),
    config: { url: query.get('s') ?? '', anonKey: query.get('k') ?? '' },
  };
}

export default function SharePage({ route }: { route: string }) {
  const { slug, config } = parseParams(route);
  const [note, setNote] = useState<PublicNotePayload | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    fetchPublicNote(slug, config)
      .then((row) => {
        if (!alive) return;
        setNote(row);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, config.url, config.anonKey]);

  return (
    <div className="share-page">
      <div className="brand" style={{ justifyContent: 'center', marginBottom: 18 }}>
        <span className="brand-dot" aria-hidden="true"><Ic name="flower" size={16} /></span>
        Cutepad
      </div>
      <div role="status" aria-live="polite">
        {loading && <p style={{ textAlign: 'center' }}>⏳ loading shared note…</p>}
      </div>
      {!loading && error && (
        <div className="card pad" style={{ textAlign: 'center' }}>
          <p>💦 could not load this page — check your connection.</p>
          <a className="btn btn-primary" href="#/">
            open Cutepad 🌸
          </a>
        </div>
      )}
      {!loading && !error && !note && (
        <div className="card pad" style={{ textAlign: 'center' }}>
          <p>💦 this shared note could not be found.</p>
          <a className="btn btn-primary" href="#/">
            open Cutepad 🌸
          </a>
        </div>
      )}
      {!loading && !error && note && (
        <>
          <h1>{note.title}</h1>
          <div className="share-meta">
            shared note · published {new Date(note.updated_at).toLocaleDateString()}
            {note.tags.length > 0 && <> · {note.tags.map((t) => `#${t}`).join(' ')}</>}
          </div>
          <article
            className="share-body"
            style={{ background: `${note.color}22` }}
            dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(note.html) }}
          />
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <a className="btn btn-soft" href="#/">
              make your own with Cutepad 🌸
            </a>
          </div>
        </>
      )}
      <footer className="share-legal">
        <a href="#/privacy">Privacy</a>
        <a href="#/terms">Terms</a>
        <a href="#/cookies">Cookies</a>
        <a href="#/refunds">Refunds</a>
      </footer>
    </div>
  );
}
