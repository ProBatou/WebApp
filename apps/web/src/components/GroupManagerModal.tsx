import { useEffect, useMemo, useState } from "react";
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
import type { GroupEntry } from "../types";
import { useTranslation } from "../lib/i18n";

function SortableGroupItem({
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
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
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
          <strong>{group.name}</strong>
          <div className="group-item-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => void onMoveGroup(group.id, "up")}
              disabled={busy || groups[0]?.id === group.id}
              title={t("common.moveUp")}
              aria-label={t("common.moveUp")}
            >
              ↑
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => void onMoveGroup(group.id, "down")}
              disabled={busy || groups[groups.length - 1]?.id === group.id}
              title={t("common.moveDown")}
              aria-label={t("common.moveDown")}
            >
              ↓
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setEditingGroupId(group.id);
                setEditingGroupName(group.name);
              }}
            >
              {t("common.rename")}
            </button>
            <button className="danger-button" type="button" onClick={() => void onDeleteGroup(group.id)} disabled={busy}>
              {t("common.delete")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function GroupManagerModal({
  open,
  busy,
  groups,
  onClose,
  onCreateGroup,
  onRenameGroup,
  onMoveGroup,
  onReorderGroups,
  onDeleteGroup,
}: {
  open: boolean;
  busy: boolean;
  groups: GroupEntry[];
  onClose: () => void;
  onCreateGroup: (name: string) => Promise<void>;
  onRenameGroup: (groupId: number, name: string) => Promise<void>;
  onMoveGroup: (groupId: number, direction: "up" | "down") => Promise<void>;
  onReorderGroups: (groupIds: number[]) => Promise<void>;
  onDeleteGroup: (groupId: number) => Promise<void>;
}) {
  const { t } = useTranslation();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const groupIds = useMemo(() => groups.map((group) => group.id), [groups]);

  useEffect(() => {
    if (!open) {
      return;
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const activeIndex = groups.findIndex((group) => group.id === Number(active.id));
    const overIndex = groups.findIndex((group) => group.id === Number(over.id));
    if (activeIndex === -1 || overIndex === -1) {
      return;
    }

    const nextGroups = arrayMove(groups, activeIndex, overIndex);
    void onReorderGroups(nextGroups.map((group) => group.id));
  };

  return (
    <div className="editor-modal-overlay" onClick={onClose} role="presentation">
      <aside className="editor-modal group-modal" onClick={(event) => event.stopPropagation()} aria-modal="true" role="dialog">
        <div className="editor-header">
          <div>
            <p className="eyebrow">{t("modal.organization")}</p>
            <h3>{t("modal.groups")}</h3>
          </div>
          <button className="ghost-icon-button" type="button" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>

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
                  <SortableGroupItem
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
      </aside>
    </div>
  );
}
