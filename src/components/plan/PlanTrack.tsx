/**
 * One editable timeline track: the stop bars, the resize handles between
 * them, the hatched travel bars, and the branches band underneath (add-trip
 * zones, travel-time pills, day-trip pills).
 *
 * Extracted from PlanTimeline so the same editor can be mounted twice: once
 * as the PLAN view's big focused track (with its own day rail), and once per
 * row on the compare view, where every proposed schedule is editable in
 * place and the day rail is shared by the header above the rows.
 *
 * The track owns its INTERACTION state — which bar is grabbed, which
 * boundary is hovered, which name or travel time is being typed — because
 * none of that outlives the track or matters to a sibling. The document and
 * the selection come from above: `commit` lands edits on whichever variant
 * this track draws, and `sel`/`onSelect` are absent on the compare rows,
 * which draw no detail pane and so have nothing to select FOR.
 *
 * **A travel time is edited on its own pill** — click it and the pill
 * becomes an input. That is the only way to set one, so it works the same on
 * both surfaces; the pane never carried a second copy of it.
 *
 * Drag handlers attach their listeners to `window`, not the element — the
 * pointer routinely leaves a one-day-wide bar mid-drag — and read the live
 * document, stop order and day width through refs, because they outlive the
 * render that created them.
 */

import { useMemo, useRef, useState } from 'react';
import type { PlanStop, TripDoc } from '../../lib/plan/doc';
import {
  addTrip,
  dateAt,
  deleteStop,
  deleteTrip,
  insertAt,
  moveTrip,
  renameStop,
  renameTrip,
  reorder,
  resize,
  setTravelHours,
  startOf,
  totalDays,
} from '../../lib/plan/doc';
import { formatHours, parseHours } from '../../lib/plan/hours';
import { formatDay, type Sel } from './DetailPane';

const ACCENT = 'oklch(0.55 0.21 262)';

type Editing =
  | { type: 'stop'; id: string }
  | { type: 'trip'; sid: string; ti: number }
  | { type: 'travel'; id: string }
  | null;

interface Props {
  doc: TripDoc;
  /** The track's exact width in px; a day is worth `trackW / totalDays`. */
  trackW: number;
  /** The PLAN view draws its own day rail; compare rows share the header's. */
  showDays?: boolean;
  /** The selected node, when this track has a pane to answer with. */
  sel?: Sel | null;
  /** Absent on compare rows: nothing there listens to a selection. */
  onSelect?: (sel: Sel) => void;
  /** Lands an edit on this track's variant. Prefer the updater form. */
  commit: (next: TripDoc | ((doc: TripDoc) => TripDoc)) => void;
}

export default function PlanTrack({ doc, trackW, showDays, sel, onSelect, commit }: Props) {
  const [hoverB, setHoverB] = useState<number | null>(null);
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [reorderState, setReorder] = useState<{ id: string; left: number } | null>(null);
  const [tripDrag, setTripDrag] = useState<{ sid: string; ti: number; left: number } | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const dragMoved = useRef(false);

  const total = totalDays(doc.stops);
  /** Pixels per day. Fractional on purpose — rounding leaves a ragged edge. */
  const ppd = total > 0 ? trackW / total : 0;

  /** The stop order as it should read mid-drag, with the grabbed bar floated. */
  const disp: PlanStop[] = useMemo(() => {
    if (!reorderState) return doc.stops;
    const dragged = doc.stops.find((s) => s.id === reorderState.id);
    if (!dragged) return doc.stops;
    const others = doc.stops.filter((s) => s.id !== reorderState.id);
    const centre = reorderState.left + (dragged.days * ppd) / 2;
    let index = 0;
    let cum = 0;
    for (const o of others) {
      if (centre > (cum + o.days / 2) * ppd) index++;
      cum += o.days;
    }
    const out = others.slice();
    out.splice(index, 0, dragged);
    return out;
  }, [doc.stops, reorderState, ppd]);

  // The pointer handlers below outlive the render that created them, so they
  // read the live document, stop order and day width through refs rather than
  // closing over values that a previous drag — or a window resize — replaced.
  const docRef = useRef(doc);
  docRef.current = doc;
  const dispRef = useRef(disp);
  dispRef.current = disp;
  const ppdRef = useRef(ppd);
  ppdRef.current = ppd;

  // --- Pointer drags -------------------------------------------------------

  const startResize = (b: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const base = docRef.current;
    let applied = 0;
    setDragging(b);
    const move = (ev: PointerEvent) => {
      const delta = Math.round((ev.clientX - startX) / ppdRef.current);
      if (delta === applied) return;
      applied = delta;
      commit(resize(base, b, delta));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setDragging(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const startMove = (id: string, originLeft: number) => (e: React.PointerEvent) => {
    if (e.button !== 0 || editing) return;
    const startX = e.clientX;
    let moved = false;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      // A few pixels of slop, so a click that wobbles still reads as a click.
      if (!moved && Math.abs(dx) < 8) return;
      if (!moved) {
        moved = true;
        dragMoved.current = true;
      }
      setReorder({ id, left: originLeft + dx });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (moved) commit(reorder(docRef.current, dispRef.current));
      setReorder(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const startTripDrag =
    (sid: string, ti: number, originLeft: number) => (e: React.PointerEvent) => {
      if (e.button !== 0 || editing) return;
      const startX = e.clientX;
      let moved = false;
      let last = originLeft;
      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        if (!moved && Math.abs(dx) < 6) return;
        if (!moved) {
          moved = true;
          dragMoved.current = true;
        }
        last = originLeft + dx;
        setTripDrag({ sid, ti, left: last });
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        if (moved) {
          const result = moveTrip(docRef.current, sid, ti, Math.floor(last / ppdRef.current));
          if (result) {
            commit(result.doc);
            onSelect?.({ t: 't', sid: result.stopId, ti: result.index });
          }
        }
        setTripDrag(null);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };

  const selectStop = (id: string) => {
    if (dragMoved.current) {
      dragMoved.current = false;
      return;
    }
    onSelect?.({ t: 's', id });
  };

  const selectTrip = (sid: string, ti: number) => {
    if (dragMoved.current) {
      dragMoved.current = false;
      return;
    }
    onSelect?.({ t: 't', sid, ti });
  };

  // --- Commands ------------------------------------------------------------

  const doInsert = (b: number) => {
    const result = insertAt(doc, b);
    if (!result) return;
    commit(result.doc);
    onSelect?.({ t: 's', id: result.id });
    setEditing({ type: 'stop', id: result.id });
    setHoverB(null);
  };

  const doDeleteStop = (id: string) => {
    const result = deleteStop(doc, id);
    if (!result) return;
    commit(result.doc);
    const touched = !!sel && (sel.t === 's' ? sel.id === id : sel.sid === id);
    if (touched) onSelect?.({ t: 's', id: result.heirId });
    setHoverB(null);
  };

  const doAddTrip = (stopId: string, day: number) => {
    const result = addTrip(doc, stopId, day);
    if (!result) return;
    commit(result.doc);
    onSelect?.({ t: 't', sid: stopId, ti: result.index });
    setEditing({ type: 'trip', sid: stopId, ti: result.index });
    setHoverDay(null);
  };

  const doDeleteTrip = (sid: string, ti: number) => {
    commit((d) => deleteTrip(d, sid, ti));
    if (sel?.t === 't' && sel.sid === sid) {
      if (sel.ti === ti) onSelect?.({ t: 's', id: sid });
      // Trips address by position, so a later selection slides down one.
      else if (sel.ti > ti) onSelect?.({ t: 't', sid, ti: sel.ti - 1 });
    }
  };

  const commitName = (value: string) => {
    if (!editing || editing.type === 'travel') return;
    commit((d) =>
      editing.type === 'stop'
        ? renameStop(d, editing.id, value)
        : renameTrip(d, editing.sid, editing.ti, value)
    );
    setEditing(null);
  };

  /**
   * Whatever was typed on a travel pill. Empty clears the estimate; anything
   * `parseHours` can't read is a quiet no-op, the same way a rename that
   * comes back blank leaves the name alone.
   */
  const commitTravel = (id: string, value: string) => {
    const v = value.trim();
    const hours = v ? parseHours(v) : null;
    if (!v || hours !== null) commit((d) => setTravelHours(d, id, hours));
    setEditing(null);
  };

  // --- Layout --------------------------------------------------------------

  const boundaries = new Set<number>();
  {
    let n = 0;
    for (const s of disp) {
      boundaries.add(n);
      n += s.days;
    }
  }

  const lanes: Array<Array<[number, number]>> = [];
  /** The first lane with x-room for a pill this wide at `cx`; claims it. */
  const claimLane = (cx: number, w: number): number => {
    let lane = 0;
    while ((lanes[lane] ?? []).some((r) => cx - w / 2 < r[1] && cx + w / 2 > r[0])) lane++;
    (lanes[lane] ??= []).push([cx - w / 2, cx + w / 2]);
    return lane;
  };

  // Travel times, hanging at each arriving stay's start boundary. They claim
  // their lanes before the day trips do, so they sit shallow and the trip
  // pills pack around them. The first stay draws none — its arrival is the
  // international flight, which is the same in every proposal — and neither
  // does a gap: a gap IS travel, and its hatching already says so.
  const firstStayId = disp.find((s) => s.kind === 'stay')?.id;
  const travels = disp.flatMap((stop, i) => {
    if (stop.kind !== 'stay' || stop.id === firstStayId) return [];
    if (reorderState?.id === stop.id) return [];
    const set = stop.travelHours !== undefined;
    const label = set ? formatHours(stop.travelHours!) : '+?';
    const cx = startOf(disp, i) * ppd;
    return [{ stop, cx, set, label, lane: claimLane(cx, label.length * 6 + 26) }];
  });

  const branches = disp.flatMap((stop, i) => {
    const from = startOf(disp, i);
    const hue = `oklch(0.6 0.14 ${stop.hue.toFixed(1)})`;
    return stop.trips.map((trip, ti) => {
      const pinned = trip.day !== null && trip.day >= 0 && trip.day < stop.days;
      const isDrag = tripDrag?.sid === stop.id && tripDrag.ti === ti;
      let cx = pinned
        ? (from + trip.day!) * ppd + ppd / 2
        : from * ppd + (stop.days * ppd) / 2;
      if (isDrag) cx = tripDrag!.left;
      // Rough pill width, so two trips on nearby days don't overlap.
      const w = trip.name.length * 6.6 + 56;
      const lane = isDrag ? 0 : claimLane(cx, w);
      return { stop, trip, ti, cx, lane, pinned, isDrag, hue };
    });
  });
  const branchH = Math.max(60, 44 + lanes.length * 34);

  return (
    <div className="pl-track" style={{ width: trackW }}>
      {/* Dates. Labels only — a travel day is its own stop, not a flag on
          a day, so there is nothing to toggle here. */}
      {showDays && (
        <div className="pl-days">
          {Array.from({ length: total }, (_, d) => {
            const iso = dateAt(doc, d);
            const date = new Date(`${iso}T00:00:00Z`);
            const wd = date.getUTCDay();
            const starts = boundaries.has(d);
            return (
              <div
                key={iso}
                className="pl-day"
                style={{ left: d * ppd, width: ppd, borderLeftColor: starts ? '#c8cdd8' : '#e8eaef' }}
                title={formatDay(iso)}
              >
                <span
                  className="pl-day-wd"
                  style={{ color: wd === 0 || wd === 6 ? 'oklch(0.5 0.19 262)' : '#7a8194' }}
                >
                  {formatDay(iso).slice(0, 3)}
                </span>
                <span
                  className="pl-day-num"
                  style={{
                    fontWeight: starts ? 700 : 400,
                    color: starts ? '#171a21' : '#4c5364',
                  }}
                >
                  {date.getUTCDate() === 1 || d === 0
                    ? formatDay(iso).slice(4)
                    : date.getUTCDate()}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* The stops themselves. */}
      <div className="pl-bars">
        {disp.map((stop, i) => {
          const isSel = sel?.t === 's' && sel.id === stop.id;
          const isFloat = reorderState?.id === stop.id;
          const isEditing = editing?.type === 'stop' && editing.id === stop.id;
          const origin = startOf(disp, i) * ppd + 2;
          const left = isFloat ? reorderState!.left : origin;
          return (
            <div
              key={stop.id}
              className="pl-bar"
              style={{
                left,
                width: stop.days * ppd - 4,
                background:
                  stop.kind === 'gap'
                    ? 'oklch(0.89 0.008 260)'
                    : `oklch(0.9 0.06 ${stop.hue.toFixed(1)})`,
                outline: isSel ? `2px solid ${ACCENT}` : 'none',
                cursor: isFloat ? 'grabbing' : 'grab',
                zIndex: isFloat ? 20 : 1,
                boxShadow: isFloat ? '0 10px 28px rgba(20,24,35,.28)' : 'none',
              }}
              onClick={() => selectStop(stop.id)}
              onPointerDown={startMove(stop.id, origin)}
            >
              {isEditing ? (
                <input
                  className="pl-bar-input"
                  defaultValue={stop.name}
                  ref={(el) => el?.select()}
                  autoFocus
                  onBlur={(e) => commitName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') {
                      e.currentTarget.value = stop.name;
                      e.currentTarget.blur();
                    }
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                // A travel bar wears the TRAVEL tag on its hatching and
                // nothing else. Its name ("In transit", "Open", "Heading
                // home") is internal — a gap exports no file — so printing
                // it under the tag says the same thing twice. The pane
                // still shows it; make the bar a stay to rename it.
                stop.kind !== 'gap' && (
                  <span
                    className="pl-bar-name"
                    title="Double-click to rename · drag to reorder"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditing({ type: 'stop', id: stop.id });
                    }}
                  >
                    {stop.name}
                  </span>
                )
              )}
              {disp.length > 1 && (
                <button
                  type="button"
                  className="pl-bar-del"
                  title="Delete — its days go to the neighbour"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    doDeleteStop(stop.id);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}

        {/* Hatching marks a travel stop. A day is travel by being part of
            one, so there is no per-day variant. */}
        {disp.map((stop, i) =>
          stop.kind === 'gap' && reorderState?.id !== stop.id ? (
            <div
              key={`hatch-${stop.id}`}
              className="pl-hatch"
              style={{ left: startOf(disp, i) * ppd + 2, width: stop.days * ppd - 4 }}
            >
              <span className="pl-hatch-tag">TRAVEL</span>
            </div>
          ) : null
        )}

        {/* Boundaries: drag to move a day across, or insert a stop. */}
        {!reorderState &&
          disp.slice(0, -1).map((_, b) => (
            <div
              key={`handle-${b}`}
              className="pl-handle"
              style={{ left: startOf(disp, b + 1) * ppd - 10 }}
              onPointerDown={startResize(b)}
              onMouseEnter={() => setHoverB(b)}
              onMouseLeave={() => setHoverB(null)}
            >
              <span className="pl-handle-grip" />
              {hoverB === b && dragging === null && (
                <button
                  type="button"
                  className="pl-handle-add"
                  title="Insert a stop here"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    doInsert(b);
                  }}
                >
                  +
                </button>
              )}
            </div>
          ))}
      </div>

      {/* Day trips, hanging off the day they're pencilled for. */}
      <div className="pl-branches" style={{ height: branchH }}>
        {!reorderState &&
          disp.flatMap((stop, i) =>
            Array.from({ length: stop.days }, (_, d) => {
              const key = `${stop.id}:${d}`;
              return (
                <div
                  key={key}
                  className="pl-zone"
                  style={{ left: (startOf(disp, i) + d) * ppd, width: ppd }}
                  onMouseEnter={() => setHoverDay(key)}
                  onMouseLeave={() => setHoverDay(null)}
                >
                  {hoverDay === key && (
                    <button
                      type="button"
                      className="pl-zone-add"
                      title="Add a day trip on this day"
                      onClick={() => doAddTrip(stop.id, d)}
                    >
                      +
                    </button>
                  )}
                </div>
              );
            })
          )}

        {/* How long it takes to get to each stay — the drop-down at its
            start boundary, dashed while nobody has an estimate. The pill IS
            the editor: click it and it becomes an input, which is why this
            works the same on a compare row as under the PLAN track. */}
        {travels.map(({ stop, cx, set, label, lane }) => {
          const isEditing = editing?.type === 'travel' && editing.id === stop.id;
          return (
            <div
              key={`travel-${stop.id}`}
              className="pl-travel"
              style={{ left: cx, zIndex: isEditing ? 30 : 3 }}
              title={
                set
                  ? `Travel to ${stop.name} — click to edit`
                  : `Travel to ${stop.name} — no estimate yet, click to add one`
              }
              onClick={() => !isEditing && setEditing({ type: 'travel', id: stop.id })}
            >
              <span
                className="pl-branch-dot"
                style={{
                  background: set ? '#8a91a0' : '#fff',
                  borderColor: set ? '#8a91a0' : '#b3b9c5',
                }}
              />
              <span
                className="pl-branch-line"
                style={{
                  height: 10 + lane * 34,
                  borderLeft: set ? '1.5px solid #b3b9c5' : '1.5px dashed #b3b9c5',
                }}
              />
              {isEditing ? (
                <input
                  className="pl-travel-input"
                  defaultValue={set ? formatHours(stop.travelHours!) : ''}
                  placeholder="5h 30m"
                  title="Door to door from the previous stop — 5:30, 5.5, 5h 30m and 90m all work; empty clears it"
                  ref={(el) => el?.select()}
                  autoFocus
                  onBlur={(e) => commitTravel(stop.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') {
                      e.currentTarget.value = set ? formatHours(stop.travelHours!) : '';
                      e.currentTarget.blur();
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className={set ? 'pl-travel-pill' : 'pl-travel-pill pl-travel-pill-off'}
                  style={{ outline: isEditing ? `2px solid ${ACCENT}` : 'none' }}
                >
                  {label}
                </span>
              )}
            </div>
          );
        })}

        {branches.map(({ stop, trip, ti, cx, lane, pinned, isDrag, hue }) => {
          const isSel = sel?.t === 't' && sel.sid === stop.id && sel.ti === ti;
          const isEditing = editing?.type === 'trip' && editing.sid === stop.id && editing.ti === ti;
          return (
            <div
              key={trip.id}
              className="pl-branch"
              style={{
                left: cx,
                cursor: isDrag ? 'grabbing' : 'grab',
                zIndex: isDrag ? 30 : 3,
              }}
              onClick={() => selectTrip(stop.id, ti)}
              onPointerDown={startTripDrag(stop.id, ti, cx)}
            >
              <span
                className="pl-branch-dot"
                style={{ background: pinned ? hue : '#fff', borderColor: pinned ? hue : '#b3b9c5' }}
              />
              <span
                className="pl-branch-line"
                style={{
                  height: 10 + lane * 34,
                  borderLeft: pinned ? `1.5px solid ${hue}` : '1.5px dashed #b3b9c5',
                }}
              />
              <span
                className="pl-branch-pill"
                style={{
                  border: pinned ? '1px solid #dbdfe8' : '1.5px dashed #c8cdd8',
                  outline: isSel ? `2px solid ${ACCENT}` : 'none',
                  boxShadow: isDrag ? '0 8px 20px rgba(20,24,35,.25)' : 'none',
                }}
              >
                {isEditing ? (
                  <input
                    className="pl-branch-input"
                    defaultValue={trip.name}
                    ref={(el) => el?.select()}
                    autoFocus
                    onBlur={(e) => commitName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                      if (e.key === 'Escape') {
                        e.currentTarget.value = trip.name;
                        e.currentTarget.blur();
                      }
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    title="Click for details · double-click to rename · drag to move"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditing({ type: 'trip', sid: stop.id, ti });
                    }}
                  >
                    {trip.name}
                  </span>
                )}
                <button
                  type="button"
                  className="pl-branch-del"
                  title="Delete this day trip"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    doDeleteTrip(stop.id, ti);
                  }}
                >
                  ×
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
