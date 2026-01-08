"use client";

import { useState, useEffect } from "react";
import AttendanceCheckIn from "@/components/attendance/AttendanceCheckIn";
import AttendanceCheckOut from "@/components/attendance/AttendanceCheckOut";
import { getTodayAttendanceOffline } from "@/lib/offline/attendance";
import { useAuthStore } from "@/stores/auth-store";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Link from "next/link";

function AttendancePageContent() {
  const { user } = useAuthStore();
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const employeeId = user?.employeeId || "";
  const employeeName = user?.fullName || "User";

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const attendance = await getTodayAttendanceOffline(employeeId);
        setHasCheckedIn(!!(attendance && !attendance.check_out));
      } catch (err) {
        console.error("Error checking attendance:", err);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-green-50 to-blue-50 py-8 px-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Attendance</h1>
          <p className="text-gray-600">Record your check-in and check-out</p>
        </div>

        {!hasCheckedIn ? (
          <AttendanceCheckIn
            employeeId={employeeId}
            employeeName={employeeName}
            onSuccess={() => setHasCheckedIn(true)}
          />
        ) : (
          <AttendanceCheckOut
            employeeId={employeeId}
            employeeName={employeeName}
            onSuccess={() => setHasCheckedIn(false)}
          />
        )}

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="font-semibold text-gray-800 mb-2">
            Today&apos;s Status
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Employee:</span>
              <span className="font-medium">{employeeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium">
                {hasCheckedIn ? "Checked In" : "Not Checked In"}
              </span>
            </div>
          </div>
        </div>

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
