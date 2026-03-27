export type AuthUser = {
  id: number;
  username: string;
  role: "admin" | "viewer";
};

export type AppMode = "iframe" | "external";
export type IconVariantMode = "auto" | "base";

export type WebAppEntry = {
  id: number;
  name: string;
  description: string;
  url: string;
  icon: string;
  icon_variant_mode: IconVariantMode;
  icon_variant_inverted: boolean;
  accent: string;
  open_mode: AppMode;
  is_default: boolean;
  is_shared: boolean;
  group_id: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type GroupEntry = {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
};

export type BootstrapResponse = {
  needsSetup: boolean;
  demoMode: boolean;
  user: AuthUser | null;
};

export type AppsResponse = {
  items: WebAppEntry[];
};

export type GroupsResponse = {
  items: GroupEntry[];
};

export type UserEntry = {
  id: number;
  username: string;
  role: "admin" | "viewer";
  created_at: string;
};

export type UsersResponse = {
  items: UserEntry[];
};

export type InvitationResponse = {
  token: string;
  role: "admin" | "viewer";
  expiresAt: string;
  inviteUrl: string;
};

export type InvitationInfoResponse = {
  role: "admin" | "viewer";
  expiresAt: string;
};

export type ImportAppsResponse = {
  items: WebAppEntry[];
  importedIds: number[];
};

export type AppStatus = "online" | "offline" | "unknown";

export type AppPingResponse = {
  status: Exclude<AppStatus, "unknown">;
  checkedAt: string;
};

export type AppStatusEntry = {
  status: AppStatus;
  checkedAt: string | null;
};

export type AppPayload = {
  name: string;
  description: string;
  url: string;
  icon: string;
  iconVariantMode: IconVariantMode;
  iconVariantInverted: boolean;
  accent: string;
  openMode: AppMode;
  isShared: boolean;
  groupId?: number | null;
};

export type AppEditorState = AppPayload;
export type JsonImportMode = "merge" | "replace";
export type JsonModalMode = "import" | "export" | null;

export type JsonTransferItem = Partial<AppPayload> & {
  name?: unknown;
  description?: unknown;
  url?: unknown;
  icon?: unknown;
  iconVariantMode?: unknown;
  iconVariantInverted?: unknown;
  accent?: unknown;
  openMode?: unknown;
  isShared?: unknown;
  groupId?: unknown;
};

export type EditorMode = "create" | "edit";
export type SidebarMode = "compact" | "expanded";
export type ThemeMode = "light" | "dark";

export type DashboardIconMetadata = {
  colors?: {
    light?: string;
    dark?: string;
  };
};

export type DashboardIconResolution = {
  icon: string;
  appliedVariant: "light" | "dark" | null;
};

export type DashboardIconsMetadataMap = Record<string, DashboardIconMetadata>;

export type ContextMenuState = {
  x: number;
  y: number;
  app: WebAppEntry | null;
} | null;
