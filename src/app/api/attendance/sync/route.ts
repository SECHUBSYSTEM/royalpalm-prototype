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
  console.log("[Attendance Sync] Starting sync...");
  
  try {
    const body = await request.json();
    const { attendance } = syncSchema.parse(body);
    
    console.log(`[Attendance Sync] Processing ${attendance.length} records`);

    // Validate and insert attendance records
    const results = await Promise.allSettled(
      attendance.map(async (record) => {
        // Check if employee exists
        const employee = await prisma.employee.findUnique({
          where: { id: record.employee_id },
        });

        if (!employee) {
          console.warn(`[Attendance Sync] Employee ${record.employee_id} not found`);
          throw new Error(`Employee ${record.employee_id} not found`);
        }

        // Check if this attendance already exists (for same employee and check_in time)
        const checkInDate = new Date(record.check_in);
        const checkInStart = new Date(checkInDate);
        checkInStart.setSeconds(checkInStart.getSeconds() - 5); // 5 second window
        const checkInEnd = new Date(checkInDate);
        checkInEnd.setSeconds(checkInEnd.getSeconds() + 5);

        const existing = await prisma.attendance.findFirst({
          where: {
            employeeId: record.employee_id,
            checkIn: {
              gte: checkInStart,
              lte: checkInEnd,
            },
          },
        });

        if (existing) {
          // Update existing record with check_out if needed
          if (record.check_out && !existing.checkOut) {
            console.log(`[Attendance Sync] Updating check-out for employee ${record.employee_id}`);
            return prisma.attendance.update({
              where: { id: existing.id },
              data: {
                checkOut: new Date(record.check_out),
                synced: true,
              },
            });
          }
          console.log(`[Attendance Sync] Record already exists for employee ${record.employee_id}`);
          return existing;
        }

        // Create new attendance record
        console.log(`[Attendance Sync] Creating record for employee ${record.employee_id}`);
        return prisma.attendance.create({
          data: {
            employeeId: record.employee_id,
            checkIn: new Date(record.check_in),
            checkOut: record.check_out ? new Date(record.check_out) : null,
            verifiedBy: "FINGERPRINT",
            synced: true,
          },
        });
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`[Attendance Sync] Complete - ${successful} synced, ${failed} failed`);

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
    console.error("[Attendance Sync] Error:", error);

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
