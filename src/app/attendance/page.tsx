"use client";

import { useState, useEffect, useCallback } from "react";
import AttendanceCheckIn from "@/components/attendance/AttendanceCheckIn";
import AttendanceCheckOut from "@/components/attendance/AttendanceCheckOut";
import { getTodayAttendanceOffline } from "@/lib/offline/attendance";
import { useAuthStore } from "@/stores/auth-store";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Link from "next/link";

type AttendanceStatus = "not-checked-in" | "checked-in" | "completed";

function AttendancePageContent() {
  const { user } = useAuthStore();
  const [status, setStatus] = useState<AttendanceStatus>("not-checked-in");
  const [loading, setLoading] = useState(true);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<Date | null>(null);

  const employeeId = user?.employeeId || "";
  const employeeName = user?.fullName || "User";

  // Refresh status from IndexedDB
  const refreshStatus = useCallback(async () => {
    if (!employeeId) return;
    
    setLoading(true);
    try {
      const attendance = await getTodayAttendanceOffline(employeeId);
      console.log("[Attendance] Status check:", attendance);
      
      if (attendance) {
        setCheckInTime(new Date(attendance.check_in));
        if (attendance.check_out) {
          setCheckOutTime(new Date(attendance.check_out));
          setStatus("completed");
        } else {
          setCheckOutTime(null);
          setStatus("checked-in");
        }
      } else {
        setCheckInTime(null);
        setCheckOutTime(null);
        setStatus("not-checked-in");
      }
    } catch (err) {
      console.error("Error checking attendance:", err);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  // Initial load
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Format time for display
  const formatTime = (date: Date | null) => {
    if (!date) return "--:--";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          <div className="text-gray-600">Loading attendance...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Attendance</h1>
          <p className="text-gray-600">Record your check-in and check-out</p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="font-semibold text-gray-800 mb-4">
            Today&apos;s Status
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Employee:</span>
              <span className="font-medium text-gray-900">{employeeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span
                className={`font-medium px-2 py-1 rounded ${
                  status === "completed"
                    ? "bg-green-100 text-green-800"
                    : status === "checked-in"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}>
                {status === "completed"
                  ? "Completed"
                  : status === "checked-in"
                  ? "Checked In"
                  : "Not Checked In"}
              </span>
            </div>
            {checkInTime && (
              <div className="flex justify-between">
                <span className="text-gray-600">Check-in:</span>
                <span className="font-medium text-gray-900">
                  {formatTime(checkInTime)}
                </span>
              </div>
            )}
            {checkOutTime && (
              <div className="flex justify-between">
                <span className="text-gray-600">Check-out:</span>
                <span className="font-medium text-gray-900">
                  {formatTime(checkOutTime)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Card */}
        {status === "not-checked-in" && (
          <AttendanceCheckIn
            employeeId={employeeId}
            employeeName={employeeName}
            onSuccess={refreshStatus}
          />
        )}

        {status === "checked-in" && (
          <AttendanceCheckOut
            employeeId={employeeId}
            employeeName={employeeName}
            onSuccess={refreshStatus}
          />
        )}

        {status === "completed" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="text-4xl mb-3">✓</div>
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              Attendance Complete
            </h3>
            <p className="text-green-700 text-sm">
              You have completed your attendance for today. See you tomorrow!
            </p>
          </div>
        )}

        <div className="text-center">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 underline cursor-pointer">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  return (
    <ProtectedRoute>
      <AttendancePageContent />
    </ProtectedRoute>
  );
}
