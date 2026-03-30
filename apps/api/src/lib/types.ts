import type {
  AppMode as SharedAppMode,
  IconVariantMode as SharedIconVariantMode,
  UserRole as SharedUserRole,
} from "@webapp-v2/shared";

export type AppMode = SharedAppMode;
export type IconVariantMode = SharedIconVariantMode;
export type UserRole = SharedUserRole;

export type AppRecord = {
  id: number;
  name: string;
  url: string;
  icon: string;
  icon_variant_mode: IconVariantMode;
  icon_variant_inverted: number;
  accent: string;
  open_mode: AppMode;
  is_default: number;
  is_shared: number;
  group_id: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type GroupRecord = {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
};

export type SessionUser = {
  id: number;
  username: string;
  role: UserRole;
};

export type UserPreferencesRecord = {
  user_id: number;
  theme: "light" | "dark" | "auto";
  language: string;
  default_app_id: number | null;
  accent_color: string | null;
  sidebar_color: string | null;
  text_color: string | null;
  button_color: string | null;
  accent_color_dark: string | null;
  sidebar_color_dark: string | null;
  text_color_dark: string | null;
  button_color_dark: string | null;
  updated_at: string;
};
