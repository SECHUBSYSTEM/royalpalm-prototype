import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    // Get user with employee data
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            role: true,
            phone: true,
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

    return NextResponse.json({
      id: user.id,
      employeeId: user.employeeId,
      employeeCode: user.employee.employeeCode,
      fullName: user.employee.fullName,
      username: user.username,
      role: user.role,
      phone: user.employee.phone,
    });
  } catch {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}
