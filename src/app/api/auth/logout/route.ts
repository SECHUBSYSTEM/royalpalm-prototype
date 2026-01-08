import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: 'Logged out successfully' });

  // Clear refresh token cookie
  response.cookies.delete('refresh_token');

  return response;
}
