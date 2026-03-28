export type AppMode = "iframe" | "external";
export type IconVariantMode = "auto" | "base";
export type UserRole = "admin" | "viewer";

export type SharedAppPayload = {
  name: string;
  url: string;
  icon: string;
  iconVariantMode: IconVariantMode;
  iconVariantInverted: boolean;
  accent: string;
  openMode: AppMode;
  isShared: boolean;
  groupId?: number | null;
};
