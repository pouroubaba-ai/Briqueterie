import { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? "a6a08469fba837b9efe04a15bc76f34da223d04ea6a44052126abe269169eae8");

export async function signToken(userId: number) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.userId as number;
  } catch {
    return null;
  }
}

export async function getUserId(req: NextRequest): Promise<number | null> {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}
