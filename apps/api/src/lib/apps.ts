import type { AppRecord } from "./types.js";

export type SerializedAppRecord = Omit<AppRecord, "icon_variant_inverted" | "is_default"> & {
  icon_variant_inverted: boolean;
  is_default: boolean;
};

export function serializeAppRecord(app: AppRecord): SerializedAppRecord {
  return {
    ...app,
    icon_variant_inverted: app.icon_variant_inverted === 1,
    is_default: app.is_default === 1,
  };
}
