import type { ChangeEvent, RefObject } from "react";
import { jsonImportExample } from "../lib/app-utils";
import type { JsonImportMode, JsonModalMode, WebAppEntry } from "../types";

export function JsonModal({
  open,
  mode,
  apps,
  busy,
  jsonImportMode,
  setJsonImportMode,
  jsonValue,
  setJsonValue,
  jsonModalError,
  jsonModalInfo,
  jsonFileInputRef,
  onClose,
  onFileChange,
  onOpenExport,
  onCopyExport,
  onImport,
}: {
  open: boolean;
  mode: JsonModalMode;
  apps: WebAppEntry[];
  busy: boolean;
  jsonImportMode: JsonImportMode;
  setJsonImportMode: (mode: JsonImportMode) => void;
  jsonValue: string;
  setJsonValue: (value: string) => void;
  jsonModalError: string | null;
  jsonModalInfo: string | null;
  jsonFileInputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onOpenExport: () => void;
  onCopyExport: () => Promise<void>;
  onImport: () => Promise<void>;
}) {
  if (!open || !mode) {
    return null;
  }

  return (
    <div className="editor-modal-overlay" onClick={onClose} role="presentation">
      <aside className="editor-modal json-modal" onClick={(event) => event.stopPropagation()} aria-modal="true" role="dialog">
        <div className="editor-header">
          <div>
            <p className="eyebrow">Administration</p>
            <h3>{mode === "import" ? "Importer des apps" : "Exporter les apps"}</h3>
          </div>
        </div>

        <div className="json-panel">
          {mode === "import" ? (
            <div className="json-toolbar">
              <div className="json-segmented" role="tablist" aria-label="Mode d'import">
                <button
                  className={jsonImportMode === "merge" ? "icon-variant-option active" : "icon-variant-option"}
                  type="button"
                  onClick={() => setJsonImportMode("merge")}
                >
                  Fusionner
                </button>
                <button
                  className={jsonImportMode === "replace" ? "icon-variant-option active" : "icon-variant-option"}
                  type="button"
                  onClick={() => setJsonImportMode("replace")}
                >
                  Remplacer
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
                  Charger un fichier
                </button>
                <button className="secondary-button" type="button" onClick={onOpenExport}>
                  Exporter
                </button>
                <button className="ghost-icon-button" type="button" onClick={() => setJsonValue(jsonImportExample)} title="Exemple JSON">
                  Exemple
                </button>
              </div>
            </div>
          ) : (
            <div className="json-toolbar export-toolbar">
              <p className="json-summary">{apps.length} application{apps.length > 1 ? "s" : ""} dans l'ordre actuel.</p>
              <div className="json-toolbar-actions">
                <button className="secondary-button" type="button" onClick={() => void onCopyExport()}>
                  Copier
                </button>
              </div>
            </div>
          )}

          {jsonModalError ? <p className="form-error">{jsonModalError}</p> : null}
          {jsonModalInfo ? <p className="json-summary">{jsonModalInfo}</p> : null}

          <label>
            <span>{mode === "import" ? "JSON" : "JSON exporte"}</span>
            <textarea
              className="json-textarea"
              value={jsonValue}
              onChange={(event) => setJsonValue(event.target.value)}
              placeholder={mode === "import" ? jsonImportExample : "[]"}
              readOnly={mode === "export"}
              spellCheck={false}
            />
          </label>

          <div className="editor-actions">
            {mode === "import" ? (
              <button className="primary-button" type="button" onClick={() => void onImport()} disabled={busy}>
                Importer
              </button>
            ) : (
              <button className="primary-button" type="button" onClick={() => void onCopyExport()}>
                Copier le JSON
              </button>
            )}
            <button className="secondary-button json-close-action" type="button" onClick={onClose}>
              Fermer
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
