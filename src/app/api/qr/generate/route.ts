import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Palm code is required" },
        { status: 400 }
      );
    }

    // Generate QR code as data URL (base64 PNG)
    const qrCodeDataUrl = await QRCode.toDataURL(code, {
      width: 400,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return NextResponse.json({
      qrCode: qrCodeDataUrl,
      code,
    });
  } catch (error) {
    console.error("QR generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}
