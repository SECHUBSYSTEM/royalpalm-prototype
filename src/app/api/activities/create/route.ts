import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const activitySchema = z.object({
  palmId: z.string(),
  qrCode: z.string().optional(), // QR code for palm resolution (preferred)
  workerId: z.string(),
  activityType: z.enum([
    "FERTILISER",
    "HARVESTING",
    "PRUNING",
    "DISEASE_INSPECTION",
    "SPRAYING",
    "WEEDING",
    "MORTALITY",
  ]),
  activityDate: z.string().or(z.number()),
  details: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().optional(),
  gpsLatitude: z.number().optional(),
  gpsLongitude: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = activitySchema.parse(body);

    // Verify palm exists - prefer qrCode lookup (most reliable)
    let palm = null;
    let resolvedPalmId = data.palmId;

    // If qrCode is provided, use it (preferred method)
    if (data.qrCode) {
      palm = await prisma.palm.findUnique({
        where: { qrCode: data.qrCode },
      });
      if (palm) {
        resolvedPalmId = palm.id;
      }
    }

    // Fallback: try palmId as UUID
    if (!palm) {
      palm = await prisma.palm.findUnique({
        where: { id: data.palmId },
      });
    }

    // Last resort: try palmId as QR code
    if (!palm) {
      palm = await prisma.palm.findUnique({
        where: { qrCode: data.palmId },
      });
      if (palm) {
        resolvedPalmId = palm.id;
      }
    }

    if (!palm) {
      const identifier = data.qrCode || data.palmId;
      return NextResponse.json(
        { error: `Palm ${identifier} not found` },
        { status: 404 }
      );
    }

    // Use the resolved palm ID
    data.palmId = resolvedPalmId;

    // Verify worker exists
    const worker = await prisma.employee.findUnique({
      where: { id: data.workerId },
    });

    if (!worker) {
      return NextResponse.json(
        { error: `Worker ${data.workerId} not found` },
        { status: 404 }
      );
    }

    // Create activity record
    const activityDate =
      typeof data.activityDate === "number"
        ? new Date(data.activityDate)
        : new Date(data.activityDate);

    const activity = await prisma.palmActivity.create({
      data: {
        palmId: data.palmId,
        workerId: data.workerId,
        activityType: data.activityType,
        activityDate: activityDate,
        details: data.details
          ? JSON.parse(JSON.stringify(data.details))
          : undefined,
        notes: data.notes,
        gpsLatitude: data.gpsLatitude,
        gpsLongitude: data.gpsLongitude,
        synced: true,
      },
    });

    console.log(
      `[Activity] Created ${data.activityType} for palm ${data.palmId}`
    );

    return NextResponse.json({
      success: true,
      id: activity.id,
    });
  } catch (error) {
    console.error("Create activity error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create activity" },
      { status: 500 }
    );
  }
}
