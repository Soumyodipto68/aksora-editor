import Explorer from "./Explorer";
import Collections from "./Collections";
import LogoutButton from "./LogoutButton";
import Link from "next/link";
import Logo from "@/components/Logo";

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

type SidebarProps = {
  folders: Folder[];
  userId: string;
  selectedFolderId?: string;
  selectedWorkId?: string;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

export default function Sidebar({
  folders,
  userId,
  selectedFolderId,
  selectedWorkId,
  user,
}: SidebarProps) {
  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-zinc-800 px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo />
        </Link>
      </div>

      {/* Explorer */}
      <Explorer
        folders={folders}
        selectedFolderId={selectedFolderId}
        selectedWorkId={selectedWorkId}
      />

      {/* Collections */}
      <Collections userId={userId} />

      {/* User profile and logout */}
      <div className="border-t border-zinc-800 p-3">
        <div className="flex items-center gap-2 rounded-md px-2 py-2">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name ?? "User"}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">
              {(user.name?.[0] ?? "U").toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-zinc-200">
              {user.name ?? "User"}
            </p>

            <p className="truncate text-xs text-zinc-600">{user.email ?? ""}</p>
          </div>

          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
