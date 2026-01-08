import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth/jwt";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    // Handle empty or invalid JSON body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { username, password } = loginSchema.parse(body);

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.employee.isActive) {
      return NextResponse.json(
        { error: "Account is disabled" },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate tokens
    const tokenPayload = {
      sub: user.id,
      employeeId: user.employeeId,
      username: user.username,
      role: user.role,
    };

    const accessToken = await generateAccessToken(tokenPayload);
    const refreshToken = await generateRefreshToken(tokenPayload);

    // Create response
    const response = NextResponse.json({
      user: {
        id: user.id,
        employeeId: user.employeeId,
        employeeCode: user.employee.employeeCode,
        fullName: user.employee.fullName,
        username: user.username,
        role: user.role,
      },
      accessToken,
    });

    // Set refresh token as httpOnly cookie
    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
