import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "royalpalm-secret-key-change-in-production"
);

const JWT_ACCESS_EXPIRES_IN = "15m"; // 15 minutes
const JWT_REFRESH_EXPIRES_IN = "7d"; // 7 days

export interface JWTPayload {
  sub: string; // user id
  employeeId: string;
  username: string;
  role: "ADMIN" | "SUPERVISOR" | "WORKER";
  iat?: number;
  exp?: number;
}

/**
 * Generate access token
 */
export async function generateAccessToken(
  payload: Omit<JWTPayload, "iat" | "exp">
): Promise<string> {
  return await new SignJWT({
    sub: payload.sub,
    employeeId: payload.employeeId,
    username: payload.username,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_ACCESS_EXPIRES_IN)
    .sign(JWT_SECRET);
}

/**
 * Generate refresh token
 */
export async function generateRefreshToken(
  payload: Omit<JWTPayload, "iat" | "exp">
): Promise<string> {
  return await new SignJWT({
    sub: payload.sub,
    employeeId: payload.employeeId,
    username: payload.username,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_REFRESH_EXPIRES_IN)
    .sign(JWT_SECRET);
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      sub: payload.sub as string,
      employeeId: payload.employeeId as string,
      username: payload.username as string,
      role: payload.role as "ADMIN" | "SUPERVISOR" | "WORKER",
      iat: payload.iat as number | undefined,
      exp: payload.exp as number | undefined,
    };
  } catch {
    throw new Error("Invalid or expired token");
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(payload: JWTPayload): boolean {
  if (!payload.exp) return true;
  return Date.now() >= payload.exp * 1000;
}
