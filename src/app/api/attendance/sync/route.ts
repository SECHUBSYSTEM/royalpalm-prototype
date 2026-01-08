import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const attendanceSchema = z.object({
  id: z.string(),
  employee_id: z.string(),
  check_in: z.number(),
  check_out: z.number().nullable(),
  synced: z.boolean(),
  created_at: z.number(),
});

const syncSchema = z.object({
  attendance: z.array(attendanceSchema),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { attendance } = syncSchema.parse(body);

    // Validate and insert attendance records
    const results = await Promise.allSettled(
      attendance.map(async (record) => {
        // Check if employee exists
        const employee = await prisma.employee.findUnique({
          where: { id: record.employee_id },
        });

        if (!employee) {
          throw new Error(`Employee ${record.employee_id} not found`);
        }

        // Create attendance record
        return prisma.attendance.create({
          data: {
            employeeId: record.employee_id,
            checkIn: new Date(record.check_in),
            checkOut: record.check_out ? new Date(record.check_out) : null,
            verifiedBy: "FINGERPRINT", // Default, can be enhanced
            synced: true,
          },
        });
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      success: true,
      synced: successful,
      failed,
      errors: results
        .filter((r) => r.status === "rejected")
        .map(
          (r) => (r as PromiseRejectedResult).reason?.message || "Unknown error"
        ),
    });
  } catch (error) {
    console.error("Sync error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to sync attendance" },
      { status: 500 }
    );
  }
}
