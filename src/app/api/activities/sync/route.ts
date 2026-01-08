import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const activitySchema = z.object({
  id: z.string(),
  palm_id: z.string(),
  activity_type: z.string(),
  data: z.record(z.string(), z.unknown()),
  synced: z.boolean(),
  created_at: z.number(),
});

const syncSchema = z.object({
  activities: z.array(activitySchema),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { activities } = syncSchema.parse(body);

    // Validate and insert activities
    const results = await Promise.allSettled(
      activities.map(async (activity) => {
        // Check if palm exists
        const palm = await prisma.palm.findUnique({
          where: { id: activity.palm_id },
        });

        if (!palm) {
          throw new Error(`Palm ${activity.palm_id} not found`);
        }

        // Create activity record
        return prisma.palmActivity.create({
          data: {
            palmId: activity.palm_id,
            workerId: activity.data.workerId as string,
            activityType: activity.activity_type as
              | "FERTILISER"
              | "HARVESTING"
              | "PRUNING"
              | "DISEASE_INSPECTION"
              | "SPRAYING"
              | "WEEDING"
              | "MORTALITY",
            activityDate: new Date(activity.data.activityDate as string),
            details: JSON.parse(JSON.stringify(activity.data)),
            notes: activity.data.notes as string | undefined,
            gpsLatitude: activity.data.gpsLatitude
              ? parseFloat(activity.data.gpsLatitude as string)
              : undefined,
            gpsLongitude: activity.data.gpsLongitude
              ? parseFloat(activity.data.gpsLongitude as string)
              : undefined,
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
      { error: "Failed to sync activities" },
      { status: 500 }
    );
  }
}
