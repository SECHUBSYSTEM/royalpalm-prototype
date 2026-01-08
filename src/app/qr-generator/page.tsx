"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import axiosInstance from "@/lib/api/axios";

export default function QRGeneratorPage() {
  const [palmCode, setPalmCode] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testCodes = [
    "RP-A1-00001",
    "RP-A1-00002",
    "RP-A1-00003",
    "RP-A1-00004",
    "RP-A1-00005",
    "RP-A1-00006",
    "RP-A1-00007",
    "RP-A1-00008",
    "RP-A1-00009",
    "RP-A1-00010",
  ];

  const handleGenerate = async () => {
    if (!palmCode.trim()) {
      setError("Please enter a palm code");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setQrCodeDataUrl(null);

    try {
      const response = await axiosInstance.post("/api/qr/generate", {
        code: palmCode.trim(),
      });

      setQrCodeDataUrl(response.data.qrCode);
    } catch (err) {
      const errorMessage =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to generate QR code";
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!qrCodeDataUrl) return;

    // Create a temporary link element and trigger download
    const link = document.createElement("a");
    link.href = qrCodeDataUrl;
    link.download = `${palmCode || "qr-code"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTestCodeClick = (code: string) => {
    setPalmCode(code);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-green-50 to-blue-50 p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            QR Code Generator
          </h1>
          <p className="mt-2 text-xl text-gray-600">
            Generate QR codes for palm trees
          </p>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-lg">
          <div className="space-y-6">
            {/* Input Section */}
            <div>
              <label
                htmlFor="palmCode"
                className="block text-sm font-medium text-gray-700 mb-2">
                Palm Code
              </label>
              <div className="flex gap-2">
                <input
                  id="palmCode"
                  type="text"
                  value={palmCode}
                  onChange={(e) => setPalmCode(e.target.value)}
                  placeholder="e.g., RP-A1-00001"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-800"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleGenerate();
                    }
                  }}
                />
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer font-medium">
                  {isGenerating ? "Generating..." : "Generate"}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* QR Code Display */}
            {qrCodeDataUrl && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                    <Image
                      src={qrCodeDataUrl}
                      alt={`QR Code for ${palmCode}`}
                      width={256}
                      height={256}
                      unoptimized
                    />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    Code: <span className="font-semibold">{palmCode}</span>
                  </p>
                  <button
                    onClick={handleDownload}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer font-medium">
                    Download PNG
                  </button>
                </div>
              </div>
            )}

            {/* Test Codes Reference */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Test Codes (Click to use):
              </h3>
              <div className="flex flex-wrap gap-2">
                {testCodes.map((code) => (
                  <button
                    key={code}
                    onClick={() => handleTestCodeClick(code)}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 cursor-pointer text-gray-700">
                    {code}
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-4 justify-center pt-4 border-t">
              <Link
                href="/"
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer font-medium text-center">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
