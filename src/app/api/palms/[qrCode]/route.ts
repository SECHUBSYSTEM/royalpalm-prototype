import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ qrCode: string }> }
) {
  try {
    const { qrCode } = await params;

    const palm = await prisma.palm.findUnique({
      where: { qrCode },
      include: {
        block: {
          select: {
            blockName: true,
            blockCode: true,
            areaHectares: true,
          },
        },
      },
    });

    if (!palm) {
      return NextResponse.json(
        { error: "Palm not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: palm.id,
      qrCode: palm.qrCode,
      blockId: palm.blockId,
      blockName: palm.block.blockName,
      blockCode: palm.block.blockCode,
      rowNumber: palm.rowNumber,
      columnNumber: palm.columnNumber,
      plantingDate: palm.plantingDate,
      variety: palm.variety,
      status: palm.status,
    });
  } catch (error) {
    console.error("Error fetching palm:", error);
    return NextResponse.json(
      { error: "Failed to fetch palm details" },
      { status: 500 }
    );
  }
}
