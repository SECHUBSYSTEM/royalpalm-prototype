"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import ActivityForm from "@/components/activities/ActivityForm";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

function NewActivityPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);

  const palmId = searchParams.get("palmId");
  const qrCode = searchParams.get("qrCode");

  if (!palmId || !qrCode) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Missing Palm Information
          </h2>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="mb-4">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Activity Saved!
          </h2>
          <p className="text-gray-600 mb-6">
            Your activity has been saved and will be synced
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setShowSuccess(false);
                router.push("/");
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
              Done
            </button>
            <button
              onClick={() => {
                setShowSuccess(false);
                router.refresh();
              }}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 cursor-pointer">
              Record Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-linear-to-br from-green-50 to-blue-50 py-8">
        <ActivityForm
          palmId={palmId}
          qrCode={qrCode}
          onSuccess={() => setShowSuccess(true)}
          onCancel={() => router.push("/")}
        />
      </div>
    </ProtectedRoute>
  );
}

export default function NewActivityPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-600">Loading...</div>
        </div>
      }>
      <NewActivityPageContent />
    </Suspense>
  );
}
