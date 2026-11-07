import { useEffect, useState } from 'react';

const aliases: Record<string, string> = { UK: 'GB' };
export const normalizeCountryCode = (code?: string | null): string | null => {
  const value = (code || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(value)) return null;
  return aliases[value] || value;
};

export const getCountryName = (code?: string | null): string => {
  const normalized = normalizeCountryCode(code);
  if (!normalized) return '국적 미등록';
  try {
    const name = new Intl.DisplayNames(['ko'], { type: 'region' }).of(normalized);
    return name && name !== normalized ? name : normalized;
  } catch {
    return normalized;
  }
};

export const getFlagEmoji = (code?: string | null): string => {
  const normalized = normalizeCountryCode(code);
  return normalized
    ? String.fromCodePoint(...Array.from(normalized).map(ch => 0x1F1E6 + ch.charCodeAt(0) - 65))
    : '🌐';
};

interface CountryFlagProps {
  code?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showCode?: boolean;
  showName?: boolean;
}

/**
 * Country codes are ISO 3166-1 alpha-2, set by admins on player cards.
 * Use actual flag artwork (Windows often does not render emoji flags) with
 * a Unicode flag and code fallback if the image is unavailable.
 */
export default function CountryFlag({
  code, size = 'md', showCode = false, showName = false
}: CountryFlagProps) {
  const normalized = normalizeCountryCode(code);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => { setImageFailed(false); }, [normalized]);
  const dimensions = {
    sm: 'h-5 w-8 text-base',
    md: 'h-9 w-14 text-2xl',
    lg: 'h-28 w-44 text-7xl',
  }[size];
  const name = getCountryName(normalized);
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-2" title={name}>
      <span className={`relative inline-flex ${dimensions} shrink-0 items-center justify-center overflow-hidden rounded border border-white/25 bg-slate-700/40`}>
        {normalized && !imageFailed ? (
          <img
            src={`https://flagcdn.com/w160/${normalized.toLowerCase()}.png`}
            alt={`${name} 국기`}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : <span aria-label={name}>{getFlagEmoji(normalized)}</span>}
      </span>
      {showCode && <span className="font-semibold">{normalized || '미등록'}</span>}
      {showName && <span className="font-semibold">{name}</span>}
    </span>
  );
}
