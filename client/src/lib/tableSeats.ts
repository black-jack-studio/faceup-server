export type SeatPosition = "bottom" | "left" | "right";

const CANONICAL_ORDER: SeatPosition[] = ["bottom", "left", "right"];

// Seat positions in the DB are absolute (host is always "bottom", same for every viewer) —
// but each player expects to see *their own* hand at the bottom of *their own* screen, with
// the others arranged around them, same as any real multiplayer card table. This computes
// which absolute seat position should render at each screen slot, from a given viewer's
// point of view: the viewer's own seat always becomes "bottom", and the remaining occupied
// seats fill "left" then "right" in their fixed canonical order (bottom < left < right, minus
// the viewer) — not relative to the viewer's own absolute position. That's what makes it
// symmetric: with just two players, each one sees the other at "left" on their own screen,
// not one seeing "left" and the other seeing "right".
export function getSeatDisplayOrder(viewerPosition: SeatPosition | null): {
  bottomAbs: SeatPosition;
  leftAbs: SeatPosition;
  rightAbs: SeatPosition;
} {
  if (!viewerPosition) {
    return { bottomAbs: "bottom", leftAbs: "left", rightAbs: "right" };
  }
  const others = CANONICAL_ORDER.filter((p) => p !== viewerPosition);
  return { bottomAbs: viewerPosition, leftAbs: others[0], rightAbs: others[1] };
}
