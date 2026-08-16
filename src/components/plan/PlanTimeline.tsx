/**
 * The editable plan — a horizontal day timeline over the trip window.
 *
 * Ported from the imported design (Claude Design "Trip Planner Horizontal"),
 * whose runtime is React underneath, so the DC bindings become ordinary props
 * and its `state` becomes a TripDoc.
 *
 * The document is the state, localStorage is the save, and EXPORT is the
 * commit — see src/lib/plan/doc.ts and export.ts. This component owns only the
 * interaction: which bar you grabbed, where the pointer is, what's selected.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CategoryKey } from '../../lib/categories';
import { citySlug } from '../../lib/itinerary';
import type { IdeaHome, PlanStop, TripDoc } from '../../lib/plan/doc';
import {
  STORAGE_KEY,
  addIdea,
  addTrip,
  dateAt,
  deleteIdea,
  deleteStop,
  deleteTrip,
  extendWindow,
  insertAt,
  moveIdea,
  moveTrip,
  renameStop,
  renameTrip,
  reorder,
  resize,
  startOf,
  toggleKind,
  totalDays,
  updateIdea,
} from '../../lib/plan/doc';
import { BUNDLE_NAME, exportPlan } from '../../lib/plan/export';
import DetailPane, { formatDay, type Sel } from './DetailPane';
import IdeaEditor from './IdeaEditor';

const PPD = 76; // pixels per day
const ACCENT = 'oklch(0.55 0.21 262)';

type Editing =
  | { type: 'stop'; id: string }
  | { type: 'trip'; sid: string; ti: number }
  | null;

interface Props {
  seed: TripDoc;
}

/**
 * What to open on. The first node is usually the fly-out day, and a pane that
 * opens on "In transit" answers nothing — start at the first real stay, the
 * way the old page opened on the first city.
 */
const openingSel = (doc: TripDoc): Sel => ({
  t: 's',
  id: (doc.stops.find((s) => s.kind === 'stay') ?? doc.stops[0])?.id ?? '',
});

export default function PlanTimeline({ seed }: Props) {
  const [doc, setDoc] = useState<TripDoc>(seed);
  const [sel, setSel] = useState<Sel>(openingSel(seed));
  const [hydrated, setHydrated] = useState(false);
  const [stale, setStale] = useState(false);
  const [notice, setNotice] = useState<string[] | null>(null);

  const [hoverB, setHoverB] = useState<number | null>(null);
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [reorderState, setReorder] = useState<{ id: string; left: number } | null>(null);
  const [tripDrag, setTripDrag] = useState<{ sid: string; ti: number; left: number } | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const dragMoved = useRef(false);

  // --- Persistence ---------------------------------------------------------
  // Rendered from the seed first, then swapped for whatever is stored: reading
  // localStorage during render would differ between the server-rendered HTML
  // and the first client render.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as TripDoc;
        if (saved?.version === 1 && Array.isArray(saved.stops) && saved.stops.length > 0) {
          // `windowSource` is build-time data, not user state: always take the
          // committed copy. A document stored before trip.ts last changed
          // would otherwise export a stale rewrite of it — or, if it was
          // stored before this field existed, none at all.
          setDoc({ ...saved, windowSource: seed.windowSource });
          setSel(openingSel(saved));
          // The committed plan moved on under a set of local edits. Say so
          // rather than quietly showing a plan that no longer matches the repo.
          if (saved.baseHash !== seed.baseHash) setStale(true);
        }
      }
    } catch {
      /* A corrupt or unreadable store just means we keep the committed plan. */
    }
    setHydrated(true);
  }, [seed.baseHash, seed.windowSource]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
    } catch {
      /* Private mode, or the quota is full. Editing still works this session. */
    }
  }, [doc, hydrated]);

  // --- Deep links ----------------------------------------------------------
  // /map/<city>/ links back to /overview/#<city>, and that contract predates
  // this page. Honour an incoming hash, and keep it current as you browse.
  useEffect(() => {
    const slug = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!slug) return;
    const hit = doc.stops.find((s) => citySlug(s.name) === slug);
    if (hit) setSel({ t: 's', id: hit.id });
    // Only on mount: afterwards the effect below owns the hash.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const stop = doc.stops.find((s) => s.id === (sel.t === 's' ? sel.id : sel.sid));
    if (stop) history.replaceState(null, '', `#${citySlug(stop.name)}`);
  }, [sel, doc.stops, hydrated]);

  // --- Derived -------------------------------------------------------------

  const total = totalDays(doc.stops);

  /** The stop order as it should read mid-drag, with the grabbed bar floated. */
  const disp: PlanStop[] = useMemo(() => {
    if (!reorderState) return doc.stops;
    const dragged = doc.stops.find((s) => s.id === reorderState.id);
    if (!dragged) return doc.stops;
    const others = doc.stops.filter((s) => s.id !== reorderState.id);
    const centre = reorderState.left + (dragged.days * PPD) / 2;
    let index = 0;
    let cum = 0;
    for (const o of others) {
      if (centre > (cum + o.days / 2) * PPD) index++;
      cum += o.days;
    }
    const out = others.slice();
    out.splice(index, 0, dragged);
    return out;
  }, [doc.stops, reorderState]);

  /**
   * Prefer the updater form at call sites that don't need the resulting
   * document: a handler that closes over `doc` reads the value from the render
   * that created it, so two commits landing before the next render would drop
   * the first.
   */
  const commitDoc = useCallback(
    (next: TripDoc | ((current: TripDoc) => TripDoc)) => setDoc(next),
    []
  );

  // The pointer handlers below outlive the render that created them, so they
  // read the live document and stop order through refs rather than closing
  // over values that a previous drag already replaced.
  const docRef = useRef(doc);
  docRef.current = doc;
  const dispRef = useRef(disp);
  dispRef.current = disp;

  // --- Pointer drags -------------------------------------------------------
  // Listeners go on the window, not the element: the pointer routinely leaves
  // a 76px-wide bar mid-drag and the gesture has to survive it.

  const startResize = (b: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const base = docRef.current;
    let applied = 0;
    setDragging(b);
    const move = (ev: PointerEvent) => {
      const delta = Math.round((ev.clientX - startX) / PPD);
      if (delta === applied) return;
      applied = delta;
      setDoc(resize(base, b, delta));
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
      if (moved) setDoc(reorder(docRef.current, dispRef.current));
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
          const result = moveTrip(docRef.current, sid, ti, Math.floor(last / PPD));
          if (result) {
            setDoc(result.doc);
            setSel({ t: 't', sid: result.stopId, ti: result.index });
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
    setSel({ t: 's', id });
  };

  const selectTrip = (sid: string, ti: number) => {
    if (dragMoved.current) {
      dragMoved.current = false;
      return;
    }
    setSel({ t: 't', sid, ti });
  };

  // --- Commands ------------------------------------------------------------

  const doInsert = (b: number) => {
    const result = insertAt(doc, b);
    if (!result) return;
    commitDoc(result.doc);
    setSel({ t: 's', id: result.id });
    setEditing({ type: 'stop', id: result.id });
    setHoverB(null);
  };

  const doDeleteStop = (id: string) => {
    const result = deleteStop(doc, id);
    if (!result) return;
    commitDoc(result.doc);
    const touched = sel.t === 's' ? sel.id === id : sel.sid === id;
    if (touched) setSel({ t: 's', id: result.heirId });
    setHoverB(null);
  };

  const doAddTrip = (stopId: string, day: number) => {
    const result = addTrip(doc, stopId, day);
    if (!result) return;
    commitDoc(result.doc);
    setSel({ t: 't', sid: stopId, ti: result.index });
    setEditing({ type: 'trip', sid: stopId, ti: result.index });
    setHoverDay(null);
  };

  const doDeleteTrip = (sid: string, ti: number) => {
    commitDoc((d) => deleteTrip(d, sid, ti));
    setSel({ t: 's', id: sid });
  };

  const commitName = (value: string) => {
    if (!editing) return;
    setDoc((d) =>
      editing.type === 'stop'
        ? renameStop(d, editing.id, value)
        : renameTrip(d, editing.sid, editing.ti, value)
    );
    setEditing(null);
  };

  const doExport = () => {
    const result = exportPlan(doc);
    const blob = new Blob([result.bundle], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = BUNDLE_NAME;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setNotice([
      `${result.files.length} file(s), ${result.deleted.length} deletion(s).`,
      ...result.warnings,
    ]);
  };

  const doReset = () => {
    setDoc(seed);
    setSel(openingSel(seed));
    setStale(false);
    setNotice(null);
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
  const branches = disp.flatMap((stop, i) => {
    const from = startOf(disp, i);
    const hue = `oklch(0.6 0.14 ${stop.hue.toFixed(1)})`;
    return stop.trips.map((trip, ti) => {
      const pinned = trip.day !== null && trip.day >= 0 && trip.day < stop.days;
      const isDrag = tripDrag?.sid === stop.id && tripDrag.ti === ti;
      let cx = pinned
        ? (from + trip.day!) * PPD + PPD / 2
        : from * PPD + (stop.days * PPD) / 2;
      if (isDrag) cx = tripDrag!.left;
      // Rough pill width, so two trips on nearby days don't overlap.
      const w = trip.name.length * 6.6 + 56;
      let lane = 0;
      if (!isDrag) {
        while ((lanes[lane] ?? []).some((r) => cx - w / 2 < r[1] && cx + w / 2 > r[0])) lane++;
        (lanes[lane] ??= []).push([cx - w / 2, cx + w / 2]);
      }
      return { stop, trip, ti, cx, lane, pinned, isDrag, hue };
    });
  });
  const branchH = Math.max(60, 44 + lanes.length * 34);

  const windowMeta = `${formatDay(doc.window.start)} → ${formatDay(doc.window.end)}`;

  if (!doc.stops.length) return <p className="pl-empty">Nothing on the itinerary yet.</p>;

  return (
    <div className="pl-root">
      <header className="pl-head">
        <h1 className="pl-title">The whole trip</h1>
        <p className="pl-meta">{windowMeta}</p>
        <div className="pl-head-actions">
          <button type="button" className="pl-btn" onClick={doReset} title="Discard local edits and go back to the committed plan">
            RESET
          </button>
          <button
            type="button"
            className="pl-btn pl-btn-primary"
            onClick={doExport}
            title="Download the regenerated content files"
          >
            EXPORT
          </button>
        </div>
      </header>

      {stale && (
        <p className="pl-banner" role="status">
          The committed plan changed since these edits were made. Keep editing, or{' '}
          <button type="button" className="pl-link" onClick={doReset}>
            reset to the committed plan
          </button>
          .
        </p>
      )}

      {notice && (
        <div className="pl-banner" role="status">
          <strong>Exported {BUNDLE_NAME}.</strong>
          <ul>
            {notice.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          <button type="button" className="pl-link" onClick={() => setNotice(null)}>
            dismiss
          </button>
        </div>
      )}

      <div className="pl-scroll">
        <div className="pl-track" style={{ width: total * PPD }}>
          {/* Dates. Labels only — a travel day is its own stop, not a flag on
              a day, so there is nothing to toggle here. */}
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
                  style={{ left: d * PPD, width: PPD, borderLeftColor: starts ? '#c8cdd8' : '#e8eaef' }}
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

          {/* The stops themselves. */}
          <div className="pl-bars">
            {disp.map((stop, i) => {
              const isSel = sel.t === 's' && sel.id === stop.id;
              const isFloat = reorderState?.id === stop.id;
              const isEditing = editing?.type === 'stop' && editing.id === stop.id;
              const origin = startOf(disp, i) * PPD + 2;
              const left = isFloat ? reorderState!.left : origin;
              return (
                <div
                  key={stop.id}
                  className="pl-bar"
                  style={{
                    left,
                    width: stop.days * PPD - 4,
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
                  style={{ left: startOf(disp, i) * PPD + 2, width: stop.days * PPD - 4 }}
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
                  style={{ left: startOf(disp, b + 1) * PPD - 10 }}
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
                      style={{ left: (startOf(disp, i) + d) * PPD, width: PPD }}
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

            {branches.map(({ stop, trip, ti, cx, lane, pinned, isDrag, hue }) => {
              const isSel = sel.t === 't' && sel.sid === stop.id && sel.ti === ti;
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
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lengthening the trip, which the timeline alone can't do: its stops
          tile a fixed window, so dragging a boundary only moves a day between
          neighbours. These two grow the window itself — and `src/lib/trip.ts`
          on export. Kept out of the scrolling track deliberately: the two ends
          are ~1200px apart, and a control you have to scroll to find is worse
          than one that's always in the same place. */}
      <div className="pl-window">
        <button
          type="button"
          className="pl-btn"
          onClick={() => commitDoc((d) => extendWindow(d, 'start'))}
          title={`Leave a day earlier — the trip would start ${formatDay(dateAt(doc, -1))}`}
        >
          ← DAY AT START
        </button>
        <span className="pl-window-meta">
          {total} {total === 1 ? 'day' : 'days'}
        </span>
        <button
          type="button"
          className="pl-btn"
          onClick={() => commitDoc((d) => extendWindow(d, 'end'))}
          title="Come home a day later — adds a day to the last stop"
        >
          DAY AT END →
        </button>
      </div>

      <div className="pl-below">
        <DetailPane
          doc={doc}
          sel={sel}
          onSelect={setSel}
          onToggleKind={(id) => commitDoc((d) => toggleKind(d, id))}
          onDeleteTrip={doDeleteTrip}
          onAddIdea={(home: IdeaHome, title: string, category: CategoryKey) => {
            commitDoc((d) => addIdea(d, home, title, category)?.doc ?? d);
          }}
          onRenameIdea={(id, title) => commitDoc((d) => updateIdea(d, id, { title }))}
          onMoveIdea={(id, home) => commitDoc((d) => moveIdea(d, id, home))}
          onDeleteIdea={(id) => commitDoc((d) => deleteIdea(d, id))}
        />

        {/* Stops matching no city on the timeline. Kept visible on purpose:
            a pencilled idea without a home is supposed to be findable, not
            silently dropped — that's what the old "Not on the itinerary yet"
            strip did, and it isn't empty today. */}
        {doc.unassigned.length > 0 && (
          <section className="pl-loose">
            <h2 className="pl-block-label">Not on the itinerary yet</h2>
            <p className="pl-empty">These don't match any city on the timeline.</p>
            <IdeaEditor
              ideas={doc.unassigned}
              targets={[
                { key: 'loose', label: '— Not on the itinerary —', home: { kind: 'loose' } },
                ...doc.stops.map((s) => ({
                  key: `stop:${s.id}`,
                  label: s.name,
                  home: { kind: 'stop' as const, stopId: s.id },
                })),
              ]}
              currentKey="loose"
              onAdd={(title, category) => {
                const result = addIdea(doc, { kind: 'loose' }, title, category);
                if (result) commitDoc(result.doc);
              }}
              onRename={(id, title) => commitDoc(updateIdea(doc, id, { title }))}
              onMove={(id, home) => commitDoc(moveIdea(doc, id, home))}
              onDelete={(id) => commitDoc(deleteIdea(doc, id))}
              emptyLabel="Nothing stranded."
            />
          </section>
        )}
      </div>
    </div>
  );
}
