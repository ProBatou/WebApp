import { useRef, type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { AppIcon, DashboardIconPreviewImage, getPreviewVariants } from "./AppIcon";
import { Dropdown } from "./Dropdown";
import {
  formatDashboardIconLabel,
  getEffectivePreviewVariants,
  getFallbackIconLabel,
  isCustomIconUrl,
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
  const customIconFileInputRef = useRef<HTMLInputElement | null>(null);
  const openModeItems = [
    { label: t("app.openMode.embedded"), value: "iframe", active: editorState.openMode === "iframe" },
    { label: t("app.openMode.newTab"), value: "external", active: editorState.openMode === "external" },
  ];
  const visibilityItems = [
    { label: t("app.visibility.shared"), value: "shared", active: editorState.isShared },
    { label: t("app.visibility.private"), value: "private", active: !editorState.isShared },
  ];
  const groupItems = [
    { label: t("app.noGroup"), value: "", active: editorState.groupId == null },
    ...groups.map((group) => ({
      label: group.name,
      value: String(group.id),
      active: editorState.groupId === group.id,
    })),
  ];

  if (!open) {
    return null;
  }

  const customIconUrl = isCustomIconUrl(editorState.icon) ? editorState.icon : "";
  const selectedIconPreviewVariants = isDashboardIconSlug(editorState.icon)
    ? getPreviewVariants(editorState.icon, dashboardIconsMetadata)
    : null;
  const effectiveSelectedIconPreviewVariants = selectedIconPreviewVariants
    ? getEffectivePreviewVariants(selectedIconPreviewVariants, editorState.iconVariantInverted)
    : null;
  const previewAccent = editorMode === "create" ? inheritedAccent : editorState.accent;
  const previewName = editorState.name || t("app.nameFallback");
  const hasPreviewActions = Boolean(editorState.icon);
  const handleCustomIconFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        return;
      }

      setEditorState((current) => ({ ...current, icon: result }));
      setIconQuery("");
      setDebouncedIconQuery("");
      setIconSelectionLocked(false);
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  };

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
          <div className="app-editor-layout">
            <div className="app-editor-main-column">
              <div className="app-editor-section app-editor-basics">
                <div className="app-editor-section-header">
                  <p className="eyebrow">{t("common.save")}</p>
                </div>
                <div className="app-editor-fields-grid">
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
                  <div className="app-editor-field">
                    <span>{t("app.openMode")}</span>
                    <Dropdown
                      trigger={openModeItems.find((item) => item.active)?.label ?? t("app.openMode.embedded")}
                      items={openModeItems}
                      onSelect={(value) => setEditorState((current) => ({ ...current, openMode: value as AppMode }))}
                      className="secondary-button app-editor-dropdown"
                    />
                  </div>
                  <div className="app-editor-field">
                    <span>{t("app.visibility")}</span>
                    <Dropdown
                      trigger={visibilityItems.find((item) => item.active)?.label ?? t("app.visibility.shared")}
                      items={visibilityItems}
                      onSelect={(value) =>
                        setEditorState((current) => ({
                          ...current,
                          isShared: value === "shared",
                        }))
                      }
                      className="secondary-button app-editor-dropdown"
                    />
                  </div>
                  <div className="app-editor-field app-editor-group-field">
                    <span>{t("app.group")}</span>
                    <Dropdown
                      trigger={groupItems.find((item) => item.active)?.label ?? t("app.noGroup")}
                      items={groupItems}
                      onSelect={(value) =>
                        setEditorState((current) => ({
                          ...current,
                          groupId: value ? Number(value) : null,
                        }))
                      }
                      className="secondary-button app-editor-dropdown"
                    />
                  </div>
                </div>
              </div>

              <div className="app-editor-section app-editor-icon-section">
                <div className="app-editor-section-header app-editor-section-header-row">
                  <div>
                    <p className="eyebrow">{t("app.iconCatalog")}</p>
                  </div>
                  <a className="app-editor-catalog-link" href="https://dashboardicons.com/icons" target="_blank" rel="noreferrer">
                    {t("app.openCatalog")}
                  </a>
                </div>
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
                      <span>{iconSelectionLocked ? editorState.icon : t("app.searchDashboardIcons")}</span>
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
              </div>
            </div>

            <div className="app-editor-preview-column">
              <div className="app-editor-section app-editor-preview-shell">
                <div className="app-editor-section-header">
                  <p className="eyebrow">{t("app.preview")}</p>
                  <p className="app-editor-section-copy">{t("app.previewHelp")}</p>
                </div>
                <div className={effectiveSelectedIconPreviewVariants ? "preview-card preview-card-with-variants" : "preview-card preview-card-simple"}>
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
                  <div className={hasPreviewActions ? "preview-card-content preview-card-content-with-actions" : "preview-card-content preview-card-content-simple"}>
                    <div className="preview-card-top">
                      <div className="preview-card-copy">
                        <strong>
                          <span className="preview-card-title">{previewName}</span>
                          <span
                            className="app-status-dot unknown"
                            aria-label={t("status.appUnknown")}
                            title={t("status.unknown")}
                          />
                        </strong>
                      </div>
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
              </div>

              <div className="app-editor-section app-editor-custom-icon-section">
                <div className="app-editor-section-header">
                  <p className="eyebrow">{t("app.iconCustom")}</p>
                  <p className="app-editor-section-copy">{t("app.iconCustomCompactHelp")}</p>
                </div>
                <div className="app-editor-custom-icon-grid">
                  <label className="app-editor-custom-icon-row">
                    <span>{t("app.url")}</span>
                    <input
                      type="url"
                      value={customIconUrl}
                      placeholder="https://..."
                      onChange={(event) => {
                        const nextValue = event.target.value.trim();
                        setEditorState((current) => ({ ...current, icon: nextValue }));
                        setIconQuery("");
                        setDebouncedIconQuery("");
                        setIconSelectionLocked(false);
                      }}
                    />
                  </label>
                  <div className="app-editor-field app-editor-upload-field">
                    <span>{t("app.fileLabel")}</span>
                    <input
                      ref={customIconFileInputRef}
                      className="app-editor-file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleCustomIconFileChange}
                    />
                    <button
                      className="secondary-button app-editor-upload-button"
                      type="button"
                      onClick={() => customIconFileInputRef.current?.click()}
                    >
                      {t("app.importIconFile")}
                    </button>
                  </div>
                </div>
              </div>
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
