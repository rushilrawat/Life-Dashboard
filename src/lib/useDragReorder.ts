import { useRef, useState } from "react";
import type { DragEvent } from "react";

// Native HTML5 drag-and-drop reordering, no extra dependency — this app has
// exactly one UI dependency (lucide-react). Give it the current ids in
// display order and a commit callback; it returns the (live, mid-drag)
// order, which id is currently being dragged, and per-row drag event props
// to spread onto a draggable wrapper.
export function useDragReorder(ids: string[], onDrop: (newOrder: string[]) => void) {
  const idsKey = ids.join(",");
  const [order, setOrder] = useState(ids);
  const [lastIdsKey, setLastIdsKey] = useState(idsKey);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Reset the live order synchronously during render when the caller's ids
  // actually change (e.g. "Show more" collapsing back to 5 rows) — a
  // useEffect-based sync lags one render behind, so the stale, longer order
  // would still reference ids no longer present in the caller's item
  // lookup and crash. This is React's own sanctioned pattern for adjusting
  // state when a prop changes without an extra render.
  let currentOrder = order;
  if (idsKey !== lastIdsKey) {
    setLastIdsKey(idsKey);
    setOrder(ids);
    currentOrder = ids;
  }

  // Refs mirror the state so the native event handlers below always read the
  // latest value even if a native event fires between React re-renders.
  const orderRef = useRef(currentOrder);
  orderRef.current = currentOrder;
  const draggingRef = useRef<string | null>(null);
  const didDropRef = useRef(false);

  function dragProps(id: string) {
    return {
      draggable: true,
      onDragStart: () => {
        draggingRef.current = id;
        didDropRef.current = false;
        setDraggingId(id);
      },
      onDragOver: (e: DragEvent) => {
        e.preventDefault(); // required to allow this element to be a drop target
        const from = draggingRef.current;
        if (!from || from === id) return;
        setOrder((cur) => {
          const fromIndex = cur.indexOf(from);
          const toIndex = cur.indexOf(id);
          if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return cur;
          const next = [...cur];
          next.splice(fromIndex, 1);
          next.splice(toIndex, 0, from);
          return next;
        });
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        didDropRef.current = true;
      },
      onDragEnd: () => {
        // Only commit on a real drop; dragging off the list (didDrop stays
        // false) reverts the live preview back to the last committed order.
        if (didDropRef.current) onDrop(orderRef.current);
        else setOrder(ids);
        draggingRef.current = null;
        setDraggingId(null);
      },
    };
  }

  return { order: currentOrder, draggingId, dragProps };
}

// The shape `dragProps(id)` returns — named so callers that split it across
// two elements (a drag-source handle plus a separate drop-target wrapper,
// e.g. Board.tsx's board-level reorder) can type the pieces without
// depending on this hook's internal generics.
export type DragHandleProps = ReturnType<ReturnType<typeof useDragReorder>["dragProps"]>;
