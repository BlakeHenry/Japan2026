/**
 * The ideas block on a panel — the one thing the mockup's detail pane doesn't
 * have. It's here because you can't edit what isn't drawn, and idea stops are
 * editable and exported.
 *
 * Re-assignment is a <select> rather than a drag: an idea can move to any stop
 * or any day trip on the whole timeline, most of which are off-screen behind a
 * horizontal scroll, and a drop target you have to scroll to find is worse
 * than a list you can read. It also keeps the whole block keyboard-usable.
 */

import { useState } from 'react';
import { CATEGORIES, type CategoryKey } from '../../lib/categories';
import type { IdeaHome, PlanIdea } from '../../lib/plan/doc';

export interface IdeaTarget {
  key: string;
  label: string;
  home: IdeaHome;
}

interface Props {
  ideas: PlanIdea[];
  targets: IdeaTarget[];
  /** The target this list is showing, so the select opens on the right row. */
  currentKey: string;
  onAdd: (title: string, category: CategoryKey) => void;
  onRename: (id: string, title: string) => void;
  onMove: (id: string, home: IdeaHome) => void;
  onDelete: (id: string) => void;
  emptyLabel: string;
}

const emojiFor = (key: CategoryKey): string =>
  CATEGORIES.find((c) => c.key === key)?.emoji ?? '📍';

export default function IdeaEditor({
  ideas,
  targets,
  currentKey,
  onAdd,
  onRename,
  onMove,
  onDelete,
  emptyLabel,
}: Props) {
  const [draft, setDraft] = useState('');
  const [category, setCategory] = useState<CategoryKey>('sight');

  const submit = () => {
    if (!draft.trim()) return;
    onAdd(draft, category);
    setDraft('');
  };

  return (
    <section className="pl-block">
      <h2 className="pl-block-label">Ideas</h2>

      {ideas.length === 0 ? (
        <p className="pl-empty">{emptyLabel}</p>
      ) : (
        <ul className="pl-ideas">
          {ideas.map((idea) => (
            <li key={idea.id} className="pl-idea">
              <span className="pl-idea-glyph" aria-hidden="true">
                {emojiFor(idea.category)}
              </span>
              <input
                className="pl-idea-title"
                defaultValue={idea.title}
                aria-label={`Name of ${idea.title}`}
                key={`${idea.id}:${idea.title}`}
                onBlur={(e) => onRename(idea.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                  if (e.key === 'Escape') {
                    e.currentTarget.value = idea.title;
                    e.currentTarget.blur();
                  }
                }}
              />
              {idea.date && (
                <span className="pl-idea-booked" title={`Booked for ${idea.date}`}>
                  {idea.date}
                  {idea.time ? ` · ${idea.time}` : ''}
                </span>
              )}
              <select
                className="pl-idea-move"
                aria-label={`Move ${idea.title}`}
                value={currentKey}
                onChange={(e) => {
                  const target = targets.find((t) => t.key === e.target.value);
                  if (target) onMove(idea.id, target.home);
                }}
              >
                {targets.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="pl-idea-del"
                title={`Delete ${idea.title}`}
                onClick={() => onDelete(idea.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="pl-idea-new">
        <select
          aria-label="Category for the new idea"
          value={category}
          onChange={(e) => setCategory(e.target.value as CategoryKey)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.emoji} {c.label}
            </option>
          ))}
        </select>
        <input
          placeholder="Add an idea…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
        <button type="button" onClick={submit} disabled={!draft.trim()}>
          ADD
        </button>
      </div>
    </section>
  );
}
