/**
 * COMPARE — every proposed schedule on one screen, one row per variant.
 *
 * The rows are read-only: this view is for looking and choosing, so a row
 * draws its stops, travel hatching and pinned day trips at a glance but edits
 * nothing except the variant itself — rename it, make it the main plan,
 * delete it, or duplicate the active one into a new proposal. All actual
 * planning happens back in PLAN mode, on whichever variant is active.
 *
 * Same width contract as the timeline: the day lane takes what the viewport
 * can spare down to MIN_LANE, then the whole table scrolls sideways. The name
 * gutter is sticky so a row stays labelled mid-scroll.
 *
 * The trip window is fixed, so every variant is exactly as long as every
 * other — which is why there is no "+2 DAYS" delta here (the imported design
 * had one): the only thing that can differ is how the days are spent.
 */

import { useEffect, useRef, useState } from 'react';
import type { PlanVariant } from '../../lib/plan/variants';
import { dateAt, startOf, totalDays } from '../../lib/plan/doc';
import { formatDay } from './DetailPane';

/** Must match `.pl-cmp-gutter`'s width — the lane gets what's left of it. */
const GUTTER_W = 232;
/** The same floor as the timeline's MIN_TRACK, for the same reason. */
const MIN_LANE = 1000;

interface Props {
  variants: PlanVariant[];
  activeId: string;
  onActivate: (id: string) => void;
  /** Duplicates the active variant; returns the new id so renaming can start. */
  onDuplicate: () => string;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export default function ComparePane(props: Props) {
  const { variants, activeId } = props;
  const [editingId, setEditingId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(GUTTER_W + MIN_LANE);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setAvail(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Every variant tiles the same fixed window, so the active one can speak
  // for all of them: one day header, one lane width, one ppd.
  const activeDoc = (variants.find((v) => v.id === activeId) ?? variants[0]).doc;
  const total = totalDays(activeDoc.stops);
  const laneW = Math.max(MIN_LANE, avail - GUTTER_W);
  const ppd = total > 0 ? laneW / total : 0;
  const tick = `repeating-linear-gradient(to right, rgba(30, 40, 70, 0.055) 0 1px, transparent 1px ${ppd}px)`;

  const commitRename = (id: string, value: string) => {
    props.onRename(id, value);
    setEditingId(null);
  };

  return (
    <div className="pl-cmp-scroll" ref={scrollRef}>
      <div className="pl-cmp-inner">
        <div className="pl-cmp-head">
          <div className="pl-cmp-gutter pl-cmp-gutter-head">
            <span className="pl-cmp-count">
              {variants.length} {variants.length === 1 ? 'SCHEDULE' : 'SCHEDULES'}
            </span>
          </div>
          <div className="pl-cmp-days" style={{ width: laneW }}>
            {Array.from({ length: total }, (_, d) => {
              const iso = dateAt(activeDoc, d);
              const date = new Date(`${iso}T00:00:00Z`);
              const wd = date.getUTCDay();
              return (
                <div key={iso} className="pl-cmp-day" style={{ left: d * ppd, width: ppd }} title={formatDay(iso)}>
                  <span
                    className="pl-day-wd"
                    style={{ color: wd === 0 || wd === 6 ? 'oklch(0.5 0.19 262)' : '#7a8194' }}
                  >
                    {formatDay(iso).slice(0, 3)}
                  </span>
                  <span className="pl-day-num">
                    {date.getUTCDate() === 1 || d === 0 ? formatDay(iso).slice(4) : date.getUTCDate()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {variants.map((v) => {
          const isActive = v.id === activeId;
          const isEditing = editingId === v.id;
          const stops = v.doc.stops;
          // Only pinned trips draw: an unscheduled pill hanging mid-bar is
          // useful while editing, but in a row this short it is just clutter.
          const pills = stops.flatMap((s, i) => {
            const from = startOf(stops, i);
            return s.trips
              .filter((t) => t.day !== null && t.day >= 0 && t.day < s.days)
              .map((t) => ({
                id: t.id,
                name: t.name,
                left: (from + t.day!) * ppd + ppd / 2,
                hue: `oklch(0.6 0.14 ${s.hue.toFixed(1)})`,
              }));
          });
          return (
            <div key={v.id} className={isActive ? 'pl-cmp-row pl-cmp-row-on' : 'pl-cmp-row'}>
              <div className="pl-cmp-gutter">
                <div className="pl-cmp-name-row">
                  {isEditing ? (
                    <input
                      className="pl-cmp-input"
                      defaultValue={v.name}
                      autoFocus
                      ref={(el) => el?.select()}
                      onBlur={(e) => commitRename(v.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                        if (e.key === 'Escape') {
                          e.currentTarget.value = v.name;
                          e.currentTarget.blur();
                        }
                      }}
                    />
                  ) : (
                    <span
                      className="pl-cmp-name"
                      title="Double-click to rename"
                      onDoubleClick={() => setEditingId(v.id)}
                    >
                      {v.name}
                    </span>
                  )}
                  {isActive && <span className="pl-cmp-badge">EDITING</span>}
                </div>
                <div className="pl-cmp-acts">
                  {!isActive && (
                    <button
                      type="button"
                      className="pl-btn pl-btn-sm"
                      title="Make this the main plan you edit"
                      onClick={() => props.onActivate(v.id)}
                    >
                      MAKE MAIN PLAN
                    </button>
                  )}
                  {variants.length > 1 && (
                    <button
                      type="button"
                      className="pl-btn pl-btn-sm pl-cmp-del"
                      title="Delete this proposal"
                      onClick={() => props.onDelete(v.id)}
                    >
                      DELETE
                    </button>
                  )}
                </div>
              </div>
              <div
                className="pl-cmp-lane"
                style={{ width: laneW, height: pills.length > 0 ? 122 : 88, backgroundImage: tick }}
                title={isActive ? undefined : 'Make this the main plan you edit'}
                onClick={() => props.onActivate(v.id)}
              >
                {stops.map((s, i) => (
                  <div
                    key={s.id}
                    className="pl-cmp-seg"
                    style={{
                      left: startOf(stops, i) * ppd + 2,
                      width: s.days * ppd - 4,
                      background:
                        s.kind === 'gap'
                          ? 'oklch(0.89 0.008 260)'
                          : `oklch(0.9 0.06 ${s.hue.toFixed(1)})`,
                    }}
                  >
                    {/* Same rule as the timeline: a travel bar wears its
                        hatching and nothing else — a gap's name is internal,
                        so the hatch says all of it. */}
                    {s.kind !== 'gap' && <span className="pl-cmp-seg-name">{s.name}</span>}
                  </div>
                ))}
                {stops.map((s, i) =>
                  s.kind === 'gap' ? (
                    <div
                      key={`hatch-${s.id}`}
                      className="pl-cmp-hatch"
                      style={{ left: startOf(stops, i) * ppd + 2, width: s.days * ppd - 4 }}
                    />
                  ) : null
                )}
                {pills.map((p) => (
                  <div key={p.id} className="pl-cmp-pillstack" style={{ left: p.left }}>
                    <span className="pl-cmp-dot" style={{ background: p.hue }} />
                    <span className="pl-cmp-conn" style={{ borderLeft: `1.5px solid ${p.hue}` }} />
                    <span className="pl-cmp-pill">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="pl-cmp-row pl-cmp-foot">
          <div className="pl-cmp-gutter pl-cmp-gutter-foot">
            <button
              type="button"
              className="pl-cmp-add"
              title="Duplicate the schedule you are editing into a new proposal"
              onClick={() => setEditingId(props.onDuplicate())}
            >
              + NEW PROPOSAL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
