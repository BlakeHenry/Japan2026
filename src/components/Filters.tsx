import { useEffect, useState } from 'react';

interface Props {
  segmentId: string;
  /** Only groups that actually have something in this city */
  groups: { key: string; label: string }[];
}

/**
 * Four buttons. That's the whole feature.
 *
 * Like every island here it filters Astro-rendered cards by toggling `hidden`
 * on DOM it doesn't own, so with JS off the full list is simply visible.
 */
export default function Filters({ segmentId, groups }: Props) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const segment = document.getElementById(segmentId);
    if (!segment) return;
    segment.querySelectorAll<HTMLElement>('.idea[data-id]').forEach((card) => {
      card.hidden = active !== null && card.dataset.group !== active;
    });
  }, [segmentId, active]);

  return (
    <div className="filters" role="group" aria-label="Filter ideas">
      <button
        type="button"
        className="filter"
        aria-pressed={active === null}
        onClick={() => setActive(null)}
      >
        All
      </button>
      {groups.map((g) => (
        <button
          key={g.key}
          type="button"
          className="filter"
          aria-pressed={active === g.key}
          onClick={() => setActive(active === g.key ? null : g.key)}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}
