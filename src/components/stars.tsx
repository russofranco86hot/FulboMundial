/** Muestra una calificación 0–5 con medias estrellas. */
export function Stars({ value, className = "" }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  const full = Math.floor(v);
  const half = v - full >= 0.5;
  const stars = [];

  for (let i = 0; i < 5; i++) {
    if (i < full) {
      stars.push("full");
    } else if (i === full && half) {
      stars.push("half");
    } else {
      stars.push("empty");
    }
  }

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} title={`${v} / 5`}>
      <span className="flex">
        {stars.map((type, i) => (
          <StarIcon key={i} type={type} />
        ))}
      </span>
      <span className="ml-1.5 text-xs font-medium text-pitch-900/60 dark:text-zinc-400">{v.toFixed(1)}</span>
    </span>
  );
}

function StarIcon({ type }: { type: string }) {
  const isFull = type === "full";
  const isHalf = type === "half";
  
  return (
    <svg 
      className="w-4 h-4" 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Empty background star */}
      <path 
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
        fill="currentColor"
        className="text-amber-400/30"
      />
      {/* Full foreground star */}
      {isFull && (
        <path 
          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
          fill="currentColor"
          className="text-amber-400"
        />
      )}
      {/* Half foreground star using clip path */}
      {isHalf && (
        <g clipPath="url(#halfStarClip)">
          <path 
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
            fill="currentColor"
            className="text-amber-400"
          />
        </g>
      )}
      {isHalf && (
        <defs>
          <clipPath id="halfStarClip">
            <rect x="0" y="0" width="12" height="24" />
          </clipPath>
        </defs>
      )}
    </svg>
  );
}
