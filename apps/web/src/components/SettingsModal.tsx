import { memo, useEffect, useMemo, useState, type ChangeEvent, type RefObject } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AppIcon } from "./AppIcon";
import { Dropdown } from "./Dropdown";
import { jsonImportExample } from "../lib/app-utils";
import type { AuthProvider, DashboardIconsMetadataMap, GroupEntry, JsonImportMode, OidcAdminConfig, OidcConfigSavePayload, ThemeMode, UserEntry, UserPreferences, WebAppEntry } from "../types";
import { supportedLanguages, useTranslation, type SupportedLanguage } from "../lib/i18n";

export type SettingsTab = "groups" | "users" | "json" | "personalization" | "account" | "oidc" | "about";

function formatCreatedAt(value: string) {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsedDate);
}

function SortableGroupRow({
  group,
  busy,
  groups,
  editingGroupId,
  editingGroupName,
  setEditingGroupId,
  setEditingGroupName,
  onRenameGroup,
  onMoveGroup,
  onDeleteGroup,
}: {
  group: GroupEntry;
  busy: boolean;
  groups: GroupEntry[];
  editingGroupId: number | null;
  editingGroupName: string;
  setEditingGroupId: (value: number | null) => void;
  setEditingGroupName: (value: string) => void;
  onRenameGroup: (groupId: number, name: string) => Promise<void>;
  onMoveGroup: (groupId: number, direction: "up" | "down") => Promise<void>;
  onDeleteGroup: (groupId: number) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id });

  return (
    <div
      ref={setNodeRef}
      className={isDragging ? "group-item dragging" : "group-item"}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {editingGroupId === group.id ? (
        <form
          className="group-edit-row"
          onSubmit={(event) => {
            event.preventDefault();
            void onRenameGroup(group.id, editingGroupName.trim()).then(() => {
              setEditingGroupId(null);
              setEditingGroupName("");
            });
          }}
        >
          <input
            type="text"
            value={editingGroupName}
            onChange={(event) => setEditingGroupName(event.target.value)}
            minLength={2}
            maxLength={40}
            required
          />
          <button className="secondary-button" type="submit" disabled={busy}>
            {t("common.save")}
          </button>
        </form>
      ) : (
        <div className="group-item-row" {...attributes} {...listeners}>
          <strong className="group-item-name">{group.name}</strong>
          <div className="group-item-actions">
            <button
              className="secondary-button group-action group-action-icon"
              type="button"
              onClick={() => void onMoveGroup(group.id, "up")}
              disabled={busy || groups[0]?.id === group.id}
              title={t("common.moveUp")}
              aria-label={t("common.moveUp")}
            >
              ↑
            </button>
            <button
              className="secondary-button group-action group-action-icon"
              type="button"
              onClick={() => void onMoveGroup(group.id, "down")}
              disabled={busy || groups[groups.length - 1]?.id === group.id}
              title={t("common.moveDown")}
              aria-label={t("common.moveDown")}
            >
              ↓
            </button>
            <button
              className="secondary-button group-action group-action-rename"
              type="button"
              onClick={() => {
                setEditingGroupId(group.id);
                setEditingGroupName(group.name);
              }}
            >
              {t("common.rename")}
            </button>
            <button
              className="danger-button group-action group-action-delete"
              type="button"
              onClick={() => void onDeleteGroup(group.id)}
              disabled={busy}
            >
              {t("common.delete")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupsTabContent({
  busy,
  groups,
  onCreateGroup,
  onRenameGroup,
  onMoveGroup,
  onReorderGroups,
  onDeleteGroup,
}: {
  busy: boolean;
  groups: GroupEntry[];
  onCreateGroup: (name: string) => Promise<void>;
  onRenameGroup: (groupId: number, name: string) => Promise<void>;
  onMoveGroup: (groupId: number, direction: "up" | "down") => Promise<void>;
  onReorderGroups: (groupIds: number[]) => Promise<void>;
  onDeleteGroup: (groupId: number) => Promise<void>;
}) {
  const { t } = useTranslation();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const groupIds = useMemo(() => groups.map((g) => g.id), [groups]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const activeIndex = groups.findIndex((g) => g.id === Number(active.id));
    const overIndex = groups.findIndex((g) => g.id === Number(over.id));
    if (activeIndex === -1 || overIndex === -1) {
      return;
    }

    void onReorderGroups(arrayMove(groups, activeIndex, overIndex).map((g) => g.id));
  };

  return (
    <div className="json-panel">
      <form
        className="group-create-row"
        onSubmit={(event) => {
          event.preventDefault();
          void onCreateGroup(newGroupName.trim()).then(() => setNewGroupName(""));
        }}
      >
        <input
          type="text"
          value={newGroupName}
          onChange={(event) => setNewGroupName(event.target.value)}
          placeholder={t("modal.newGroup")}
          minLength={2}
          maxLength={40}
          required
        />
        <button className="primary-button" type="submit" disabled={busy}>
          {t("common.add")}
        </button>
      </form>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={groupIds} strategy={verticalListSortingStrategy}>
          <div className="group-list">
            {groups.map((group) => (
              <SortableGroupRow
                key={group.id}
                group={group}
                busy={busy}
                groups={groups}
                editingGroupId={editingGroupId}
                editingGroupName={editingGroupName}
                setEditingGroupId={setEditingGroupId}
                setEditingGroupName={setEditingGroupName}
                onRenameGroup={onRenameGroup}
                onMoveGroup={onMoveGroup}
                onDeleteGroup={onDeleteGroup}
              />
            ))}
            {groups.length === 0 ? <p className="json-summary">{t("modal.noGroups")}</p> : null}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function UsersTabContent({
  busy,
  currentUserId,
  users,
  onCreateInvitation,
  onCopyInvitationLink,
  onChangeRole,
  onDeleteUser,
}: {
  busy: boolean;
  currentUserId: number;
  users: UserEntry[];
  onCreateInvitation: (role: "admin" | "viewer") => Promise<string>;
  onCopyInvitationLink: (inviteLink: string) => Promise<void>;
  onChangeRole: (userId: number, role: "admin" | "viewer") => Promise<void>;
  onDeleteUser: (userId: number) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [inviteLink, setInviteLink] = useState("");
  const roleItems = [
    { label: "viewer", value: "viewer" },
    { label: "admin", value: "admin" },
  ] as const;

  return (
    <div className="json-panel">
      <form
        className="user-invite-row"
        onSubmit={(event) => {
          event.preventDefault();
          void onCreateInvitation("viewer").then((nextInviteLink) => {
            setInviteLink(nextInviteLink);
          });
        }}
      >
        <button className="primary-button" type="submit" disabled={busy}>
          {t("modal.createInvitationLink")}
        </button>
      </form>
      {inviteLink ? (
        <div className="invitation-link-row">
          <input type="text" readOnly value={inviteLink} aria-label={t("modal.invitationLink")} />
          <button
            className="secondary-button"
            type="button"
            onClick={() => void onCopyInvitationLink(inviteLink)}
          >
            {t("common.copy")}
          </button>
        </div>
      ) : (
        <p className="json-summary">{t("modal.invitationHelp")}</p>
      )}
      <div className="group-list">
        {users.map((user) => (
          <div key={user.id} className="group-item">
            <div className="user-row">
              <div className="user-meta">
                <strong>{user.username}</strong>
                <small>
                  {user.id === currentUserId
                    ? t("modal.you")
                    : t("modal.createdOn", { date: formatCreatedAt(user.created_at) })}
                </small>
              </div>
              <div className="user-actions">
                <Dropdown
                  trigger={user.role}
                  items={roleItems.map((item) => ({
                    ...item,
                    active: item.value === user.role,
                  }))}
                  onSelect={(value) => void onChangeRole(user.id, value === "admin" ? "admin" : "viewer")}
                  className="secondary-button user-role-dropdown"
                  disabled={busy || user.id === currentUserId}
                />
                <button
                  className="danger-button"
                  type="button"
                  onClick={() => void onDeleteUser(user.id)}
                  disabled={busy || user.id === currentUserId}
                >
                  {t("common.delete")}
                </button>
              </div>
            </div>
          </div>
        ))}
        {users.length === 0 ? <p className="json-summary">{t("modal.noUsers")}</p> : null}
      </div>
    </div>
  );
}

function JsonTabContent({
  apps,
  busy,
  jsonMode,
  onSwitchMode,
  jsonImportMode,
  setJsonImportMode,
  jsonValue,
  setJsonValue,
  jsonModalError,
  jsonModalInfo,
  jsonFileInputRef,
  onFileChange,
  onCopyExport,
  onImport,
  onEditExport,
}: {
  apps: WebAppEntry[];
  busy: boolean;
  jsonMode: "import" | "export";
  onSwitchMode: (mode: "import" | "export") => void;
  jsonImportMode: JsonImportMode;
  setJsonImportMode: (mode: JsonImportMode) => void;
  jsonValue: string;
  setJsonValue: (value: string) => void;
  jsonModalError: string | null;
  jsonModalInfo: string | null;
  jsonFileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onCopyExport: () => Promise<void>;
  onImport: () => Promise<void>;
  onEditExport: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="json-panel settings-json-panel">
      <div className="json-toolbar">
        <div className="json-segmented" role="tablist" aria-label={t("modal.importMode")}>
          <button
            className={jsonMode === "import" ? "icon-variant-option active" : "icon-variant-option"}
            type="button"
            onClick={() => onSwitchMode("import")}
          >
            {t("modal.import")}
          </button>
          <button
            className={jsonMode === "export" ? "icon-variant-option active" : "icon-variant-option"}
            type="button"
            onClick={() => onSwitchMode("export")}
          >
            {t("modal.export")}
          </button>
        </div>
      </div>

      {jsonMode === "import" ? (
        <div className="json-toolbar">
          <div className="json-segmented" role="tablist">
            <button
              className={jsonImportMode === "merge" ? "icon-variant-option active" : "icon-variant-option"}
              type="button"
              onClick={() => setJsonImportMode("merge")}
            >
              {t("common.merge")}
            </button>
            <button
              className={jsonImportMode === "replace" ? "icon-variant-option active" : "icon-variant-option"}
              type="button"
              onClick={() => setJsonImportMode("replace")}
            >
              {t("common.replace")}
            </button>
          </div>
          <div className="json-toolbar-actions">
            <input
              ref={jsonFileInputRef}
              className="json-file-input"
              type="file"
              accept="application/json,.json"
              onChange={(event) => void onFileChange(event)}
            />
            <button className="secondary-button" type="button" onClick={() => jsonFileInputRef.current?.click()}>
              {t("modal.loadFile")}
            </button>
            <button
              className="ghost-icon-button"
              type="button"
              onClick={() => setJsonValue(jsonImportExample)}
              title={t("modal.jsonExample")}
            >
              {t("common.example")}
            </button>
          </div>
        </div>
      ) : (
        <div className="json-toolbar export-toolbar">
          <p className="json-summary">{t("modal.appsInOrder", { count: apps.length, suffix: apps.length > 1 ? "s" : "" })}</p>
          <div className="json-toolbar-actions">
            <button className="secondary-button" type="button" onClick={() => void onCopyExport()}>
              {t("common.copy")}
            </button>
          </div>
        </div>
      )}

      {jsonModalError ? <p className="form-error">{t(jsonModalError)}</p> : null}
      {jsonModalInfo ? <p className="json-summary">{t(jsonModalInfo)}</p> : null}

      <label className="json-textarea-field">
        <span>{jsonMode === "import" ? t("common.json") : t("modal.exportedJson")}</span>
        <textarea
          className="json-textarea"
          value={jsonValue}
          onChange={(event) => setJsonValue(event.target.value)}
          placeholder={jsonMode === "import" ? jsonImportExample : "[]"}
          readOnly={jsonMode === "export"}
          spellCheck={false}
        />
      </label>

      <div className="editor-actions">
        {jsonMode === "import" ? (
          <button className="primary-button" type="button" onClick={() => void onImport()} disabled={busy}>
            {t("app.importJson")}
          </button>
        ) : (
          <button className="primary-button" type="button" onClick={onEditExport}>
            {t("modal.editJson")}
          </button>
        )}
      </div>
    </div>
  );
}

const colorDefs = [
  {
    lightKey: "sidebarColor" as keyof UserPreferences,
    darkKey: "sidebarColorDark" as keyof UserPreferences,
    labelKey: "settings.sidebarColor" as const,
    fallbackLight: "#f7efe2",
    fallbackDark: "#181411",
  },
  {
    lightKey: "accentColor" as keyof UserPreferences,
    darkKey: "accentColorDark" as keyof UserPreferences,
    labelKey: "settings.accentColor" as const,
    fallbackLight: "#c65c31",
    fallbackDark: "#df7a42",
  },
  {
    lightKey: "textColor" as keyof UserPreferences,
    darkKey: "textColorDark" as keyof UserPreferences,
    labelKey: "settings.textColor" as const,
    fallbackLight: "#21160e",
    fallbackDark: "#f4ede4",
  },
];

function PersonalizationTabContent({
  apps,
  preferences,
  themeMode,
  dashboardIconsMetadata,
  onUpdatePreferences,
  onPreviewTheme,
}: {
  apps: WebAppEntry[];
  preferences: UserPreferences;
  themeMode: ThemeMode;
  dashboardIconsMetadata: DashboardIconsMetadataMap;
  onUpdatePreferences: (patch: Partial<UserPreferences>) => void;
  onPreviewTheme: (mode: "light" | "dark") => void;
}) {
  const { t } = useTranslation();
  const [colorMode, setColorMode] = useState<"light" | "dark">(themeMode);
  const startupPageActiveApp = apps.find((app) => app.id === preferences.defaultAppId) ?? null;
  const languageItems = [
    { label: t("settings.languageAuto"), value: "auto", active: preferences.language === "auto" },
    ...supportedLanguages.map((language) => ({
      label: t(`settings.languageName.${language}`),
      value: language,
      active: preferences.language === language,
    })),
  ];
  const themeItems = [
    { label: t("settings.themeAuto"), value: "auto", active: preferences.theme === "auto" },
    { label: t("settings.themeLight"), value: "light", active: preferences.theme === "light" },
    { label: t("settings.themeDark"), value: "dark", active: preferences.theme === "dark" },
  ];
  const startupPageItems = [
    {
      label: (
        <span className="dropdown-app-label dropdown-app-label-placeholder">
          <span className="dropdown-app-placeholder" aria-hidden="true" />
          <span className="dropdown-app-text">{t("settings.startupPageNone")}</span>
        </span>
      ),
      value: "",
      active: preferences.defaultAppId == null,
    },
    ...apps.map((app) => ({
      label: (
        <span className="dropdown-app-label">
          <AppIcon
            icon={app.icon}
            name={app.name}
            url={app.url}
            accent={app.accent}
            themeMode={themeMode}
            dashboardIconsMetadata={dashboardIconsMetadata}
            iconVariantMode={app.icon_variant_mode}
            iconVariantInverted={app.icon_variant_inverted}
          />
          <span className="dropdown-app-text">{app.name}</span>
        </span>
      ),
      value: String(app.id),
      active: preferences.defaultAppId === app.id,
    })),
  ];
  const activeLanguageLabel = languageItems.find((item) => item.active)?.label ?? t("settings.languageAuto");
  const activeThemeLabel = themeItems.find((item) => item.active)?.label ?? t("settings.themeAuto");
  const activeStartupPageLabel = startupPageActiveApp ? (
    <span className="dropdown-app-label">
      <AppIcon
        icon={startupPageActiveApp.icon}
        name={startupPageActiveApp.name}
        url={startupPageActiveApp.url}
        accent={startupPageActiveApp.accent}
        themeMode={themeMode}
        dashboardIconsMetadata={dashboardIconsMetadata}
        iconVariantMode={startupPageActiveApp.icon_variant_mode}
        iconVariantInverted={startupPageActiveApp.icon_variant_inverted}
      />
      <span className="dropdown-app-text">{startupPageActiveApp.name}</span>
    </span>
  ) : (
    <span className="dropdown-app-label dropdown-app-label-placeholder">
      <span className="dropdown-app-placeholder" aria-hidden="true" />
      <span className="dropdown-app-text">{t("settings.startupPageNone")}</span>
    </span>
  );

  useEffect(() => {
    setColorMode(themeMode);
  }, [themeMode]);

  const handleColorModeChange = (mode: "light" | "dark") => {
    setColorMode(mode);
    onPreviewTheme(mode);
  };

  return (
    <div className="json-panel">
      <div className="personalization-section">
        <div className="personalization-row">
          <label className="personalization-label">{t("settings.language")}</label>
          <Dropdown
            trigger={activeLanguageLabel}
            items={languageItems}
            onSelect={(value) => onUpdatePreferences({ language: value })}
            className="secondary-button personalization-select"
          />
        </div>

        <div className="personalization-row">
          <label className="personalization-label">{t("settings.theme")}</label>
          <Dropdown
            trigger={activeThemeLabel}
            items={themeItems}
            onSelect={(value) => onUpdatePreferences({ theme: value as UserPreferences["theme"] })}
            className="secondary-button personalization-select"
          />
        </div>

        <div className="personalization-row">
          <label className="personalization-label">{t("settings.startupPage")}</label>
          <Dropdown
            trigger={activeStartupPageLabel}
            items={startupPageItems}
            onSelect={(value) => onUpdatePreferences({ defaultAppId: value ? Number(value) : null })}
            className="secondary-button personalization-select"
          />
        </div>
      </div>

      <div className="personalization-section">
        <div className="personalization-colors-header">
          <span className="personalization-label">{t("settings.colors")}</span>
          <div className="json-segmented" role="tablist">
            <button
              type="button"
              className={colorMode === "light" ? "icon-variant-option active" : "icon-variant-option"}
              onClick={() => handleColorModeChange("light")}
            >
              {t("settings.themeLight")}
            </button>
            <button
              type="button"
              className={colorMode === "dark" ? "icon-variant-option active" : "icon-variant-option"}
              onClick={() => handleColorModeChange("dark")}
            >
              {t("settings.themeDark")}
            </button>
          </div>
        </div>

        <div className="personalization-colors">
          {colorDefs.map(({ lightKey, darkKey, labelKey, fallbackLight, fallbackDark }) => {
            const activeKey = colorMode === "light" ? lightKey : darkKey;
            const fallback = colorMode === "light" ? fallbackLight : fallbackDark;
            return (
              <div key={String(activeKey)} className="personalization-color-row">
                <label className="personalization-label">{t(labelKey)}</label>
                <div className="personalization-color-field">
                  <input
                    type="color"
                    value={(preferences[activeKey] as string | null) ?? fallback}
                    onChange={(e) => onUpdatePreferences({ [activeKey]: e.target.value })}
                  />
                  {preferences[activeKey] && (
                    <button type="button" className="personalization-reset-color" onClick={() => onUpdatePreferences({ [activeKey]: null })}>
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OidcTabContent({
  oidcConfig,
  onSave,
  onReset,
  onSuccess,
  onError,
}: {
  oidcConfig: OidcAdminConfig | null;
  onSave: (config: OidcConfigSavePayload) => Promise<void>;
  onReset: () => Promise<void>;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const { t } = useTranslation();
  const isEnvSource = oidcConfig?.source === "env";

  const [issuerUrl, setIssuerUrl] = useState(oidcConfig?.issuerUrl ?? "");
  const [clientId, setClientId] = useState(oidcConfig?.source === "db" ? (oidcConfig.clientId ?? "") : "");
  const [clientSecret, setClientSecret] = useState("");
  const [providerName, setProviderName] = useState(oidcConfig?.source === "db" ? (oidcConfig.providerName ?? "") : "");
  const [scopes, setScopes] = useState(oidcConfig?.source === "db" ? (oidcConfig.scopes ?? "") : "");
  const [disablePasswordLogin, setDisablePasswordLogin] = useState(
    oidcConfig?.source === "db" ? oidcConfig.disablePasswordLogin : false,
  );
  const [redirectUri, setRedirectUri] = useState(oidcConfig?.source === "db" ? (oidcConfig.redirectUri ?? "") : "");
  const [postLoginRedirectUri, setPostLoginRedirectUri] = useState(
    oidcConfig?.source === "db" ? (oidcConfig.postLoginRedirectUri ?? "") : "",
  );
  const [usernameClaim, setUsernameClaim] = useState(
    oidcConfig?.source === "db" ? (oidcConfig.usernameClaim ?? "") : "",
  );
  const [groupsClaim, setGroupsClaim] = useState(oidcConfig?.source === "db" ? (oidcConfig.groupsClaim ?? "") : "");
  const [adminGroups, setAdminGroups] = useState(oidcConfig?.source === "db" ? (oidcConfig.adminGroups ?? "") : "");
  const [busy, setBusy] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({
        issuerUrl: issuerUrl.trim() || null,
        clientId: clientId.trim() || null,
        clientSecret: clientSecret || null,
        providerName: providerName.trim() || null,
        scopes: scopes.trim() || null,
        disablePasswordLogin,
        redirectUri: redirectUri.trim() || null,
        postLoginRedirectUri: postLoginRedirectUri.trim() || null,
        usernameClaim: usernameClaim.trim() || null,
        groupsClaim: groupsClaim.trim() || null,
        adminGroups: adminGroups.trim() || null,
      });
      onSuccess(t("oidc.saved"));
    } catch {
      onError(t("errors.save"));
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    setBusy(true);
    try {
      await onReset();
      setShowResetConfirm(false);
      onSuccess(t("oidc.cleared"));
    } catch {
      onError(t("errors.delete"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="json-panel">
      {oidcConfig?.source === "db" ? (
        <p className="json-summary">{t("oidc.sourceDb")}</p>
      ) : oidcConfig?.source === "env" ? (
        <p className="json-summary">{t("oidc.envReadOnly")}</p>
      ) : (
        <p className="json-summary">{t("oidc.sourceNone")}</p>
      )}

      {isEnvSource ? (
        <div className="personalization-section">
          <div className="personalization-row">
            <label className="personalization-label">{t("oidc.issuerUrl")}</label>
            <span className="json-summary">{oidcConfig?.issuerUrl ?? "—"}</span>
          </div>
          <div className="personalization-row">
            <label className="personalization-label">{t("oidc.clientId")}</label>
            <span className="json-summary">{oidcConfig?.clientId ?? "—"}</span>
          </div>
          <div className="personalization-row">
            <label className="personalization-label">{t("oidc.clientSecret")}</label>
            <span className="json-summary">{oidcConfig?.hasClientSecret ? "••••••••" : "—"}</span>
          </div>
          <div className="personalization-row">
            <label className="personalization-label">{t("oidc.providerName")}</label>
            <span className="json-summary">{oidcConfig?.providerName ?? "—"}</span>
          </div>
          <div className="personalization-row">
            <label className="personalization-label">{t("oidc.disablePasswordLogin")}</label>
            <span className="json-summary">{oidcConfig?.disablePasswordLogin ? "✓" : "✗"}</span>
          </div>
        </div>
      ) : null}

      <form className="personalization-section" onSubmit={(e) => void handleSave(e)}>
        <div className="personalization-row">
          <label className="personalization-label" htmlFor="oidc-issuer-url">{t("oidc.issuerUrl")} *</label>
          <input
            id="oidc-issuer-url"
            type="url"
            className="settings-input"
            value={issuerUrl}
            onChange={(e) => setIssuerUrl(e.target.value)}
            placeholder="https://id.example.com"
            disabled={busy}
          />
        </div>
        <div className="personalization-row">
          <label className="personalization-label" htmlFor="oidc-client-id">{t("oidc.clientId")} *</label>
          <input
            id="oidc-client-id"
            type="text"
            className="settings-input"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="personalization-row">
          <label className="personalization-label" htmlFor="oidc-client-secret">
            {t("oidc.clientSecret")}
            {oidcConfig?.source === "db" && oidcConfig.hasClientSecret ? " (•••)" : null}
          </label>
          <input
            id="oidc-client-secret"
            type="password"
            className="settings-input"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder={oidcConfig?.source === "db" && oidcConfig.hasClientSecret ? t("oidc.clientSecretPlaceholder") : ""}
            autoComplete="new-password"
            disabled={busy}
          />
        </div>
        <div className="personalization-row">
          <label className="personalization-label" htmlFor="oidc-provider-name">{t("oidc.providerName")}</label>
          <input
            id="oidc-provider-name"
            type="text"
            className="settings-input"
            value={providerName}
            onChange={(e) => setProviderName(e.target.value)}
            placeholder={t("oidc.providerNamePlaceholder")}
            disabled={busy}
          />
        </div>
        <div className="personalization-row">
          <label className="personalization-label" htmlFor="oidc-scopes">{t("oidc.scopes")}</label>
          <input
            id="oidc-scopes"
            type="text"
            className="settings-input"
            value={scopes}
            onChange={(e) => setScopes(e.target.value)}
            placeholder={t("oidc.scopesPlaceholder")}
            disabled={busy}
          />
        </div>
        <div className="personalization-row">
          <label className="personalization-label" htmlFor="oidc-username-claim">{t("oidc.usernameClaim")}</label>
          <input
            id="oidc-username-claim"
            type="text"
            className="settings-input"
            value={usernameClaim}
            onChange={(e) => setUsernameClaim(e.target.value)}
            placeholder={t("oidc.usernameClaimPlaceholder")}
            disabled={busy}
          />
        </div>
        <div className="personalization-row">
          <label className="personalization-label" htmlFor="oidc-groups-claim">{t("oidc.groupsClaim")}</label>
          <input
            id="oidc-groups-claim"
            type="text"
            className="settings-input"
            value={groupsClaim}
            onChange={(e) => setGroupsClaim(e.target.value)}
            placeholder={t("oidc.groupsClaimPlaceholder")}
            disabled={busy}
          />
        </div>
        <div className="personalization-row">
          <label className="personalization-label" htmlFor="oidc-admin-groups">{t("oidc.adminGroups")}</label>
          <input
            id="oidc-admin-groups"
            type="text"
            className="settings-input"
            value={adminGroups}
            onChange={(e) => setAdminGroups(e.target.value)}
            placeholder={t("oidc.adminGroupsPlaceholder")}
            disabled={busy}
          />
        </div>
        <div className="personalization-row">
          <label className="personalization-label" htmlFor="oidc-redirect-uri">{t("oidc.redirectUri")}</label>
          <input
            id="oidc-redirect-uri"
            type="url"
            className="settings-input"
            value={redirectUri}
            onChange={(e) => setRedirectUri(e.target.value)}
            placeholder="https://webapp.example.com/api/oidc/callback"
            disabled={busy}
          />
        </div>
        <div className="personalization-row">
          <label className="personalization-label" htmlFor="oidc-post-login-redirect-uri">{t("oidc.postLoginRedirectUri")}</label>
          <input
            id="oidc-post-login-redirect-uri"
            type="url"
            className="settings-input"
            value={postLoginRedirectUri}
            onChange={(e) => setPostLoginRedirectUri(e.target.value)}
            placeholder="https://webapp.example.com"
            disabled={busy}
          />
        </div>
        <div className="personalization-row">
          <label className="personalization-label" htmlFor="oidc-disable-password-login">{t("oidc.disablePasswordLogin")}</label>
          <input
            id="oidc-disable-password-login"
            type="checkbox"
            checked={disablePasswordLogin}
            onChange={(e) => setDisablePasswordLogin(e.target.checked)}
            disabled={busy}
          />
        </div>
        <div className="editor-actions">
          <button className="primary-button" type="submit" disabled={busy || !issuerUrl.trim() || !clientId.trim()}>
            {t("oidc.save")}
          </button>
          {oidcConfig?.source === "db" ? (
            showResetConfirm ? (
              <>
                <p className="form-error">{t("oidc.resetConfirm")}</p>
                <button className="danger-button" type="button" disabled={busy} onClick={() => void handleReset()}>
                  {t("common.confirm")}
                </button>
                <button className="secondary-button" type="button" onClick={() => setShowResetConfirm(false)}>
                  {t("common.cancel")}
                </button>
              </>
            ) : (
              <button className="secondary-button" type="button" onClick={() => setShowResetConfirm(true)}>
                {t("oidc.reset")}
              </button>
            )
          ) : null}
        </div>
      </form>
    </div>
  );
}

function AccountTabContent({
  userName,
  authProvider,
  onUpdateUsername,
  onUpdatePassword,
  onDeleteSelf,
  onLogout,
  onSuccess,
  onError,
}: {
  userName: string;
  authProvider: AuthProvider;
  onUpdateUsername: (newUsername: string) => Promise<void>;
  onUpdatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onDeleteSelf: () => Promise<void>;
  onLogout: () => Promise<void>;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const { t } = useTranslation();
  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdateUsername(newUsername.trim());
      setNewUsername("");
      onSuccess(t("toast.usernameUpdated"));
    } catch (err) {
      onError(err instanceof Error ? err.message : "errors.save");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdatePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      onSuccess(t("toast.passwordUpdated"));
    } catch (err) {
      onError(err instanceof Error ? err.message : "errors.save");
    }
  };

  return (
    <div className="json-panel settings-account-tab">
      <p className="json-summary">
        {t("auth.signedInAs")} <strong>{userName}</strong>
      </p>
      <p className="json-summary">
        {t("account.authProvider")}: <strong>{authProvider === "oidc" ? t("account.authProviderOidc") : t("account.authProviderLocal")}</strong>
      </p>
      <button className="danger-button settings-logout-button" type="button" onClick={() => void onLogout()}>
        {t("auth.signOut")}
      </button>

      <div className="personalization-section">
        <h3 className="personalization-title">{t("account.changeUsername")}</h3>
        <form className="account-form" onSubmit={(e) => void handleUpdateUsername(e)}>
          <input
            className="account-input"
            type="text"
            placeholder={t("account.newUsername")}
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            minLength={3}
            maxLength={32}
            required
          />
          <button className="primary-button account-form-btn" type="submit">{t("account.save")}</button>
        </form>
      </div>

      <div className="personalization-section">
        <h3 className="personalization-title">{t("account.changePassword")}</h3>
        {authProvider === "oidc" ? (
          <p className="account-provider-note">{t("account.passwordManagedByOidc")}</p>
        ) : (
          <form className="account-form" onSubmit={(e) => void handleUpdatePassword(e)}>
            <input
              className="account-input"
              type="password"
              placeholder={t("account.currentPassword")}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <input
              className="account-input"
              type="password"
              placeholder={t("account.newPassword")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
            <button className="primary-button account-form-btn" type="submit">{t("account.save")}</button>
          </form>
        )}
      </div>

      <div className="personalization-section">
        <h3 className="personalization-title">{t("account.deleteAccount")}</h3>
        <p className="account-delete-warning">{t("account.deleteConfirm")}</p>
        <button className="danger-button" type="button" onClick={() => void onDeleteSelf()}>
          {t("account.deleteAccount")}
        </button>
      </div>
    </div>
  );
}

export const SettingsModal = memo(function SettingsModal({
  open,
  busy,
  canManageApps,
  currentUserId,
  userName,
  authProvider,
  groups,
  users,
  apps,
  initialTab,
  initialJsonMode,
  jsonImportMode,
  setJsonImportMode,
  jsonValue,
  setJsonValue,
  jsonModalError,
  jsonModalInfo,
  jsonFileInputRef,
  onClose,
  onCreateGroup,
  onRenameGroup,
  onMoveGroup,
  onReorderGroups,
  onDeleteGroup,
  onCreateInvitation,
  onCopyInvitationLink,
  onChangeRole,
  onDeleteUser,
  onJsonFileChange,
  onCopyExport,
  onImport,
  onPrepareExport,
  onResetImport,
  onLogout,
  preferences,
  themeMode,
  dashboardIconsMetadata,
  onUpdatePreferences,
  onUpdateUsername,
  onUpdatePassword,
  onDeleteSelf,
  onAccountSuccess,
  onAccountError,
  onPreviewTheme,
  oidcConfig,
  onSaveOidcConfig,
  onResetOidcConfig,
}: {
  open: boolean;
  busy: boolean;
  canManageApps: boolean;
  currentUserId: number;
  userName: string;
  authProvider: AuthProvider;
  groups: GroupEntry[];
  users: UserEntry[];
  apps: WebAppEntry[];
  initialTab?: SettingsTab;
  initialJsonMode?: "import" | "export";
  jsonImportMode: JsonImportMode;
  setJsonImportMode: (mode: JsonImportMode) => void;
  jsonValue: string;
  setJsonValue: (value: string) => void;
  jsonModalError: string | null;
  jsonModalInfo: string | null;
  jsonFileInputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onCreateGroup: (name: string) => Promise<void>;
  onRenameGroup: (groupId: number, name: string) => Promise<void>;
  onMoveGroup: (groupId: number, direction: "up" | "down") => Promise<void>;
  onReorderGroups: (groupIds: number[]) => Promise<void>;
  onDeleteGroup: (groupId: number) => Promise<void>;
  onCreateInvitation: (role: "admin" | "viewer") => Promise<string>;
  onCopyInvitationLink: (inviteLink: string) => Promise<void>;
  onChangeRole: (userId: number, role: "admin" | "viewer") => Promise<void>;
  onDeleteUser: (userId: number) => Promise<void>;
  onJsonFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onCopyExport: () => Promise<void>;
  onImport: () => Promise<void>;
  onPrepareExport: () => void;
  onResetImport: () => void;
  onLogout: () => Promise<void>;
  preferences: UserPreferences;
  themeMode: ThemeMode;
  dashboardIconsMetadata: DashboardIconsMetadataMap;
  onUpdatePreferences: (patch: Partial<UserPreferences>) => void;
  onUpdateUsername: (newUsername: string) => Promise<void>;
  onUpdatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onDeleteSelf: () => Promise<void>;
  onAccountSuccess: (msg: string) => void;
  onAccountError: (msg: string) => void;
  onPreviewTheme: (mode: "light" | "dark") => void;
  oidcConfig: OidcAdminConfig | null;
  onSaveOidcConfig: (config: OidcConfigSavePayload) => Promise<void>;
  onResetOidcConfig: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>(canManageApps ? "groups" : "account");
  const [jsonMode, setJsonMode] = useState<"import" | "export">("import");

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab ?? (canManageApps ? "groups" : "account"));
      const nextJsonMode = initialJsonMode ?? "import";
      setJsonMode(nextJsonMode);
    }
  }, [open, canManageApps, initialTab, initialJsonMode]);

  const handleSwitchJsonMode = (mode: "import" | "export") => {
    setJsonMode(mode);
    if (mode === "export") {
      onPrepareExport();
    } else {
      onResetImport();
    }
  };

  const handleEditExport = () => {
    setJsonMode("import");
  };

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="editor-modal-overlay" onClick={onClose} role="presentation">
      <aside
        className="editor-modal settings-modal"
        onClick={(event) => event.stopPropagation()}
        aria-modal="true"
        role="dialog"
      >
        <div className="editor-header">
          <div>
            <p className="eyebrow">{t("settings.open")}</p>
            <h3>{t("settings.open")}</h3>
          </div>
          <button className="ghost-icon-button" type="button" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>

        <div className="settings-modal-tabs">
          {canManageApps ? (
            <button
              type="button"
              className={activeTab === "groups" ? "settings-modal-tab active" : "settings-modal-tab"}
              onClick={() => setActiveTab("groups")}
            >
              {t("modal.groups")}
            </button>
          ) : null}
          {canManageApps ? (
            <button
              type="button"
              className={activeTab === "users" ? "settings-modal-tab active" : "settings-modal-tab"}
              onClick={() => setActiveTab("users")}
            >
              {t("modal.users")}
            </button>
          ) : null}
          {canManageApps ? (
            <button
              type="button"
              className={activeTab === "json" ? "settings-modal-tab active" : "settings-modal-tab"}
              onClick={() => setActiveTab("json")}
            >
              JSON
            </button>
          ) : null}
          {canManageApps ? (
            <button
              type="button"
              className={activeTab === "oidc" ? "settings-modal-tab active" : "settings-modal-tab"}
              onClick={() => setActiveTab("oidc")}
            >
              {t("oidc.tab")}
            </button>
          ) : null}
          <button
            type="button"
            className={activeTab === "personalization" ? "settings-modal-tab active" : "settings-modal-tab"}
            onClick={() => setActiveTab("personalization")}
          >
            {t("settings.personalization")}
          </button>
          <button
            type="button"
            className={activeTab === "account" ? "settings-modal-tab active" : "settings-modal-tab"}
            onClick={() => setActiveTab("account")}
          >
            {t("settings.account")}
          </button>
          <button
            type="button"
            className={activeTab === "about" ? "settings-modal-tab active" : "settings-modal-tab"}
            onClick={() => setActiveTab("about")}
          >
            {t("settings.about")}
          </button>
        </div>

        <div className="settings-tab-content">
          {activeTab === "groups" ? (
            <GroupsTabContent
              busy={busy}
              groups={groups}
              onCreateGroup={onCreateGroup}
              onRenameGroup={onRenameGroup}
              onMoveGroup={onMoveGroup}
              onReorderGroups={onReorderGroups}
              onDeleteGroup={onDeleteGroup}
            />
          ) : null}
          {activeTab === "users" ? (
            <UsersTabContent
              busy={busy}
              currentUserId={currentUserId}
              users={users}
              onCreateInvitation={onCreateInvitation}
              onCopyInvitationLink={onCopyInvitationLink}
              onChangeRole={onChangeRole}
              onDeleteUser={onDeleteUser}
            />
          ) : null}
          {activeTab === "json" ? (
            <JsonTabContent
              apps={apps}
              busy={busy}
              jsonMode={jsonMode}
              onSwitchMode={handleSwitchJsonMode}
              jsonImportMode={jsonImportMode}
              setJsonImportMode={setJsonImportMode}
              jsonValue={jsonValue}
              setJsonValue={setJsonValue}
              jsonModalError={jsonModalError}
              jsonModalInfo={jsonModalInfo}
              jsonFileInputRef={jsonFileInputRef}
              onFileChange={onJsonFileChange}
              onCopyExport={onCopyExport}
              onImport={onImport}
              onEditExport={handleEditExport}
            />
          ) : null}
          {activeTab === "about" ? (
            <div className="json-panel settings-about-tab">
              <dl className="about-list">
                <div className="about-row">
                  <dt>{t("about.version")}</dt>
                  <dd>v{__APP_VERSION__}</dd>
                </div>
                <div className="about-row">
                  <dt>{t("about.buildDate")}</dt>
                  <dd>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(__BUILD_DATE__))}</dd>
                </div>
                <div className="about-row">
                  <dt>{t("about.sourceCode")}</dt>
                  <dd>Self-hosted deployment</dd>
                </div>
                <div className="about-row">
                  <dt>{t("about.techStack")}</dt>
                  <dd>React · TypeScript · Vite · Fastify · SQLite</dd>
                </div>
              </dl>
            </div>
          ) : null}
          {activeTab === "personalization" ? (
            <PersonalizationTabContent
              apps={apps}
              preferences={preferences}
              themeMode={themeMode}
              dashboardIconsMetadata={dashboardIconsMetadata}
              onUpdatePreferences={onUpdatePreferences}
              onPreviewTheme={onPreviewTheme}
            />
          ) : null}
          {activeTab === "oidc" ? (
            <OidcTabContent
              oidcConfig={oidcConfig}
              onSave={onSaveOidcConfig}
              onReset={onResetOidcConfig}
              onSuccess={onAccountSuccess}
              onError={onAccountError}
            />
          ) : null}
          {activeTab === "account" ? (
            <AccountTabContent
              userName={userName}
              authProvider={authProvider}
              onUpdateUsername={onUpdateUsername}
              onUpdatePassword={onUpdatePassword}
              onDeleteSelf={onDeleteSelf}
              onLogout={onLogout}
              onSuccess={onAccountSuccess}
              onError={onAccountError}
            />
          ) : null}
        </div>
      </aside>
    </div>
  );
});
