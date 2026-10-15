import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const folderId =
      typeof body.folderId === "string" ? body.folderId.trim() : "";

    if (!folderId) {
      return NextResponse.json(
        { error: "Folder ID is required" },
        { status: 400 },
      );
    }

    const [work, folder] = await Promise.all([
      prisma.work.findFirst({
        where: {
          id,
          userId: session.user.id,
        },
        select: {
          title: true,
          content: true,
        },
      }),
      prisma.folder.findFirst({
        where: {
          id: folderId,
          userId: session.user.id,
        },
        select: { id: true },
      }),
    ]);

    if (!work) {
      return NextResponse.json({ error: "Work not found" }, { status: 404 });
    }

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const copiedWork = await prisma.work.create({
      data: {
        title: `${work.title} (copy)`,
        content: work.content,
        folderId: folder.id,
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        folderId: true,
      },
    });

    return NextResponse.json(
      { message: "Work copied successfully", work: copiedWork },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to copy work:", error);

    return NextResponse.json(
      { error: "Failed to copy work" },
      { status: 500 },
    );
  }
}
