export const SIDEBAR_DELETE_THRESHOLD_OFFSET_PX = 112;
export const SIDEBAR_DELETE_THRESHOLD_SELECTOR = ".sidebar-delete-threshold";

export function getSidebarDeleteThresholdLeft({
  sidebarRight,
  markerLeft,
}: {
  sidebarRight: number;
  markerLeft?: number | null;
}) {
  return markerLeft ?? sidebarRight + SIDEBAR_DELETE_THRESHOLD_OFFSET_PX;
}

export function getSidebarDeleteZoneProgress({
  currentLeft,
  thresholdLeft,
}: {
  currentLeft: number;
  thresholdLeft: number;
}) {
  const sidebarRight = thresholdLeft - SIDEBAR_DELETE_THRESHOLD_OFFSET_PX;
  if (currentLeft <= sidebarRight) {
    return 0;
  }

  if (currentLeft >= thresholdLeft) {
    return 1;
  }

  return (currentLeft - sidebarRight) / SIDEBAR_DELETE_THRESHOLD_OFFSET_PX;
}

export function isPastSidebarDeleteThreshold({
  currentLeft,
  thresholdLeft,
}: {
  currentLeft: number;
  thresholdLeft: number;
}) {
  return currentLeft >= thresholdLeft;
}

type ClientXPointLike = {
  clientX?: unknown;
};

function getClientXFromPoint(point: ClientXPointLike | null | undefined) {
  return point && typeof point.clientX === "number" ? point.clientX : null;
}

export function getEventClientX(event: Event | null | undefined) {
  if (!event || typeof event !== "object") {
    return null;
  }

  const directClientX = getClientXFromPoint(event as ClientXPointLike);
  if (directClientX !== null) {
    return directClientX;
  }

  const touchEvent = event as {
    touches?: ArrayLike<ClientXPointLike> | null;
    changedTouches?: ArrayLike<ClientXPointLike> | null;
  };
  const firstTouch = touchEvent.touches?.[0] ?? touchEvent.changedTouches?.[0];
  return getClientXFromPoint(firstTouch);
}

export function getDraggedPointerLeft({
  initialPointerLeft,
  deltaX,
}: {
  initialPointerLeft: number | null;
  deltaX: number;
}) {
  return initialPointerLeft === null ? null : initialPointerLeft + deltaX;
}
