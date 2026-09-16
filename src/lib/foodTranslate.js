import { useEffect, useState } from 'react';
import { translateFoodNames } from './ai';

/**
 * Translate stored food names to the current UI language for display only
 * (the DB keeps the original text). Results are cached in localStorage so each
 * name is translated at most once per language.
 */

const cacheKey = (lang) => `foodtr::${lang}`;

function readCache(lang) {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(lang)) || '{}');
  } catch {
    return {};
  }
}

function writeCache(lang, map) {
  try {
    localStorage.setItem(cacheKey(lang), JSON.stringify(map));
  } catch {
    // ignore quota / private mode
  }
}

const hasHangul = (s) => /[가-힣]/.test(s);

/** Does this name need translating to the target language? (script heuristic) */
function needsTranslation(name, lang) {
  if (!name) return false;
  if (lang === 'en') return hasHangul(name); // Korean text shown in English mode
  return /[a-zA-Z]/.test(name) && !hasHangul(name); // Latin text shown in Korean mode
}

/**
 * Given a list of names and the target language, returns a map
 * { name: displayName }. Names already in the target language pass through;
 * others are translated (cached) via Gemini in the background.
 */
export function useFoodTranslations(names, lang) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const cache = readCache(lang);
    const missing = [
      ...new Set(
        names.filter((n) => n && needsTranslation(n, lang) && !(n in cache))
      ),
    ];
    if (!missing.length) return;

    let cancelled = false;
    translateFoodNames(missing, lang)
      .then((res) => {
        if (cancelled) return;
        const merged = { ...readCache(lang), ...res };
        writeCache(lang, merged);
        setVersion((v) => v + 1); // re-render with fresh cache
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names.join('|'), lang]);

  const cache = readCache(lang);
  const map = {};
  for (const n of names) {
    if (!n) continue;
    map[n] = needsTranslation(n, lang) ? cache[n] ?? n : n;
  }
  // `version` is referenced so the map recomputes after a background fill
  void version;
  return map;
}
