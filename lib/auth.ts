import { logEvent } from "@/utils/sentry";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type AuthTokenPayload = {
  userId: string;
};


const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
const cookieName = "auth-token";


// Encrypt and sign token
export const signAuthToken = async(payload: AuthTokenPayload) => {
  try {
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    return token;
  } catch (error) {
    logEvent("Error signing auth token", "auth", {payload}, "error", error);
    throw error;
  }
}

// Decrypt and verify token
export const verifyAuthToken = async <T>(token: string):Promise<T> => {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as T;
  } catch (error) {
    logEvent("Token decryption failed", "auth", {tokenSnippet: token.slice(0, 10)}, "error", error);
    throw new Error("Token decryption failed");
  }
}

// Set auth cookie

export const setAuthCookie = async(token: string) => {
  try {
    const cookieStore = await cookies();
    cookieStore.set(cookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
  } catch (error) {
    logEvent("Failed to set cookie", "auth", {token}, "error", error);
  }
}

// Get auth toke form cookie

export const getAuthCookie = async() => {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName);
  return token?.value;
}

// Delete auth cookie
export const removeAuthCookie = async() => {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(cookieName);
  } catch (error) {
    logEvent("Failed to remove cookie", "auth", {}, "error", error);
  }
}

