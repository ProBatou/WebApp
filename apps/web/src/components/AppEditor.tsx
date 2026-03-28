import type { Dispatch, FormEvent, SetStateAction } from "react";
import { AppIcon, DashboardIconPreviewImage, getPreviewVariants } from "./AppIcon";
import {
  formatDashboardIconLabel,
  getEffectivePreviewVariants,
  getFallbackIconLabel,
  isDashboardIconSlug,
} from "../lib/app-utils";
import { useTranslation } from "../lib/i18n";
import type {
  AppEditorState,
  AppMode,
  DashboardIconsMetadataMap,
  EditorMode,
  GroupEntry,
  ThemeMode,
} from "../types";

export function AppEditor({
  open,
  busy,
  editorMode,
  editorState,
  inheritedAccent,
  setEditorState,
  iconQuery,
  setIconQuery,
  setDebouncedIconQuery,
  iconSelectionLocked,
  setIconSelectionLocked,
  dashboardIconsMetadata,
  dashboardIconsLoading,
  dashboardIconsError,
  filteredDashboardIcons,
  groups,
  themeMode,
  onClose,
  onSubmit,
  onReset,
  onDelete,
}: {
  open: boolean;
  busy: boolean;
  editorMode: EditorMode;
  editorState: AppEditorState;
  inheritedAccent: string;
  setEditorState: Dispatch<SetStateAction<AppEditorState>>;
  iconQuery: string;
  setIconQuery: (value: string) => void;
  setDebouncedIconQuery: (value: string) => void;
  iconSelectionLocked: boolean;
  setIconSelectionLocked: (value: boolean) => void;
  dashboardIconsMetadata: DashboardIconsMetadataMap;
  dashboardIconsLoading: boolean;
  dashboardIconsError: string | null;
  filteredDashboardIcons: string[];
  groups: GroupEntry[];
  themeMode: ThemeMode;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>, resolvedIcon: string) => Promise<void>;
  onReset: () => void;
  onDelete: () => Promise<void>;
}) {
  const { t } = useTranslation();

  if (!open) {
    return null;
  }

  const selectedIconPreviewVariants = isDashboardIconSlug(editorState.icon)
    ? getPreviewVariants(editorState.icon, dashboardIconsMetadata)
    : null;
  const effectiveSelectedIconPreviewVariants = selectedIconPreviewVariants
    ? getEffectivePreviewVariants(selectedIconPreviewVariants, editorState.iconVariantInverted)
    : null;
  const previewAccent = editorMode === "create" ? inheritedAccent : editorState.accent;

  return (
    <div className="editor-modal-overlay" onClick={onClose} role="presentation">
      <aside className="editor-modal app-editor-modal" onClick={(event) => event.stopPropagation()} aria-modal="true" role="dialog">
        <div className="editor-header">
          <div>
            <p className="eyebrow">{t("modal.admin")}</p>
            <h3>{editorMode === "create" ? t("app.new") : t("app.edit")}</h3>
          </div>
          <button className="ghost-icon-button" type="button" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>

        <form
          className="editor-form"
          onSubmit={(event) => void onSubmit(event, editorState.icon.trim() || getFallbackIconLabel(editorState.name, editorState.icon))}
        >
          <label>
            <span>{t("app.name")}</span>
            <input
              type="text"
              value={editorState.name}
              onChange={(event) => setEditorState((current) => ({ ...current, name: event.target.value }))}
              minLength={2}
              maxLength={64}
              required
            />
          </label>
          <label>
            <span>{t("app.url")}</span>
            <input
              type="url"
              value={editorState.url}
              onChange={(event) => setEditorState((current) => ({ ...current, url: event.target.value }))}
              required
            />
          </label>
          <div className="editor-logo-row">
            <label>
              <span>{t("app.icon")}</span>
              <input
                type="text"
                value={iconQuery}
                onChange={(event) => {
                  setIconSelectionLocked(false);
                  setIconQuery(event.target.value.toLowerCase());
                }}
                placeholder={t("app.searchDashboardIcons")}
                autoComplete="off"
              />
              <div className="editor-field-note">
                <a href="https://dashboardicons.com/icons" target="_blank" rel="noreferrer">
                  {t("app.openCatalog")}
                </a>
                </div>
              </label>
          </div>
          <div className="icon-search-panel">
            {dashboardIconsError ? <p className="form-error">{t(dashboardIconsError)}</p> : null}

            {!dashboardIconsLoading && filteredDashboardIcons.length > 0 ? (
              <div className="icon-search-results">
                {filteredDashboardIcons.map((icon) => {
                  const previewVariants = getPreviewVariants(icon, dashboardIconsMetadata);

                  return (
                    <button
                      key={icon}
                      type="button"
                      className={editorState.icon === icon ? "icon-search-item active" : "icon-search-item"}
                      onClick={() => {
                        setIconSelectionLocked(true);
                        setEditorState((current) => ({ ...current, icon }));
                        setIconQuery(icon);
                        setDebouncedIconQuery(icon);
                      }}
                    >
                      <span className="icon-search-preview-stack">
                        <span className="icon-search-preview icon-search-preview-light" title={t("app.lightBackground")}>
                          <DashboardIconPreviewImage icon={previewVariants.lightBackgroundIcon} fallbackIcon={previewVariants.baseIcon} />
                        </span>
                        <span className="icon-search-preview icon-search-preview-dark" title={t("app.darkBackground")}>
                          <DashboardIconPreviewImage icon={previewVariants.darkBackgroundIcon} fallbackIcon={previewVariants.baseIcon} />
                        </span>
                      </span>
                      <span className="icon-search-copy">
                        <strong>{formatDashboardIconLabel(icon)}</strong>
                        <small>{icon}</small>
                      </span>
                      {previewVariants.hasVariants ? <span className="icon-variant-badge">{t("app.lightDark")}</span> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          <label>
            <span>{t("app.openMode")}</span>
            <select
              value={editorState.openMode}
              onChange={(event) => setEditorState((current) => ({ ...current, openMode: event.target.value as AppMode }))}
            >
              <option value="iframe">{t("app.openMode.embeddedIframe")}</option>
              <option value="external">{t("app.openMode.newTab")}</option>
            </select>
          </label>
          <label>
            <span>{t("app.visibility")}</span>
            <select
              value={editorState.isShared ? "shared" : "private"}
              onChange={(event) =>
                setEditorState((current) => ({
                  ...current,
                  isShared: event.target.value === "shared",
                }))
              }
            >
              <option value="shared">{t("app.visibility.shared")}</option>
              <option value="private">{t("app.visibility.private")}</option>
            </select>
          </label>
          <label>
            <span>{t("app.group")}</span>
            <select
              value={editorState.groupId ?? ""}
              onChange={(event) =>
                setEditorState((current) => ({
                  ...current,
                  groupId: event.target.value ? Number(event.target.value) : null,
                }))
              }
            >
              <option value="">{t("app.noGroup")}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>

          <div className="preview-card">
            {!selectedIconPreviewVariants ? (
              <AppIcon
                icon={editorState.icon}
                name={editorState.name}
                url={editorState.url}
                accent={previewAccent}
                themeMode={themeMode}
                dashboardIconsMetadata={dashboardIconsMetadata}
                iconVariantMode={editorState.iconVariantMode}
                iconVariantInverted={editorState.iconVariantInverted}
              />
            ) : null}
            <div className="preview-card-content">
              <div className="preview-card-top">
                <div className="preview-card-copy">
                  <strong>{editorState.name || t("app.nameFallback")}</strong>
                </div>
                {editorState.icon ? (
                  <div className="preview-card-actions">
                    {effectiveSelectedIconPreviewVariants ? (
                      <button
                        className={editorState.iconVariantInverted ? "secondary-button icon-invert-button active" : "secondary-button icon-invert-button"}
                        type="button"
                        onClick={() => {
                          setEditorState((current) => ({
                            ...current,
                            iconVariantInverted: !current.iconVariantInverted,
                            iconVariantMode: current.iconVariantMode === "base" ? "auto" : current.iconVariantMode,
                          }));
                        }}
                      >
                        {editorState.iconVariantInverted ? t("app.normal") : t("app.inverted")}
                      </button>
                    ) : null}
                    <button
                      className="secondary-button icon-reset-button"
                      type="button"
                      onClick={() => {
                        setEditorState((current) => ({ ...current, icon: "" }));
                        setIconQuery("");
                        setDebouncedIconQuery("");
                        setIconSelectionLocked(false);
                      }}
                    >
                      {t("app.removeIcon")}
                    </button>
                  </div>
                ) : null}
              </div>
              {effectiveSelectedIconPreviewVariants ? (
                <div className="selected-icon-variants-grid preview-variants-grid">
                  <div className={themeMode === "light" ? "selected-icon-variant-card active" : "selected-icon-variant-card"}>
                    <span className="selected-icon-variant-preview icon-search-preview-light">
                      <DashboardIconPreviewImage
                        icon={effectiveSelectedIconPreviewVariants.lightBackgroundIcon}
                        fallbackIcon={effectiveSelectedIconPreviewVariants.baseIcon}
                      />
                    </span>
                    <div>
                      <strong>{t("app.lightBackground")}</strong>
                    </div>
                  </div>
                  <div className={themeMode === "dark" ? "selected-icon-variant-card active" : "selected-icon-variant-card"}>
                    <span className="selected-icon-variant-preview icon-search-preview-dark">
                      <DashboardIconPreviewImage
                        icon={effectiveSelectedIconPreviewVariants.darkBackgroundIcon}
                        fallbackIcon={effectiveSelectedIconPreviewVariants.baseIcon}
                      />
                    </span>
                    <div>
                      <strong>{t("app.darkBackground")}</strong>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="editor-actions">
            <button className="primary-button" type="submit" disabled={busy}>
              {editorMode === "create" ? t("common.add") : t("common.save")}
            </button>
            <button className="secondary-button" type="button" onClick={onReset}>
              {t("common.reset")}
            </button>
            {editorMode === "edit" ? (
              <button className="danger-button" type="button" onClick={() => void onDelete()} disabled={busy}>
                {t("common.delete")}
              </button>
            ) : null}
          </div>
        </form>
      </aside>
    </div>
  );
}
