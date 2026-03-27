import type { AppRecord } from "./types.js";

export type SerializedAppRecord = Omit<AppRecord, "icon_variant_inverted"> & {
  icon_variant_inverted: boolean;
};

export function serializeAppRecord(app: AppRecord): SerializedAppRecord {
  return {
    ...app,
    icon_variant_inverted: app.icon_variant_inverted === 1,
  };
}
