import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const MAX_QUERY_LENGTH = 100;
const MAX_RESULTS = 40;

function createSnippet(content: string, query: string) {
  const matchIndex = content.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  const start = matchIndex < 0 ? 0 : Math.max(0, matchIndex - 45);
  const end = Math.min(content.length, start + 120);
  const snippet = content.slice(start, end).replace(/\s+/g, " ").trim();

  return `${start > 0 ? "…" : ""}${snippet}${end < content.length ? "…" : ""}`;
}

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Search must be ${MAX_QUERY_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  try {
    const [works, folders] = await Promise.all([
      prisma.work.findMany({
        where: {
          userId: session.user.id,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          content: true,
          updatedAt: true,
          folderId: true,
        },
        orderBy: { updatedAt: "desc" },
        take: MAX_RESULTS,
      }),
      prisma.folder.findMany({
        where: { userId: session.user.id },
        select: { id: true, name: true, parentId: true },
      }),
    ]);

    const folderById = new Map(folders.map((folder) => [folder.id, folder]));
    const results = works.map((work) => {
      const path: string[] = [];
      const visited = new Set<string>();
      let folder = folderById.get(work.folderId);

      while (folder && !visited.has(folder.id)) {
        visited.add(folder.id);
        path.unshift(folder.name);
        folder = folder.parentId
          ? folderById.get(folder.parentId)
          : undefined;
      }

      return {
        id: work.id,
        title: work.title,
        folderPath: path.join(" / "),
        snippet: createSnippet(work.content, query),
      };
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Workspace search failed:", error);

    return NextResponse.json(
      { error: "Unable to search your workspace right now." },
      { status: 500 },
    );
  }
}
