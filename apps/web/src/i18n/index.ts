import { useMemo } from 'react';
import type { Locale } from '@cutepad/core';
import { useApp } from '@cutepad/core';
import { en as shellEn, es as shellEs, ja as shellJa } from './shell';
import { en as notesEn, es as notesEs, ja as notesJa } from './views/notes';
import { en as analyticsEn, es as analyticsEs, ja as analyticsJa } from './views/analytics';
import { en as achievementsEn, es as achievementsEs, ja as achievementsJa } from './views/achievements';
import { en as buddyEn, es as buddyEs, ja as buddyJa } from './views/buddy';
import { en as settingsEn, es as settingsEs, ja as settingsJa } from './views/settings';
import { en as flashcardsEn, es as flashcardsEs, ja as flashcardsJa } from './views/flashcards';
import { en as moodEn, es as moodEs, ja as moodJa } from './views/mood';
import { en as documentsEn, es as documentsEs, ja as documentsJa } from './views/documents';
import { en as smartEn, es as smartEs, ja as smartJa } from './views/smart';
import { en as legalEn, es as legalEs, ja as legalJa } from './legal';

export type Lang = Locale;
export type Dict = Record<string, string>;

const LANGS: Lang[] = ['en', 'es', 'ja'];

function pack(...dicts: Dict[]): Dict {
  return Object.assign({}, ...dicts);
}

export const DICTS: Record<Lang, Dict> = {
  en: pack(shellEn, notesEn, analyticsEn, achievementsEn, buddyEn, settingsEn, flashcardsEn, moodEn, documentsEn, smartEn, legalEn),
  es: pack(shellEn, shellEs, notesEn, notesEs, analyticsEn, analyticsEs, achievementsEn, achievementsEs, buddyEn, buddyEs, settingsEn, settingsEs, flashcardsEn, flashcardsEs, moodEn, moodEs, documentsEn, documentsEs, smartEn, smartEs, legalEn, legalEs),
  ja: pack(shellEn, shellJa, notesEn, notesJa, analyticsEn, analyticsJa, achievementsEn, achievementsJa, buddyEn, buddyJa, settingsEn, settingsJa, flashcardsEn, flashcardsJa, moodEn, moodJa, documentsEn, documentsJa, smartEn, smartJa, legalEn, legalJa),
};

export function makeT(lang: Lang) {
  return (key: string, vars?: Record<string, string | number>): string => {
    let text = DICTS[lang]?.[key] ?? DICTS.en[key] ?? key;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.split(`{${name}}`).join(String(value));
      }
    }
    return text;
  };
}

export function useT(): (key: string, vars?: Record<string, string | number>) => string {
  const lang = useApp((s) => s.settings.locale);
  return useMemo(() => makeT(LANGS.includes(lang) ? lang : 'en'), [lang]);
}
