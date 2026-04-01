import assert from "node:assert/strict";
import test from "node:test";
import {
  SIDEBAR_DELETE_THRESHOLD_OFFSET_PX,
  getDraggedPointerLeft,
  getEventClientX,
  getSidebarDeleteThresholdLeft,
  getSidebarDeleteZoneProgress,
  isPastSidebarDeleteThreshold,
} from "./sidebar-delete-zone";

test("getSidebarDeleteThresholdLeft uses the marker position when available", () => {
  assert.equal(
    getSidebarDeleteThresholdLeft({
      sidebarRight: 120,
      markerLeft: 208,
    }),
    208
  );
});

test("getSidebarDeleteThresholdLeft falls back to the sidebar edge plus the default offset", () => {
  assert.equal(
    getSidebarDeleteThresholdLeft({
      sidebarRight: 120,
      markerLeft: null,
    }),
    120 + SIDEBAR_DELETE_THRESHOLD_OFFSET_PX
  );
});

test("getSidebarDeleteZoneProgress starts at the sidebar edge and reaches full visibility at the delete line", () => {
  const thresholdLeft = 300;
  const sidebarRight = thresholdLeft - SIDEBAR_DELETE_THRESHOLD_OFFSET_PX;

  assert.equal(
    getSidebarDeleteZoneProgress({
      currentLeft: sidebarRight,
      thresholdLeft,
    }),
    0
  );

  assert.equal(
    getSidebarDeleteZoneProgress({
      currentLeft: sidebarRight + SIDEBAR_DELETE_THRESHOLD_OFFSET_PX / 2,
      thresholdLeft,
    }),
    0.5
  );

  assert.equal(
    getSidebarDeleteZoneProgress({
      currentLeft: thresholdLeft,
      thresholdLeft,
    }),
    1
  );
});

test("isPastSidebarDeleteThreshold matches the delete line exactly", () => {
  assert.equal(
    isPastSidebarDeleteThreshold({
      currentLeft: 300,
      thresholdLeft: 300,
    }),
    true
  );
});

test("getEventClientX reads pointer-like events directly", () => {
  assert.equal(getEventClientX({ clientX: 184 } as unknown as Event), 184);
});

test("getEventClientX reads touch-like events from touches and changedTouches", () => {
  assert.equal(getEventClientX({ touches: [{ clientX: 145 }] } as unknown as Event), 145);
  assert.equal(getEventClientX({ changedTouches: [{ clientX: 156 }] } as unknown as Event), 156);
});

test("getDraggedPointerLeft follows the cursor or finger from the initial position", () => {
  assert.equal(
    getDraggedPointerLeft({
      initialPointerLeft: 100,
      deltaX: 48,
    }),
    148
  );
});
