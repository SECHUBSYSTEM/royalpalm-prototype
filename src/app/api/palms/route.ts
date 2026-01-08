import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "1000", 10);

    const skip = (page - 1) * limit;

    // Get total count
    const total = await prisma.palm.count();

    // Get palms with pagination
    const palms = await prisma.palm.findMany({
      skip,
      take: limit,
      include: {
        block: {
          select: {
            blockName: true,
            blockCode: true,
          },
        },
      },
      orderBy: {
        qrCode: "asc",
      },
    });

    // Transform to response format
    const palmData = palms.map((palm) => ({
      id: palm.id,
      qrCode: palm.qrCode,
      blockId: palm.blockId,
      blockName: palm.block.blockName,
      blockCode: palm.block.blockCode,
      rowNumber: palm.rowNumber,
      columnNumber: palm.columnNumber,
      plantingDate: palm.plantingDate?.toISOString() || null,
      variety: palm.variety,
      status: palm.status,
    }));

    const hasMore = skip + palms.length < total;

    return NextResponse.json({
      palms: palmData,
      total,
      page,
      limit,
      hasMore,
    });
  } catch (error) {
    console.error("Error fetching palms:", error);
    return NextResponse.json(
      { error: "Failed to fetch palms" },
      { status: 500 }
    );
  }
}
