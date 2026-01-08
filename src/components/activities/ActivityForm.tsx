"use client";

import { useState, useEffect } from "react";
import { ActivityType } from "@/types";
import { saveActivityOffline } from "@/lib/offline/activities";
import { useSyncStore } from "@/stores/sync-store";
import { useAuthStore } from "@/stores/auth-store";
import { getPalmFromCache, cachePalm } from "@/lib/offline/palms";
import axiosInstance from "@/lib/api/axios";

interface Palm {
  id: string;
  qrCode: string;
  blockName: string;
  blockCode: string;
  rowNumber?: number;
  columnNumber?: number;
  variety?: string;
  status: string;
}

interface ActivityFormProps {
  palmId: string;
  qrCode: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ACTIVITY_TYPES = [
  { value: ActivityType.FERTILISER, label: "Fertiliser Application" },
  { value: ActivityType.HARVESTING, label: "Harvesting" },
  { value: ActivityType.PRUNING, label: "Pruning" },
  { value: ActivityType.DISEASE_INSPECTION, label: "Disease Inspection" },
  { value: ActivityType.SPRAYING, label: "Spraying" },
  { value: ActivityType.WEEDING, label: "Weeding" },
  { value: ActivityType.MORTALITY, label: "Mortality" },
];

export default function ActivityForm({
  palmId,
  qrCode,
  onSuccess,
  onCancel,
}: ActivityFormProps) {
  const [palm, setPalm] = useState<Palm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activityType, setActivityType] = useState<ActivityType>(
    ActivityType.FERTILISER
  );
  const [activityDate, setActivityDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [details, setDetails] = useState<Record<string, unknown>>({});
  const [gpsLocation, setGpsLocation] = useState<{
    latitude?: number;
    longitude?: number;
  }>({});

  const { updateStatus } = useSyncStore();
  const { user } = useAuthStore();

  useEffect(() => {
    // Fetch palm details - use local cache first
    const fetchPalm = async () => {
      try {
        // Try local cache first
        let palmData = await getPalmFromCache(qrCode);

        // If not in cache and online, fetch from API and cache it
        if (!palmData && navigator.onLine) {
          try {
            const response = await axiosInstance.get(`/api/palms/${qrCode}`);
            palmData = response.data;
            // Cache for next time
            if (palmData) {
              await cachePalm(palmData);
            }
          } catch (apiErr) {
            // API failed, but maybe we have stale cache?
            palmData = await getPalmFromCache(qrCode);
            if (!palmData) {
              throw apiErr;
            }
          }
        }

        if (palmData) {
          // Convert Palm type to local Palm interface
          setPalm({
            id: palmData.id,
            qrCode: palmData.qrCode,
            blockName: palmData.blockName,
            blockCode: palmData.blockCode,
            rowNumber: palmData.rowNumber ?? undefined,
            columnNumber: palmData.columnNumber ?? undefined,
            variety: palmData.variety ?? undefined,
            status: palmData.status,
          });
        } else {
          setError("Palm not found in cache and offline");
        }
      } catch (err) {
        setError("Failed to load palm details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPalm();

    // Get GPS location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          // Silently fail if GPS unavailable
        }
      );
    }
  }, [qrCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!user?.employeeId) {
        setError("You must be logged in to record activities");
        return;
      }

      await saveActivityOffline({
        palmId,
        activityType,
        activityDate: new Date(activityDate),
        details,
        notes: notes || undefined,
        gpsLatitude: gpsLocation.latitude,
        gpsLongitude: gpsLocation.longitude,
        workerId: user.employeeId,
      });

      // Update sync status
      await updateStatus();

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save activity");
    } finally {
      setSaving(false);
    }
  };

  const renderActivityFields = () => {
    switch (activityType) {
      case ActivityType.FERTILISER:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fertiliser Type
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder:text-gray-500"
                placeholder="e.g., NPK 15-15-15"
                value={(details.fertiliserType as string) || ""}
                onChange={(e) =>
                  setDetails({ ...details, fertiliserType: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity (kg)
              </label>
              <input
                type="number"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                value={(details.quantity as number) || ""}
                onChange={(e) =>
                  setDetails({
                    ...details,
                    quantity: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
        );

      case ActivityType.HARVESTING:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bunch Count
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                value={(details.bunchCount as number) || ""}
                onChange={(e) =>
                  setDetails({
                    ...details,
                    bunchCount: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                value={(details.weight as number) || ""}
                onChange={(e) =>
                  setDetails({
                    ...details,
                    weight: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quality Grade
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                value={(details.qualityGrade as string) || ""}
                onChange={(e) =>
                  setDetails({ ...details, qualityGrade: e.target.value })
                }>
                <option value="">Select grade</option>
                <option value="A">Grade A</option>
                <option value="B">Grade B</option>
                <option value="C">Grade C</option>
              </select>
            </div>
          </div>
        );

      case ActivityType.MORTALITY:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cause of Death
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder:text-gray-500"
                placeholder="e.g., Disease, Pest, Natural"
                value={(details.cause as string) || ""}
                onChange={(e) =>
                  setDetails({ ...details, cause: e.target.value })
                }
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading palm details...</div>
      </div>
    );
  }

  if (!palm) {
    return (
      <div className="p-8">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">
          {error || "Palm not found"}
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
            Go Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Record Activity
        </h2>

        {/* Palm Info */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-gray-800 mb-2">Palm Information</h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-800">
            <div>
              <span className="text-gray-600">QR Code:</span>{" "}
              <span className="font-medium">{palm.qrCode}</span>
            </div>
            <div>
              <span className="text-gray-600">Block:</span>{" "}
              <span className="font-medium">{palm.blockName}</span>
            </div>
            {palm.rowNumber && (
              <div>
                <span className="text-gray-600">Row:</span>{" "}
                <span className="font-medium">{palm.rowNumber}</span>
              </div>
            )}
            {palm.columnNumber && (
              <div>
                <span className="text-gray-600">Column:</span>{" "}
                <span className="font-medium">{palm.columnNumber}</span>
              </div>
            )}
            {palm.variety && (
              <div>
                <span className="text-gray-600">Variety:</span>{" "}
                <span className="font-medium">{palm.variety}</span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Activity Type *
            </label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as ActivityType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              required>
              {ACTIVITY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Activity Date *
            </label>
            <input
              type="date"
              value={activityDate}
              onChange={(e) => setActivityDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              required
            />
          </div>

          {renderActivityFields()}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder:text-gray-500"
              placeholder="Additional notes or observations..."
            />
          </div>

          {gpsLocation.latitude && (
            <div className="text-xs text-gray-500">
              GPS: {gpsLocation.latitude.toFixed(6)},{" "}
              {gpsLocation.longitude?.toFixed(6)}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer">
              {saving ? "Saving..." : "Save Activity"}
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 cursor-pointer">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
