import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const content = typeof body.content === "string" ? body.content : undefined;

    const title =
      typeof body.title === "string" ? body.title.trim() : undefined;
    const folderId =
      typeof body.folderId === "string" ? body.folderId.trim() : undefined;

    if (
      content === undefined &&
      title === undefined &&
      folderId === undefined
    ) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    if (folderId !== undefined && !folderId) {
      return NextResponse.json(
        { error: "Folder ID is required" },
        { status: 400 },
      );
    }

    const existingWork = await prisma.work.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingWork) {
      return NextResponse.json({ error: "Work not found" }, { status: 404 });
    }

    if (folderId !== undefined) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          userId: session.user.id,
        },
        select: { id: true },
      });

      if (!folder) {
        return NextResponse.json(
          { error: "Folder not found" },
          { status: 404 },
        );
      }
    }

    const work = await prisma.work.update({
      where: {
        id: existingWork.id,
      },
      data: {
        ...(content !== undefined && { content }),
        ...(title !== undefined && { title }),
        ...(folderId !== undefined && { folderId }),
      },
      select: {
        id: true,
        title: true,
        content: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: "Work saved successfully",
      work,
    });
  } catch (error) {
    console.error("Failed to update work:", error);

    return NextResponse.json({ error: "Failed to save work" }, { status: 500 });
  }
}
export async function DELETE(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;

    const existingWork = await prisma.work.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingWork) {
      return NextResponse.json(
        { error: "Work not found" },
        { status: 404 },
      );
    }

    await prisma.work.delete({
      where: {
        id: existingWork.id,
      },
    });

    return NextResponse.json({
      message: "Work deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete work:", error);

    return NextResponse.json(
      { error: "Failed to delete work" },
      { status: 500 },
    );
  }
}
