/**
 * COMPARE — every proposed schedule on one screen, one row per variant, and
 * **every row is a live editor**. Each lane mounts the same PlanTrack the
 * PLAN view uses: drag a bar to reorder, drag a boundary to move a day,
 * double-click to rename, add day trips, click a travel pill to set the
 * hours. There is no selecting a schedule to edit somewhere else — you edit
 * it where it lies.
 *
 * **The rows stay compact.** This screen is for reading schedules against
 * each other — where the days go, and what the travelling costs — so it
 * draws no detail pane: every edit it offers is one you make on the track
 * itself (a day trip's own × included). The pane, and the whole-stop verbs
 * that live in it (mark a stretch as travel days), belong to the PLAN view.
 *
 * What "MAKE MAIN PLAN" still means: the main (active) schedule is the one
 * EXPORT writes back to content as markdown — the others ride the same
 * bundle as the proposals snapshot — the one the stale banner compares
 * against the committed seed, and the one the PLAN view zooms in on. It
 * wears the MAIN badge and the accent edge; it has no monopoly on editing.
 *
 * Same width contract as the timeline: the day lane takes what the viewport
 * can spare down to MIN_LANE, then the whole table scrolls sideways. The name
 * gutter is sticky so a row stays labelled mid-scroll.
 *
 * The trip window is fixed, so every variant is exactly as long as every
 * other — which is why there is no "+2 DAYS" delta here (the imported design
 * had one): the only thing that can differ is how the days are spent.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { PlanVariant } from '../../lib/plan/variants';
import { dateAt, totalDays, travelTotal } from '../../lib/plan/doc';
import { formatTravelTotal } from '../../lib/plan/hours';
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
  /** The editable track for a row — a PlanTrack wired to this variant. */
  row: (v: PlanVariant, laneW: number) => ReactNode;
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
          // What choosing between schedules actually weighs: the hours spent
          // getting between stops. Null when there's nothing to count.
          const travelLabel = formatTravelTotal(travelTotal(v.doc.stops));
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
                  {isActive && (
                    <span
                      className="pl-cmp-badge"
                      title="The main plan — EXPORT writes it as content (proposals ride the snapshot), PLAN focuses on it"
                    >
                      MAIN
                    </span>
                  )}
                </div>
                {travelLabel && (
                  <span
                    className="pl-total"
                    title="Total travel between stops in Japan — the flights in and home aren't counted"
                  >
                    TRAVEL {travelLabel}
                  </span>
                )}
                <div className="pl-cmp-acts">
                  {!isActive && (
                    <button
                      type="button"
                      className="pl-btn pl-btn-sm"
                      title="Make this the main plan — EXPORT writes it, PLAN focuses on it"
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
              <div className="pl-cmp-lane" style={{ width: laneW, backgroundImage: tick }}>
                {props.row(v, laneW)}
              </div>
            </div>
          );
        })}

        <div className="pl-cmp-row pl-cmp-foot">
          <div className="pl-cmp-gutter pl-cmp-gutter-foot">
            <button
              type="button"
              className="pl-cmp-add"
              title="Duplicate the main plan into a new proposal"
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
