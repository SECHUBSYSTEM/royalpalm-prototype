import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const checkInSchema = z.object({
  employeeId: z.string(),
  checkIn: z.string().or(z.number()),
  verifiedBy: z.enum(["FINGERPRINT", "PIN", "SUPERVISOR_OVERRIDE"]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = checkInSchema.parse(body);

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { error: `Employee ${data.employeeId} not found` },
        { status: 404 }
      );
    }

    // Check for existing open check-in today
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

    if (existingCheckIn) {
      return NextResponse.json(
        { error: "Employee already checked in today" },
        { status: 400 }
      );
    }

    // Create attendance record
    const checkInTime =
      typeof data.checkIn === "number"
        ? new Date(data.checkIn)
        : new Date(data.checkIn);

    const attendance = await prisma.attendance.create({
      data: {
        employeeId: data.employeeId,
        checkIn: checkInTime,
        verifiedBy: data.verifiedBy,
        synced: true,
      },
    });

    console.log(`[Check-In] Employee ${data.employeeId} checked in at ${checkInTime}`);

    return NextResponse.json({
      success: true,
      id: attendance.id,
      checkIn: attendance.checkIn,
    });
  } catch (error) {
    console.error("Check-in error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to check in" },
      { status: 500 }
    );
  }
}
