import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, generateAccessToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token not found' },
        { status: 401 }
      );
    }

    // Verify refresh token
    const payload = await verifyToken(refreshToken);

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        employee: {
          select: {
            isActive: true,
          },
        },
      },
    });

    if (!user || !user.employee.isActive) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 401 }
      );
    }

    // Generate new access token
    const newAccessToken = await generateAccessToken({
      sub: user.id,
      employeeId: user.employeeId,
      username: user.username,
      role: user.role,
    });

    return NextResponse.json({
      accessToken: newAccessToken,
    });
  } catch {
    // Clear invalid refresh token
    const response = NextResponse.json(
      { error: 'Invalid or expired refresh token' },
      { status: 401 }
    );
    response.cookies.delete('refresh_token');

    return response;
  }
}
