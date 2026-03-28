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
import { Dropdown } from "./Dropdown";
import type { GroupEntry, UserEntry } from "../types";
import { useTranslation } from "../lib/i18n";

type SettingsTab = "groups" | "users" | "json" | "account";

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
            <button
              className="danger-button"
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

export function SettingsModal({
  open,
  busy,
  canManageApps,
  currentUserId,
  userName,
  groups,
  users,
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
  onOpenJsonImport,
  onOpenJsonExport,
  onLogout,
}: {
  open: boolean;
  busy: boolean;
  canManageApps: boolean;
  currentUserId: number;
  userName: string;
  groups: GroupEntry[];
  users: UserEntry[];
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
  onOpenJsonImport: () => void;
  onOpenJsonExport: () => void;
  onLogout: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>(canManageApps ? "groups" : "account");

  useEffect(() => {
    if (open) {
      setActiveTab(canManageApps ? "groups" : "account");
    }
  }, [open, canManageApps]);

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
          <button
            type="button"
            className={activeTab === "account" ? "settings-modal-tab active" : "settings-modal-tab"}
            onClick={() => setActiveTab("account")}
          >
            {t("settings.account")}
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
            <div className="json-panel settings-json-tab">
              <div className="settings-json-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenJsonImport();
                  }}
                >
                  {t("modal.importApps")}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenJsonExport();
                  }}
                >
                  {t("modal.exportApps")}
                </button>
              </div>
            </div>
          ) : null}
          {activeTab === "account" ? (
            <div className="json-panel settings-account-tab">
              <p className="json-summary">
                {t("auth.signedInAs")} <strong>{userName}</strong>
              </p>
              <button
                className="danger-button settings-logout-button"
                type="button"
                onClick={() => void onLogout()}
              >
                {t("auth.signOut")}
              </button>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
