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
  console.log("[Activity Sync] Starting sync...");
  
  try {
    const body = await request.json();
    const { activities } = syncSchema.parse(body);
    
    console.log(`[Activity Sync] Processing ${activities.length} activities`);

    // Validate and insert activities
    const results = await Promise.allSettled(
      activities.map(async (activity) => {
        // Try to find palm by ID first, then by QR code
        let palm = await prisma.palm.findUnique({
          where: { id: activity.palm_id },
        });

        if (!palm) {
          // Try by QR code
          palm = await prisma.palm.findUnique({
            where: { qrCode: activity.palm_id },
          });
        }

        if (!palm) {
          console.warn(`[Activity Sync] Palm ${activity.palm_id} not found`);
          throw new Error(`Palm ${activity.palm_id} not found`);
        }

        // Parse GPS coordinates safely
        let gpsLatitude: number | undefined;
        let gpsLongitude: number | undefined;
        
        if (activity.data.gpsLatitude !== undefined && activity.data.gpsLatitude !== null) {
          gpsLatitude = typeof activity.data.gpsLatitude === 'number' 
            ? activity.data.gpsLatitude 
            : parseFloat(String(activity.data.gpsLatitude));
          if (isNaN(gpsLatitude)) gpsLatitude = undefined;
        }
        
        if (activity.data.gpsLongitude !== undefined && activity.data.gpsLongitude !== null) {
          gpsLongitude = typeof activity.data.gpsLongitude === 'number'
            ? activity.data.gpsLongitude
            : parseFloat(String(activity.data.gpsLongitude));
          if (isNaN(gpsLongitude)) gpsLongitude = undefined;
        }

        console.log(`[Activity Sync] Creating ${activity.activity_type} for palm ${palm.qrCode}`);

        // Create activity record
        return prisma.palmActivity.create({
          data: {
            palmId: palm.id,
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
            gpsLatitude,
            gpsLongitude,
            synced: true,
          },
        });
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`[Activity Sync] Complete - ${successful} synced, ${failed} failed`);

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
    console.error("[Activity Sync] Error:", error);

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
