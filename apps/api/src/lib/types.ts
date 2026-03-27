export type AppMode = "iframe" | "external";
export type IconVariantMode = "auto" | "base";

export type AppRecord = {
  id: number;
  name: string;
  description: string;
  url: string;
  icon: string;
  icon_variant_mode: IconVariantMode;
  icon_variant_inverted: number;
  accent: string;
  open_mode: AppMode;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SessionUser = {
  id: number;
  username: string;
};
