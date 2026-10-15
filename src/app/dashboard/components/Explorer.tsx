"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type DragEvent } from "react";

import Icon from "@/components/Icon";
import Toast from "@/components/Toast";
import NewFolderButton from "./NewFolderButton";
import NewWorkButton from "./NewWorkButton";

type Work = {
  id: string;
  title: string;
};

type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  isSystem: boolean;
  children: Folder[];
  works: Work[];
};

type ExplorerProps = {
  folders: Folder[];
  selectedFolderId?: string;
  selectedWorkId?: string;
};

type WorkClipboard = {
  id: string;
  title: string;
  mode: "cut" | "copy";
  sourceFolderId: string;
};

function FolderItem({
  folder,
  level,
  selectedFolderId,
  selectedWorkId,
  allowNewFolder = false,
  clipboard,
  onClipboardChange,
  onPaste,
  onMoveWork,
  isBusy,
  openWorkMenuId,
  onWorkMenuChange,
}: {
  folder: Folder;
  level: number;
  selectedFolderId?: string;
  selectedWorkId?: string;
  allowNewFolder?: boolean;
  clipboard: WorkClipboard | null;
  onClipboardChange: (work: WorkClipboard | null) => void;
  onPaste: (folderId: string) => void;
  onMoveWork: (
    workId: string,
    folderId: string,
    sourceFolderId?: string,
  ) => void;
  isBusy: boolean;
  openWorkMenuId: string | null;
  onWorkMenuChange: (workId: string | null) => void;
}) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);

  const hasChildren = folder.children.length > 0 || folder.works.length > 0;

  const isSelected = selectedFolderId === folder.id;

  function handleFolderClick() {
    if (hasChildren) {
      setIsOpen((value) => !value);
    }
  }

  function handleFolderDoubleClick() {
    router.push(`/dashboard?folder=${encodeURIComponent(folder.id)}`);
  }

  function handleFolderDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const workId = event.dataTransfer.getData("application/x-benglish-work");
    const sourceFolderId = event.dataTransfer.getData(
      "application/x-benglish-source-folder",
    );

    if (workId) {
      onMoveWork(workId, folder.id, sourceFolderId);
    }
  }

  return (
    <div>
      {/* Folder */}
      <div
        className={`group flex items-center ${
          isSelected ? "brand-workspace-active" : "hover:bg-zinc-900"
        } ${isDropTarget ? "bg-sky-900/40 outline outline-1 outline-sky-500/50" : ""}`}
        style={{
          paddingLeft: `${12 + level * 16}px`,
        }}
        onDoubleClick={handleFolderDoubleClick}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDropTarget(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDropTarget(false)}
        onDrop={(event) => {
          setIsDropTarget(false);
          handleFolderDrop(event);
        }}
      >
        {/* Expand / collapse */}
        <button
          type="button"
          onClick={handleFolderClick}
          className="flex h-7 w-5 shrink-0 items-center justify-center text-xs text-zinc-500"
          aria-label={isOpen ? "Collapse folder" : "Expand folder"}
        >
          {hasChildren && (
            <Icon
              name={isOpen ? "chevronDown" : "chevronRight"}
              className="h-3.5 w-3.5"
            />
          )}
        </button>

        {/* Folder name */}
        <button
          type="button"
          onClick={handleFolderClick}
          onDoubleClick={handleFolderDoubleClick}
          className={`flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left text-sm ${
            isSelected ? "text-sky-200" : "text-zinc-300"
          }`}
        >
          <Icon
            name={isOpen && hasChildren ? "folderOpen" : "folder"}
            className={`h-4 w-4 shrink-0 ${
              isSelected ? "text-sky-300" : ""
            }`}
          />

          <span className="truncate">{folder.name}</span>
        </button>

        {/* Actions */}
        <div className="flex items-center pr-2">
          {clipboard && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(true);
                onPaste(folder.id);
              }}
              disabled={isBusy}
              className="rounded px-1.5 py-1 text-[10px] text-sky-300 transition hover:bg-zinc-800 disabled:opacity-50"
              title={`Paste ${clipboard.title} here`}
            >
              Paste
            </button>
          )}

          {folder.name !== "Others" && (
            <NewWorkButton
              folders={[{ id: folder.id, name: folder.name }]}
              defaultFolderId={folder.id}
              compact
            />
          )}

          {/* Only Others and its descendants can create folders */}
          {allowNewFolder && <NewFolderButton parentId={folder.id} />}
        </div>
      </div>

      {/* Contents */}
      {isOpen && (
        <div>
          {/* Child folders */}
          {folder.children.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              selectedWorkId={selectedWorkId}
              allowNewFolder
              clipboard={clipboard}
              onClipboardChange={onClipboardChange}
              onPaste={onPaste}
              onMoveWork={onMoveWork}
              isBusy={isBusy}
              openWorkMenuId={openWorkMenuId}
              onWorkMenuChange={onWorkMenuChange}
            />
          ))}

          {/* Works */}
          {folder.works.map((work) => {
            const isWorkSelected = selectedWorkId === work.id;
            const isCut = clipboard?.mode === "cut" && clipboard.id === work.id;

            return (
              <div
                key={work.id}
                className={`group relative flex items-center pr-2 text-sm ${
                  isWorkSelected ? "brand-workspace-active" : "hover:bg-zinc-900"
                } ${isCut ? "opacity-50" : ""}`}
                style={{
                  paddingLeft: `${44 + level * 16}px`,
                }}
              >
                <Link
                  href={`/work/${work.id}`}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData(
                      "application/x-benglish-work",
                      work.id,
                    );
                    event.dataTransfer.setData(
                      "application/x-benglish-source-folder",
                      folder.id,
                    );
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  className={`flex min-w-0 flex-1 items-center gap-2 py-1.5 ${
                    isWorkSelected
                      ? "text-sky-200"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Icon name="fileText" className="h-3.5 w-3.5 shrink-0" />

                  <span className="truncate">{work.title}</span>
                </Link>

                <button
                  type="button"
                  onClick={() =>
                    onWorkMenuChange(
                      openWorkMenuId === work.id ? null : work.id,
                    )
                  }
                  aria-label={`Actions for ${work.title}`}
                  aria-expanded={openWorkMenuId === work.id}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-500 opacity-0 transition hover:bg-zinc-800 hover:text-white focus:opacity-100 group-hover:opacity-100"
                >
                  <Icon name="moreHorizontal" className="h-4 w-4" />
                </button>

                {openWorkMenuId === work.id && (
                  <div className="absolute right-2 top-7 z-20 w-32 rounded-md border border-zinc-700 bg-zinc-900 p-1 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        onClipboardChange({
                          id: work.id,
                          title: work.title,
                          mode: "cut",
                          sourceFolderId: folder.id,
                        });
                        onWorkMenuChange(null);
                      }}
                      className="block w-full rounded px-2 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800"
                    >
                      Cut
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClipboardChange({
                          id: work.id,
                          title: work.title,
                          mode: "copy",
                          sourceFolderId: folder.id,
                        });
                        onWorkMenuChange(null);
                      }}
                      className="block w-full rounded px-2 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800"
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Explorer({
  folders,
  selectedFolderId,
  selectedWorkId,
}: ExplorerProps) {
  const router = useRouter();
  const [clipboard, setClipboard] = useState<WorkClipboard | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [openWorkMenuId, setOpenWorkMenuId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const rootFolders = folders.filter((folder) => folder.parentId === null);

  async function updateWorkFolder(
    workId: string,
    folderId: string,
    sourceFolderId?: string,
  ) {
    if (isBusy) return;
    if (sourceFolderId === folderId) return;

    try {
      setIsBusy(true);
      const response = await fetch(`/api/works/${workId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to move work");
      }

      setClipboard((current) => (current?.id === workId ? null : current));
      router.refresh();
    } catch (error) {
      console.error("Failed to move work:", error);
      setToastMessage(
        error instanceof Error ? error.message : "Failed to move work.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function pasteWork(folderId: string) {
    if (!clipboard || isBusy) return;

    const currentClipboard = clipboard;

    if (currentClipboard.mode === "cut") {
      if (currentClipboard.sourceFolderId === folderId) {
        setClipboard(null);
        return;
      }

      await updateWorkFolder(currentClipboard.id, folderId);
      return;
    }

    try {
      setIsBusy(true);
      const response = await fetch(
        `/api/works/${currentClipboard.id}/copy`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to copy work");
      }

      router.refresh();
    } catch (error) {
      console.error("Failed to copy work:", error);
      setToastMessage(
        error instanceof Error ? error.message : "Failed to copy work.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Explorer header */}
      <div className="flex h-10 items-center justify-between border-b border-zinc-800 px-4">
        <span className="text-xs font-semibold tracking-wide text-zinc-400">
          EXPLORER
        </span>

        {clipboard && (
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[10px] text-zinc-500">
              {clipboard.mode === "cut" ? "Cut" : "Copied"}: {clipboard.title}
            </span>
            <button
              type="button"
              onClick={() => setClipboard(null)}
              aria-label="Clear clipboard"
              className="text-zinc-500 hover:text-white"
            >
              <Icon name="close" className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* All Works */}
      <div className="border-b border-zinc-900 py-2">
        <Link
          href="/dashboard"
          className={`flex items-center gap-2 px-4 py-1.5 text-sm ${
            !selectedFolderId && !selectedWorkId
              ? "brand-workspace-active"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
          }`}
        >
          <Icon name="home" className="h-4 w-4" />
          <span>All Works</span>
        </Link>
      </div>

      {/* Folder tree */}
      <div className="flex-1 overflow-hidden py-2">
        {rootFolders.length === 0 ? (
          <p className="px-5 py-3 text-xs text-zinc-600">No folders found.</p>
        ) : (
          rootFolders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              level={0}
              selectedFolderId={selectedFolderId}
              selectedWorkId={selectedWorkId}
              allowNewFolder={folder.name === "Others"}
              clipboard={clipboard}
              onClipboardChange={setClipboard}
              onPaste={pasteWork}
              onMoveWork={updateWorkFolder}
              isBusy={isBusy}
              openWorkMenuId={openWorkMenuId}
              onWorkMenuChange={setOpenWorkMenuId}
            />
          ))
        )}
      </div>
      {clipboard && (
        <p className="border-t border-zinc-900 px-4 py-2 text-[10px] text-zinc-600">
          Choose a folder and select Paste here.
        </p>
      )}
      {toastMessage && (
        <Toast
          message={toastMessage}
          onDismiss={() => setToastMessage("")}
        />
      )}
    </div>
  );
}
