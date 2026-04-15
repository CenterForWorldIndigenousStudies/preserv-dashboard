"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactElement } from "react";

interface AssignCollectionButtonProps {
  /** The document ID to update */
  documentId: string;
  /** Tags already assigned to this document */
  currentTags: string[];
}

interface CollectionTagsResponse {
  collections?: string[];
  error?: string;
}

interface SaveCollectionTagsResponse {
  id?: string;
  collection_tags?: string[];
  error?: string;
}

/**
 * Path B fallback UI for manual Collection tag assignment.
 *
 * Renders an inline "Assign Collection" control on the document detail page.
 * Shown when a document has no collection_tags at ingest time (Path A = assigned
 * at ingest, Path B = assigned later by a human). Allows a human to select one
 * or more collections from the pool of known collection tags and persist the
 * selection to the MySQL documents table via PATCH /api/documents/[id].
 */
export function AssignCollectionButton({
  documentId,
  currentTags,
}: AssignCollectionButtonProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(currentTags);
  const [customTag, setCustomTag] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingTags, setIsFetchingTags] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Load available collection tags when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setIsFetchingTags(true);
    setError(null);

    fetch(`/api/documents/${documentId}/collections`)
      .then(async (res): Promise<CollectionTagsResponse> => res.json() as Promise<CollectionTagsResponse>)
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setAvailableTags(data.collections ?? []);
        }
      })
      .catch(() => setError("Failed to load available collections."))
      .finally(() => setIsFetchingTags(false));
  }, [isOpen, documentId]);

  // Sync selected tags when currentTags change from parent (e.g., after save)
  useEffect(() => {
    setSelectedTags(currentTags);
  }, [currentTags]);

  const openModal = useCallback(() => {
    setIsOpen(true);
    setSuccess(false);
    setError(null);
    setCustomTag("");
    // Let the dialog open, then focus the first tag button
    requestAnimationFrame(() => dialogRef.current?.showModal());
  }, []);

  const closeModal = useCallback(() => {
    dialogRef.current?.close();
    setIsOpen(false);
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const handleSave = useCallback(async () => {
    const tagsToSave = selectedTags.filter((t) => t.trim().length > 0);
    if (customTag.trim().length > 0 && !tagsToSave.includes(customTag.trim())) {
      tagsToSave.push(customTag.trim());
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collection_tags: tagsToSave }),
      });

      const data = await res.json() as SaveCollectionTagsResponse;

      if (!res.ok) {
        setError(data.error ?? "Failed to save collection tags.");
        return;
      }

      setSuccess(true);
      // Update parent state by reloading the page data
      // The parent component will re-fetch document detail
      setTimeout(() => {
        closeModal();
        // Force Next.js to re-render the page by navigating to itself
        window.location.reload();
      }, 800);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedTags, customTag, documentId, closeModal]);

  const alreadyAssigned = currentTags.length > 0;

  return (
    <>
      {/* Trigger button — shown in the Collection Tags field row on the detail page */}
      <div className="mt-3 flex items-center gap-3">
        {alreadyAssigned ? (
          <span className="text-xs text-ink/50">
            Tags assigned.{" "}
            <button
              onClick={openModal}
              className="text-moss underline hover:text-ink"
            >
              Edit assignment
            </button>
          </span>
        ) : (
          <button
            onClick={openModal}
            className="rounded-full bg-moss px-4 py-2 text-sm font-medium text-white hover:bg-moss/80"
          >
            Assign Collection
          </button>
        )}
      </div>

      {/* Modal dialog */}
      <dialog
        ref={dialogRef}
        onClose={closeModal}
        className="rounded-2xl border border-moss/15 bg-white p-0 shadow-panel backdrop:bg-ink/30"
        style={{ padding: 0, minWidth: "min(480px, 90vw)" }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink">Assign Collection</h3>
            <button
              onClick={closeModal}
              className="rounded-full p-1 text-ink/50 hover:bg-sand hover:text-ink"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <p className="mt-2 text-sm text-ink/70">
            Select one or more collections to assign to this document.
            This is the Path B fallback for documents that arrived without a{" "}
            <code className="text-xs">primary_collection_tag</code>.
          </p>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              Collection tags saved. Reloading...
            </div>
          )}

          {isFetchingTags ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-ink/60">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading available collections...
            </div>
          ) : (
            <>
              {/* Existing tag selections */}
              {availableTags.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-ink/60">
                    Known Collections
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          toggleTag(tag);
                        }}
                        className={`rounded-full px-3 py-1 text-sm transition-colors ${selectedTags.includes(tag) ? "bg-moss text-white" : "bg-sand text-ink hover:bg-sky"}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom tag input */}
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-ink/60">
                  Add Custom Collection
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (customTag.trim()) toggleTag(customTag.trim());
                      }
                    }}
                    placeholder="Enter collection name..."
                    className="flex-1 rounded-xl border border-moss/20 bg-sand/40 px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-moss focus:outline-none focus:ring-1 focus:ring-moss"
                  />
                  <button
                    onClick={() => {
                      if (customTag.trim()) {
                        toggleTag(customTag.trim());
                        setCustomTag("");
                      }
                    }}
                    className="rounded-xl bg-moss px-3 py-2 text-sm text-white hover:bg-moss/80"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Selected preview */}
              {selectedTags.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-ink/60">
                    Selected ({selectedTags.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-moss/10 px-3 py-1 text-sm text-moss"
                      >
                        {tag}
                        <button
                          onClick={() => {
                            toggleTag(tag);
                          }}
                          className="ml-1 rounded-full hover:bg-moss/20"
                          aria-label={`Remove ${tag}`}
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal footer */}
        <div className="flex items-center justify-end gap-3 border-t border-moss/10 px-6 py-4">
          <button
            onClick={closeModal}
            className="rounded-full px-4 py-2 text-sm text-ink/70 hover:bg-sand hover:text-ink"
          >
            Cancel
          </button>
          <button
            onClick={(_event: MouseEvent<HTMLButtonElement>) => {
              void handleSave();
            }}
            disabled={isLoading || selectedTags.length === 0}
            className="rounded-full bg-moss px-5 py-2 text-sm font-medium text-white hover:bg-moss/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Save Collection Tags"}
          </button>
        </div>
      </dialog>
    </>
  );
}
