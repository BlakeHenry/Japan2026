/**
 * The editable plan — a horizontal day timeline over the trip window.
 *
 * Ported from the imported design (Claude Design "Trip Planner Horizontal"),
 * whose runtime is React underneath, so the DC bindings become ordinary props
 * and its `state` becomes a TripDoc.
 *
 * The document is the state, localStorage is the save, and EXPORT is the
 * commit — see src/lib/plan/doc.ts and export.ts. The track itself — bars,
 * handles, pills, and every drag — lives in PlanTrack; this component owns
 * the store, the selection, and the chrome around them.
 *
 * There can be several documents — proposals, held side by side in a
 * PlanStore (src/lib/plan/variants.ts). **Every one of them is editable in
 * place**: the PLAN view is a zoomed-in focus on the active schedule, and the
 * COMPARE view (ComparePane) mounts a live track per row, each editing its
 * own variant. Being ACTIVE decides what EXPORT writes as markdown, what the
 * stale banner speaks about, and what PLAN focuses on — never what may be
 * edited; the other schedules ride the same bundle as the one proposals
 * snapshot (src/content/proposals.md), which seeds back beside the main plan.
 *
 * **Selection belongs to the PLAN view**, because the detail pane is the only
 * thing that answers one and the compare rows deliberately have no pane. So
 * `sel` always names a node in the ACTIVE document — and since a compare-row
 * edit can delete the very node it names, it is resolved against that
 * document on every render rather than trusted.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { citySlug } from '../../lib/itinerary';
import type { TripDoc } from '../../lib/plan/doc';
import { STORAGE_KEY, deleteTrip, toggleKind, travelTotal } from '../../lib/plan/doc';
import { BUNDLE_NAME, exportStore } from '../../lib/plan/export';
import { formatTravelTotal } from '../../lib/plan/hours';
import type { SeededProposals } from '../../lib/plan/seed';
import {
  LEGACY_STORE_KEY,
  STORE_KEY,
  activeVariant,
  decodeStore,
  deleteVariant,
  duplicateActive,
  makeActive,
  renameVariant,
  seedStore,
  updateActiveDoc,
  updateDoc,
  type PlanStore,
} from '../../lib/plan/variants';
import ComparePane from './ComparePane';
import DetailPane, { type Sel } from './DetailPane';
import PlanTrack from './PlanTrack';

/**
 * The track fills its container, so a day is worth however many pixels the
 * screen can spare — until the whole trip would be squeezed under this, at
 * which point the days stop shrinking and the track scrolls instead. Below
 * roughly this much viewport (plus `.pl-scroll`'s gutters) you're dragging
 * sideways rather than reading a squashed calendar.
 */
const MIN_TRACK = 1000;

interface Props {
  seed: TripDoc;
  /** The committed proposals snapshot — what a fresh browser compares with. */
  proposals: SeededProposals;
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

/** Does this selection still name something in `doc`? */
const resolves = (doc: TripDoc, sel: Sel): boolean =>
  sel.t === 's'
    ? doc.stops.some((s) => s.id === sel.id)
    : !!doc.stops.find((s) => s.id === sel.sid)?.trips[sel.ti];

export default function PlanTimeline({ seed, proposals }: Props) {
  // The store holds every proposed schedule — the committed main plan plus
  // whatever the committed snapshot carries; `doc` is the active one — the
  // plan EXPORT writes as markdown, the stale banner speaks about, and PLAN
  // focuses on.
  const [store, setStore] = useState<PlanStore>(() => seedStore(seed, proposals.variants));
  const [mode, setMode] = useState<'plan' | 'compare'>('plan');
  const [sel, setSel] = useState<Sel>(() => openingSel(seed));
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState<string[] | null>(null);

  const active = activeVariant(store);
  const doc = active.doc;
  // Derived, not stored: resetting or switching variants re-answers it.
  const stale = doc.baseHash !== seed.baseHash;
  // A compare row can delete the node the pane is pointing at, and switching
  // the main plan swaps the document underneath it, so the selection is
  // re-answered against the live document rather than kept in sync by hand.
  const effSel = resolves(doc, sel) ? sel : openingSel(doc);

  // --- Persistence ---------------------------------------------------------
  // Rendered from the seed first, then swapped for whatever is stored: reading
  // localStorage during render would differ between the server-rendered HTML
  // and the first client render.
  useEffect(() => {
    try {
      // decodeStore refuses a payload whose window doesn't match the seed's —
      // the window is fixed and comes from code — and migrates the legacy
      // keys into the current store shape.
      const restored = decodeStore(
        localStorage.getItem(STORE_KEY),
        localStorage.getItem(LEGACY_STORE_KEY),
        localStorage.getItem(STORAGE_KEY),
        seed
      );
      if (restored) {
        setStore(restored);
        setSel(openingSel(activeVariant(restored).doc));
      }
    } catch {
      /* A corrupt or unreadable store just means we keep the committed plan. */
    }
    setHydrated(true);
  }, [seed]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {
      /* Private mode, or the quota is full. Editing still works this session. */
    }
  }, [store, hydrated]);

  // --- Deep links ----------------------------------------------------------
  // /map/<city>/ links back to /overview/#<city>, and that contract predates
  // this page. Honour an incoming hash against the active schedule, and keep
  // it current as you browse.
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
    const stop = doc.stops.find((s) => s.id === (effSel.t === 's' ? effSel.id : effSel.sid));
    if (stop) history.replaceState(null, '', `#${citySlug(stop.name)}`);
  }, [effSel, doc.stops, hydrated]);

  // --- Sizing --------------------------------------------------------------
  // A day is worth whatever the container can give it, down to MIN_TRACK. The
  // measurement is of `.pl-scroll`'s CONTENT box, which excludes its gutters
  // and doesn't grow with the track it scrolls — so widening the track can
  // never feed back into the number we measured. (The compare view measures
  // its own scroller the same way, inside ComparePane.)

  const scrollRef = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(MIN_TRACK);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setAvail(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
    // `mode`, because the track unmounts under COMPARE: coming back mounts a
    // NEW element, and observing the old detached one would freeze the width.
  }, [mode]);

  const trackW = Math.max(MIN_TRACK, avail);

  // --- Editing -------------------------------------------------------------

  /**
   * An edit lands on the variant that owns it — every schedule is editable,
   * on the compare view especially. Prefer the updater form at call sites
   * that don't need the resulting document: a handler that closes over a doc
   * reads the value from the render that created it, so two commits landing
   * before the next render would drop the first.
   */
  const commitVariant = useCallback(
    (vid: string) => (next: TripDoc | ((current: TripDoc) => TripDoc)) =>
      setStore((s) => updateDoc(s, vid, next)),
    []
  );

  // --- Header commands -----------------------------------------------------

  const doExport = () => {
    const result = exportStore(store, proposals.filePresent);
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

  // Resets the MAIN schedule only — proposals are their own drafts, and
  // throwing them away because one plan went back to committed would be
  // the destructive surprise.
  const doReset = () => {
    setStore((s) => updateActiveDoc(s, seed));
    setSel(openingSel(seed));
    setNotice(null);
  };

  // --- Proposal verbs ------------------------------------------------------

  const doActivate = (id: string) => {
    setStore((s) => makeActive(s, id));
  };

  /** Returns the new id so the compare view can drop straight into renaming. */
  const doDuplicate = (): string => {
    const result = duplicateActive(store);
    setStore(result.store);
    return result.id;
  };

  const doDeleteVariant = (id: string) => {
    const next = deleteVariant(store, id);
    if (!next) return;
    setStore(next);
    // Deleting the main plan promotes another; the selection is resolved
    // against whatever document that turns out to be.
    if (id === store.activeId) setSel(openingSel(activeVariant(next).doc));
  };

  const doRenameVariant = (id: string, name: string) =>
    setStore((s) => renameVariant(s, id, name));

  // --- Render --------------------------------------------------------------

  const travelLabel = formatTravelTotal(travelTotal(doc.stops));

  if (!doc.stops.length) return <p className="pl-empty">Nothing on the itinerary yet.</p>;

  return (
    <div className="pl-root">
      <header className="pl-head">
        <div className="pl-title-wrap">
          <h1 className="pl-title">{mode === 'compare' ? 'Proposed schedules' : active.name}</h1>
          {mode === 'plan' && travelLabel && (
            <span
              className="pl-total"
              title="Total travel between stops in Japan — the flights in and home aren't counted"
            >
              TRAVEL {travelLabel}
            </span>
          )}
        </div>
        <div className="pl-head-actions">
          <div className="pl-mode">
            <button
              type="button"
              className={mode === 'plan' ? 'pl-mode-btn pl-mode-btn-on' : 'pl-mode-btn'}
              aria-pressed={mode === 'plan'}
              onClick={() => setMode('plan')}
            >
              PLAN
            </button>
            <button
              type="button"
              className={mode === 'compare' ? 'pl-mode-btn pl-mode-btn-on' : 'pl-mode-btn'}
              aria-pressed={mode === 'compare'}
              onClick={() => setMode('compare')}
            >
              COMPARE
            </button>
          </div>
          <button
            type="button"
            className="pl-btn"
            onClick={doReset}
            title="Discard the main plan's local edits and go back to the committed plan"
          >
            RESET
          </button>
          <button
            type="button"
            className="pl-btn pl-btn-primary"
            onClick={doExport}
            title="Download the regenerated content files — the main plan as markdown, plus the proposals snapshot"
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

      {mode === 'compare' ? (
        <ComparePane
          variants={store.variants}
          activeId={store.activeId}
          onActivate={doActivate}
          onDuplicate={doDuplicate}
          onDelete={doDeleteVariant}
          onRename={doRenameVariant}
          // No `sel`/`onSelect`: a compare row draws no pane, so it has
          // nothing to select FOR. Its edits are the ones the track carries.
          row={(v, laneW) => (
            <PlanTrack doc={v.doc} trackW={laneW} commit={commitVariant(v.id)} />
          )}
        />
      ) : (
        <>
          <div className="pl-scroll" ref={scrollRef}>
            <PlanTrack
              doc={doc}
              trackW={trackW}
              showDays
              sel={effSel}
              onSelect={setSel}
              commit={commitVariant(active.id)}
            />
          </div>

          {/* The trip's dates are fixed, so there is nothing under the track: the
              stops tile a settled window, and dragging a boundary moves a day
              between neighbours without ever changing how long the trip is. The
              first and last days are travel stops like any other — mark them as
              travel, don't special-case them. */}
          <div className="pl-below">
            <DetailPane
              doc={doc}
              sel={effSel}
              onSelect={setSel}
              onToggleKind={(id) => commitVariant(active.id)((d) => toggleKind(d, id))}
              onDeleteTrip={(sid, ti) => {
                commitVariant(active.id)((d) => deleteTrip(d, sid, ti));
                setSel({ t: 's', id: sid });
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
