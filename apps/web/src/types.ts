import type {
  AppMode as SharedAppMode,
  IconVariantMode as SharedIconVariantMode,
  SharedAppPayload,
  UserRole as SharedUserRole,
} from "@webapp-v2/shared";

export type AuthProvider = "local" | "oidc";

export type AuthUser = {
  id: number;
  username: string;
  role: SharedUserRole;
  authProvider: AuthProvider;
};

export type OidcBootstrapConfig = {
  enabled: boolean;
  providerName: string;
  loginUrl: string | null;
  passwordAuthEnabled: boolean;
};

export type AppMode = SharedAppMode;
export type IconVariantMode = SharedIconVariantMode;

export type WebAppEntry = {
  id: number;
  name: string;
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
  preferences: UserPreferences | null;
  oidc: OidcBootstrapConfig;
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
  role: SharedUserRole;
  created_at: string;
};

export type UsersResponse = {
  items: UserEntry[];
};

export type InvitationResponse = {
  token: string;
  role: SharedUserRole;
  expiresAt: string;
  inviteUrl: string;
};

export type InvitationInfoResponse = {
  role: SharedUserRole;
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

export type AppPayload = SharedAppPayload;

export type AppEditorState = AppPayload;
export type JsonImportMode = "merge" | "replace";
export type JsonModalMode = "import" | "export" | null;

export type JsonTransferItem = Partial<AppPayload> & {
  name?: unknown;
  url?: unknown;
  icon?: unknown;
  iconVariantMode?: unknown;
  iconVariantInverted?: unknown;
  accent?: unknown;
  openMode?: unknown;
  isShared?: unknown;
  groupId?: unknown;
  groupName?: unknown;
};

export type EditorMode = "create" | "edit";
export type SidebarMode = "compact" | "expanded";
export type ThemeMode = "light" | "dark";
export type UserTheme = "light" | "dark" | "auto";

export type UserPreferences = {
  theme: UserTheme;
  language: string;
  defaultAppId: number | null;
  accentColor: string | null;
  sidebarColor: string | null;
  textColor: string | null;
  accentColorDark: string | null;
  sidebarColorDark: string | null;
  textColorDark: string | null;
};

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
