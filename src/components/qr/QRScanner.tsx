"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { validatePalmID } from "@/lib/utils/palm-id";

interface QRScannerProps {
  onScan: (palmId: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

export default function QRScanner({
  onScan,
  onError,
  onClose,
}: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScannerRunningRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      // Cleanup scanner on unmount - only stop if actually running
      if (scannerRef.current && isScannerRunningRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current = null;
            isScannerRunningRef.current = false;
          })
          .catch(() => {
            // Ignore errors - scanner might already be stopped
            scannerRef.current = null;
            isScannerRunningRef.current = false;
          });
      } else {
        scannerRef.current = null;
        isScannerRunningRef.current = false;
      }
    };
  }, []);

  const startCameraScan = async () => {
    try {
      // Stop any existing scanner first
      if (scannerRef.current && isScannerRunningRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // Ignore - might already be stopped
        }
      }

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          const trimmed = decodedText.trim();
          if (validatePalmID(trimmed)) {
            // Stop scanner before calling onScan (which might navigate away)
            scanner
              .stop()
              .then(() => {
                isScannerRunningRef.current = false;
                setIsScanning(false);
                onScan(trimmed);
              })
              .catch(() => {
                // Even if stop fails, proceed with scan
                isScannerRunningRef.current = false;
                setIsScanning(false);
                onScan(trimmed);
              });
          } else {
            setError(
              `Invalid palm ID format. Scanned: "${trimmed}". Expected format: RP-[BLOCK]-[SEQUENCE] (e.g., RP-A1-00001)`
            );
          }
        },
        () => {
          // Ignore scanning errors (they're frequent during scanning)
        }
      );

      isScannerRunningRef.current = true;
      setIsScanning(true);
      setError(null);
    } catch (err) {
      isScannerRunningRef.current = false;
      const errorMsg =
        err instanceof Error ? err.message : "Failed to start camera";
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Stop camera scanner if running
    if (scannerRef.current && isScannerRunningRef.current) {
      try {
        await scannerRef.current.stop();
        isScannerRunningRef.current = false;
        setIsScanning(false);
      } catch {
        // Ignore - might already be stopped
      }
    }

    try {
      // Create a new scanner instance for file scanning (doesn't need to be started)
      const scanner = new Html5Qrcode("qr-reader");
      // Don't set scannerRef for file scanning - it's temporary

      // Try scanning with explicit file handling
      // scanFile accepts File | string (file path or data URL)
      // Use the file directly - html5-qrcode should handle File objects
      let result: string;

      try {
        // First try with the File object directly
        result = await scanner.scanFile(file, false);
      } catch {
        // If that fails, try converting to data URL
        console.log("Direct file scan failed, trying data URL approach");
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result && typeof e.target.result === "string") {
              resolve(e.target.result);
            } else {
              reject(new Error("Failed to read file as data URL"));
            }
          };
          reader.onerror = () => reject(new Error("File read error"));
          reader.readAsDataURL(file);
        });

        // Try scanning with data URL (scanFile accepts File | string)
        result = await scanner.scanFile(dataUrl as unknown as File, false);
      }

      // Trim the result in case there's whitespace
      const trimmedResult = result.trim();

      // Log what was actually scanned for debugging
      console.log("Scanned QR code:", trimmedResult);

      if (validatePalmID(trimmedResult)) {
        // Clean up scanner instance
        try {
          await scanner.clear();
        } catch {
          // Ignore cleanup errors
        }
        onScan(trimmedResult);
        setError(null);
      } else {
        // Show what was scanned and why it failed
        setError(
          `Invalid palm ID format. Scanned: "${trimmedResult}". Expected format: RP-[BLOCK]-[SEQUENCE] (e.g., RP-A1-00001)`
        );
      }
    } catch (err) {
      // Better error handling - show actual error details
      let errorMsg = "Failed to scan QR code from image";

      // Try to extract error information from various formats
      if (err instanceof Error) {
        errorMsg = err.message || errorMsg;
        console.error("QR scan error:", err);
      } else if (typeof err === "string") {
        errorMsg = err;
        console.error("QR scan error (string):", err);
      } else if (typeof err === "object" && err !== null) {
        // Try to extract message from error object
        const errObj = err as {
          message?: string;
          name?: string;
          toString?: () => string;
        };

        // Log all properties of the error object for debugging
        const errorKeys = Object.getOwnPropertyNames(err);
        console.error("QR scan error (object):", {
          keys: errorKeys,
          error: err,
          stringified: JSON.stringify(err, errorKeys),
        });

        if (errObj.message) {
          errorMsg = errObj.message;
        } else if (errObj.name) {
          // Handle specific error types
          if (
            errObj.name === "NotFoundException" ||
            errObj.name.includes("NotFound")
          ) {
            errorMsg =
              "No QR code found in image. Please ensure the image contains a valid QR code.";
          } else if (errObj.name.includes("Invalid")) {
            errorMsg = "Invalid QR code format in image.";
          } else {
            errorMsg = `QR scan failed: ${errObj.name}`;
          }
        } else if (errorKeys.length > 0) {
          // Try to get first property value as error message
          const firstKey = errorKeys[0];
          const firstValue = (err as Record<string, unknown>)[firstKey];
          if (typeof firstValue === "string" && firstValue) {
            errorMsg = firstValue;
          }
        }
      } else {
        console.error("QR scan error (unknown type):", typeof err, err);
      }

      // Provide helpful message if we couldn't extract details
      if (errorMsg === "Failed to scan QR code from image") {
        errorMsg =
          "Could not read QR code from image. Please ensure:\n- The image is clear and not blurry\n- The QR code is fully visible\n- The file is a valid image format (PNG, JPG, etc.)";
      }

      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScannerRunningRef.current) {
      try {
        await scannerRef.current.stop();
        isScannerRunningRef.current = false;
        scannerRef.current = null;
        setIsScanning(false);
      } catch {
        // Ignore errors - scanner might already be stopped
        isScannerRunningRef.current = false;
        scannerRef.current = null;
        setIsScanning(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Scan QR Code</h2>
          {onClose && (
            <button
              onClick={() => {
                stopScanning();
                onClose();
              }}
              className="text-gray-500 hover:text-gray-700 cursor-pointer">
              ✕
            </button>
          )}
        </div>

        <div className="mb-4">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => {
                startCameraScan();
              }}
              disabled={isScanning}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 cursor-pointer">
              Use Camera
            </button>
            <button
              onClick={() => {
                stopScanning();
                fileInputRef.current?.click();
              }}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 cursor-pointer">
              Upload Image
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        <div
          id="qr-reader"
          className="w-full mb-4"
          style={{ minHeight: "300px" }}
        />

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        {isScanning && (
          <button
            onClick={stopScanning}
            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer">
            Stop Scanning
          </button>
        )}
      </div>
    </div>
  );
}
