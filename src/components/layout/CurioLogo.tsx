interface CurioLogoProps {
  size?: 'small' | 'medium';
  darkBackground?: boolean;
  className?: string;
}

const sizes = {
  small: { mark: 36, wordmark: 'text-lg', tagline: 'text-[9px]' },
  medium: { mark: 44, wordmark: 'text-xl', tagline: 'text-[9px]' },
} as const;

export function CurioLogo({
  size = 'medium',
  darkBackground = false,
  className = '',
}: CurioLogoProps) {
  const dimensions = sizes[size];

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden="true"
        className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[30%] bg-gradient-to-br from-[#ff795c] via-[#f26150] to-[#6d5bcb] shadow-[0_5px_14px_rgba(199,91,89,0.25)]"
        style={{ width: dimensions.mark, height: dimensions.mark }}
      >
        <svg viewBox="0 0 48 48" className="h-[78%] w-[78%]" fill="none">
          <path
            d="M9.5 25.7c2.1-10.9 14.4-18.1 25.2-14.2 7.9 2.8 8.8 11.5 2.5 17.8-6.5 6.6-18.5 11.4-25.2 7.2-3.3-2.1-4.1-6.3-2.5-10.8Z"
            stroke="white"
            strokeOpacity=".75"
            strokeWidth="1.7"
            transform="rotate(-16 24 24)"
          />
          <path
            d="m24 13.7 2.8 7.5 7.5 2.8-7.5 2.8-2.8 7.5-2.8-7.5-7.5-2.8 7.5-2.8 2.8-7.5Z"
            fill="white"
          />
          <circle cx="36.5" cy="12" r="2.4" fill="#ffe68a" />
          <circle cx="11" cy="35.5" r="1.7" fill="white" fillOpacity=".85" />
        </svg>
      </span>
      <span className="flex min-w-0 flex-col">
        <span
          className={`${dimensions.wordmark} font-black leading-none tracking-[-0.055em] ${
            darkBackground ? 'text-white' : 'text-[var(--text-main)]'
          }`}
        >
          curio
        </span>
        <span
          className={`${dimensions.tagline} mt-1 font-bold uppercase leading-none tracking-[0.13em] ${
            darkBackground ? 'text-white/65' : 'text-[var(--text-muted)]'
          }`}
        >
          ideas, in orbit
        </span>
      </span>
    </span>
  );
}
