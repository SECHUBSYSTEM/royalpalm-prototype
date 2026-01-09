import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const checkOutSchema = z.object({
  employeeId: z.string(),
  checkOut: z.string().or(z.number()),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = checkOutSchema.parse(body);

    // Find today's open check-in
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingCheckIn = await prisma.attendance.findFirst({
      where: {
        employeeId: data.employeeId,
        checkIn: {
          gte: today,
          lt: tomorrow,
        },
        checkOut: null,
      },
    });

    if (!existingCheckIn) {
      return NextResponse.json(
        { error: "No open check-in found for today" },
        { status: 404 }
      );
    }

    // Update with check-out time
    const checkOutTime =
      typeof data.checkOut === "number"
        ? new Date(data.checkOut)
        : new Date(data.checkOut);

    const attendance = await prisma.attendance.update({
      where: { id: existingCheckIn.id },
      data: {
        checkOut: checkOutTime,
      },
    });

    console.log(`[Check-Out] Employee ${data.employeeId} checked out at ${checkOutTime}`);

    return NextResponse.json({
      success: true,
      id: attendance.id,
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
    });
  } catch (error) {
    console.error("Check-out error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to check out" },
      { status: 500 }
    );
  }
}
