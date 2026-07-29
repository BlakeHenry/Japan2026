import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * The city map in the sticky panel.
 *
 * Degrades in three steps, all of which are usable:
 *   1. No JS, or no API key configured → the paper pin scatter below, which
 *      plots each stop's real lat/lng on the unit square. No streets, but
 *      the relative geography and the row↔pin highlight are honest.
 *   2. Google fails to load → same paper scatter (the error is swallowed on
 *      purpose; a broken map should not break the page).
 *   3. Google loads → real basemap, paper pins hidden, same interactions.
 *
 * Credentials are build-time PUBLIC_ vars and end up in the shipped bundle by
 * design: the Maps JS SDK runs in the browser. Abuse is bounded by the daily
 * quota cap and the API restriction, not by secrecy.
 */
const API_KEY = import.meta.env.PUBLIC_GOOGLE_MAPS_API_KEY as string | undefined;
const MAP_ID = import.meta.env.PUBLIC_GOOGLE_MAPS_ID as string | undefined;
const HAS_MAP = Boolean(API_KEY && MAP_ID);

export interface MapPoint {
  id: string;
  slug: string;
  domId: string;
  title: string;
  category: string;
  lat?: number;
  lng?: number;
  dated: boolean;
}

interface Props {
  points: MapPoint[];
  /** DOM id of the enclosing .segment, so listeners stay scoped to one city */
  segmentId: string;
  city: string;
  glyphs: Record<string, string>;
}

const PAD = 0.12;

/**
 * Loads the Maps SDK exactly once for the whole page.
 *
 * There is one island per city, but `setOptions` must be called before any
 * library starts loading — so the four instances share this single promise
 * rather than each configuring the SDK. Dynamically imported so the loader
 * ships as its own chunk and is never fetched by a build without credentials.
 */
let sdk: Promise<{
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
  core: google.maps.CoreLibrary;
}> | null = null;

function loadSdk() {
  if (!sdk) {
    sdk = (async () => {
      const { setOptions, importLibrary } = await import(
        '@googlemaps/js-api-loader'
      );
      setOptions({ key: API_KEY!, v: 'weekly' });
      const [maps, marker, core] = await Promise.all([
        importLibrary('maps'),
        importLibrary('marker'),
        importLibrary('core'),
      ]);
      return { maps, marker, core };
    })();
  }
  return sdk;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function MapSlot({ points, segmentId, city, glyphs }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  /** slug → the marker's content element, for highlight sync */
  const pinsRef = useRef(new Map<string, HTMLElement>());

  const placed = useMemo(
    () => points.filter((p) => p.lat != null && p.lng != null),
    [points]
  );

  // Paper fallback: normalize this city's bounding box into the unit square.
  const positioned = useMemo(() => {
    if (placed.length === 0) return [];
    const lats = placed.map((p) => p.lat!);
    const lngs = placed.map((p) => p.lng!);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const spanLat = maxLat - minLat || 1;
    const spanLng = maxLng - minLng || 1;

    return placed.map((p) => ({
      ...p,
      // y inverted: higher latitude is further north, i.e. further up
      x: PAD + ((p.lng! - minLng) / spanLng) * (1 - PAD * 2),
      y: PAD + ((maxLat - p.lat!) / spanLat) * (1 - PAD * 2),
    }));
  }, [placed]);

  const jumpTo = (domId: string) => {
    const el = document.getElementById(domId);
    if (!el) return;
    el.scrollIntoView({
      block: 'center',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
    el.focus({ preventScroll: true });
  };

  // --- Real map -----------------------------------------------------------
  useEffect(() => {
    if (!HAS_MAP || placed.length === 0 || !canvasRef.current) return;
    let cancelled = false;
    const pins = pinsRef.current;

    (async () => {
      try {
        const {
          maps: { Map },
          marker: { AdvancedMarkerElement },
          core: { LatLngBounds },
        } = await loadSdk();
        if (cancelled || !canvasRef.current) return;

        const map = new Map(canvasRef.current, {
          mapId: MAP_ID!,
          // 'cooperative' lets a normal wheel scroll pass through to the page
          // and requires ctrl/⌘+wheel to zoom. Without it the map swallows
          // page scroll inside the sticky panel and the parallax feels broken.
          gestureHandling: 'cooperative',
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
        });

        const bounds = new LatLngBounds();
        for (const p of placed) {
          const position = { lat: p.lat!, lng: p.lng! };
          bounds.extend(position);

          const content = document.createElement('div');
          content.className = 'gm-pin';
          if (p.dated) content.dataset.dated = 'true';
          content.textContent = glyphs[p.category] ?? '📍';
          content.setAttribute('role', 'button');
          content.setAttribute('tabindex', '0');
          content.setAttribute('aria-label', p.title);

          // Listen on the element rather than the marker: the marker click
          // event name has moved around between SDK versions, this hasn't.
          content.addEventListener('mouseenter', () => setActive(p.slug));
          content.addEventListener('mouseleave', () => setActive(null));
          content.addEventListener('focus', () => setActive(p.slug));
          content.addEventListener('blur', () => setActive(null));
          content.addEventListener('click', () => jumpTo(p.domId));

          new AdvancedMarkerElement({ map, position, content, title: p.title });
          pins.set(p.slug, content);
        }

        map.fitBounds(bounds, 48);
        // A single-pin city would otherwise zoom to max
        const once = map.addListener('idle', () => {
          if ((map.getZoom() ?? 0) > 16) map.setZoom(16);
          once.remove();
        });

        setLive(true);
      } catch (err) {
        // Leave the paper scatter in place — a dead map must not kill the
        // page. Warn rather than swallow: a silent failure here is
        // indistinguishable from "no key configured", which is a miserable
        // thing to debug.
        console.warn('[map] Google Maps failed to load, using fallback', err);
      }
    })();

    return () => {
      cancelled = true;
      pins.clear();
    };
  }, [placed, glyphs]);

  // --- Row → pin ----------------------------------------------------------
  // Cards are Astro-rendered static DOM. This island never owns their markup —
  // it only listens to them and writes a data attribute back.
  useEffect(() => {
    const segment = document.getElementById(segmentId);
    if (!segment) return;

    const slugFrom = (e: Event) =>
      (e.target as HTMLElement | null)?.closest<HTMLElement>('.idea[data-id]')
        ?.dataset.id ?? null;

    const onOver = (e: Event) => {
      const slug = slugFrom(e);
      if (slug) setActive(slug);
    };
    const onOut = (e: Event) => {
      if (slugFrom(e)) setActive(null);
    };

    segment.addEventListener('mouseover', onOver);
    segment.addEventListener('mouseout', onOut);
    segment.addEventListener('focusin', onOver);
    segment.addEventListener('focusout', onOut);

    return () => {
      segment.removeEventListener('mouseover', onOver);
      segment.removeEventListener('mouseout', onOut);
      segment.removeEventListener('focusin', onOver);
      segment.removeEventListener('focusout', onOut);
      segment
        .querySelectorAll<HTMLElement>('.idea[data-active]')
        .forEach((el) => delete el.dataset.active);
    };
  }, [segmentId]);

  // --- Mirror the active stop onto both the card and the real marker ------
  useEffect(() => {
    const segment = document.getElementById(segmentId);
    if (segment) {
      segment
        .querySelectorAll<HTMLElement>('.idea[data-active]')
        .forEach((el) => delete el.dataset.active);
      if (active) {
        const card = segment.querySelector<HTMLElement>(
          `.idea[data-id="${CSS.escape(active)}"]`
        );
        if (card) card.dataset.active = 'true';
      }
    }
    pinsRef.current.forEach((el, slug) => {
      if (slug === active) el.dataset.active = 'true';
      else delete el.dataset.active;
    });
  }, [active, segmentId]);

  const activePoint = placed.find((p) => p.slug === active);

  return (
    <div className="mapslot">
      <div
        className="mapslot-field"
        data-live={live || undefined}
        role="group"
        aria-label={`${city} map`}
      >
        {HAS_MAP && <div className="mapslot-canvas" ref={canvasRef} />}

        {/* Paper scatter: the server-rendered, no-JS and no-key fallback.
            Hidden by CSS once the real basemap is up. */}
        {positioned.map((p) => (
          <button
            key={p.id}
            type="button"
            className="mapslot-pin"
            data-active={p.slug === active ? 'true' : undefined}
            data-dated={p.dated ? 'true' : undefined}
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
            onMouseEnter={() => setActive(p.slug)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(p.slug)}
            onBlur={() => setActive(null)}
            onClick={() => jumpTo(p.domId)}
            title={p.title}
          >
            <span aria-hidden="true">{glyphs[p.category] ?? '📍'}</span>
            <span className="sr-only">{p.title}</span>
          </button>
        ))}

        {/* Only speaks when there's something to say */}
        <p className="mapslot-readout" data-empty={!activePoint} aria-live="polite">
          {activePoint ? activePoint.title : ''}
        </p>
      </div>
    </div>
  );
}
