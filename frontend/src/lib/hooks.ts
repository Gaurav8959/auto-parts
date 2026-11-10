import { useState } from "react";

// Runs `onOpen` during render when `open` flips to true — React's pattern for
// "adjusting state when a prop changes", so a dialog's form resets without an effect.
export function useOnOpen(open: boolean, onOpen: () => void) {
  const [prev, setPrev] = useState(open);
  if (open !== prev) {
    setPrev(open);
    if (open) onOpen();
  }
}

// Re-syncs local draft state when the upstream value changes
export function useSyncedState<T>(value: T) {
  const [draft, setDraft] = useState(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setDraft(value);
  }
  return [draft, setDraft] as const;
}
