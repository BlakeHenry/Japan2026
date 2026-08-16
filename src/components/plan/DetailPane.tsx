/**
 * What's below the timeline: the selected stop or day trip.
 *
 * The pane is name + actions + day-trip chips, and that is the whole of it.
 * The site plans SCHEDULED things — which city each day, the day trips out of
 * it, and reservations when there are any — so there is no block here for
 * loose ideas, and nothing to add one to.
 *
 * **It states no dates.** The timeline directly above is a calendar with the
 * bar's extent drawn on it — repeating "WED OCT 14 → SAT OCT 17 · 4 DAYS"
 * underneath only says in words what the reader can already see. A day trip's
 * own day is the one exception, and it rides on its chip in the parent's list
 * where it distinguishes one trip from another.
 *
 * Everything the old city panels carried — lodging, the arrive/depart legs,
 * the hero photo — is deliberately not here either; those fields still live in
 * the markdown and still round-trip through export, they just aren't drawn.
 */

import type { TripDoc } from '../../lib/plan/doc';
import { dateAt, startOf } from '../../lib/plan/doc';

export type Sel = { t: 's'; id: string } | { t: 't'; sid: string; ti: number };

interface Props {
  doc: TripDoc;
  sel: Sel;
  onSelect: (sel: Sel) => void;
  onToggleKind: (id: string) => void;
  onDeleteTrip: (sid: string, ti: number) => void;
}

const WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MO = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "SAT OCT 17" — read off the ISO string so it stays in UTC. */
export function formatDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${WD[d.getUTCDay()]} ${MO[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export default function DetailPane(props: Props) {
  const { doc, sel, onSelect } = props;

  if (sel.t === 's') {
    const index = doc.stops.findIndex((s) => s.id === sel.id);
    const stop = doc.stops[index];
    if (!stop) return null;
    const from = startOf(doc.stops, index);
    const isGap = stop.kind === 'gap';

    return (
      <div className="pl-pane">
        <div className="pl-pane-head">
          <span
            className="pl-swatch"
            style={{
              background: isGap ? '#c8cdd8' : `oklch(0.85 0.09 ${stop.hue.toFixed(1)})`,
            }}
            aria-hidden="true"
          />
          <h1 className="pl-pane-title">
            {stop.name}
            {stop.cityJa && (
              <span className="pl-pane-ja" lang="ja" aria-hidden="true">
                {stop.cityJa}
              </span>
            )}
          </h1>
        </div>

        <div className="pl-pane-actions">
          <button
            type="button"
            className={isGap ? 'pl-btn pl-btn-on' : 'pl-btn'}
            onClick={() => props.onToggleKind(stop.id)}
            title={
              isGap
                ? 'Make this a real stay — it will export a segment file'
                : 'Mark these days as travel — they will export no segment'
            }
          >
            {isGap ? 'TRAVEL DAYS — MAKE IT A STAY' : 'MARK AS TRAVEL DAYS'}
          </button>
        </div>

        {stop.trips.length > 0 && (
          <section className="pl-block">
            <h2 className="pl-block-label">Day trips</h2>
            <div className="pl-chips">
              {stop.trips.map((t, ti) => (
                <button
                  type="button"
                  key={t.id}
                  className="pl-chip"
                  onClick={() => onSelect({ t: 't', sid: stop.id, ti })}
                >
                  <span className="pl-chip-name">{t.name}</span>
                  <span className={t.day === null ? 'pl-chip-tag pl-chip-tag-off' : 'pl-chip-tag'}>
                    {t.day === null ? 'NO DAY PICKED YET' : formatDay(dateAt(doc, from + t.day))}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  const index = doc.stops.findIndex((s) => s.id === sel.sid);
  const stop = doc.stops[index];
  const trip = stop?.trips[sel.ti];
  if (!stop || !trip) return null;

  return (
    <div className="pl-pane">
      <div className="pl-pane-head">
        <span
          className="pl-swatch pl-swatch-round"
          style={{ background: `oklch(0.85 0.09 ${stop.hue.toFixed(1)})` }}
          aria-hidden="true"
        />
        <h1 className="pl-pane-title">{trip.name}</h1>
      </div>

      <div className="pl-pane-actions">
        <button type="button" className="pl-btn" onClick={() => onSelect({ t: 's', id: stop.id })}>
          VIEW {stop.name.toUpperCase()}
        </button>
        <button
          type="button"
          className="pl-btn pl-btn-danger"
          onClick={() => props.onDeleteTrip(stop.id, sel.ti)}
        >
          DELETE DAY TRIP
        </button>
      </div>
    </div>
  );
}
