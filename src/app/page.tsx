"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QRScanner from "@/components/qr/QRScanner";
import SyncStatus from "@/components/sync/SyncStatus";
import PalmSyncStatus from "@/components/sync/PalmSyncStatus";
import { useAuthStore } from "@/stores/auth-store";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

function HomeContent() {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedPalmId, setScannedPalmId] = useState<string | null>(null);
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleScan = (palmId: string) => {
    setScannedPalmId(palmId);
    setShowScanner(false);
    // Navigate to activity form with palm ID
    const qrCode = palmId; // QR code is the palm ID
    router.push(
      `/activities/new?palmId=${encodeURIComponent(
        palmId
      )}&qrCode=${encodeURIComponent(qrCode)}`
    );
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-green-50 to-blue-50 p-4">
      <div className="absolute top-4 right-4 flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {user?.fullName} ({user?.role})
        </span>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer text-sm">
          Logout
        </button>
      </div>
      <main className="w-full max-w-2xl space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            RoyalPalm Agro
          </h1>
          <p className="text-xl text-gray-600">
            Plantation Management & Employee Attendance System
          </p>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-4 text-2xl font-semibold text-gray-800">
            Prototype Ready
          </h2>
          <p className="mb-6 text-gray-600">
            The prototype is set up and ready for development. Key features:
          </p>

          <div className="grid gap-4 text-left sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">
                  QR Code Scanning
                </h3>
                <p className="text-sm text-gray-600">Scan palm QR codes</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Offline Support</h3>
                <p className="text-sm text-gray-600">Works without internet</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Data Sync</h3>
                <p className="text-sm text-gray-600">
                  Automatic synchronization
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">PWA Ready</h3>
                <p className="text-sm text-gray-600">Installable app</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowScanner(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium cursor-pointer">
              Scan QR Code
            </button>
            <Link
              href="/attendance"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-center cursor-pointer">
              Attendance
            </Link>
            <Link
              href="/qr-generator"
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-center cursor-pointer">
              Generate QR Code
            </Link>
          </div>

          {scannedPalmId && (
            <div className="mt-4 p-4 bg-green-100 rounded-lg">
              <p className="text-green-800 font-medium">
                Scanned: {scannedPalmId}
              </p>
            </div>
          )}
        </div>
      </main>

      {showScanner && (
        <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      <SyncStatus />
      <PalmSyncStatus />
    </div>
  );
}

export default function Home() {
  return (
    <ProtectedRoute>
      <HomeContent />
    </ProtectedRoute>
  );
}
