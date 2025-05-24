"use server"

import { prisma } from "@/db/prisma"
import { removeAuthCookie, setAuthCookie, signAuthToken } from "@/lib/auth"
import { logEvent } from "@/utils/sentry"
import bcrypt from "bcryptjs"

type ResponseResult = {
  success: boolean
  message: string
}

// Register user
export const registerUser = async(
  prevState: ResponseResult, 
  formData: FormData
): Promise<ResponseResult> => {
  
  try {
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
  
    if(!name || !email || !password) {
      logEvent(
        "validation Error: Missing fields", 
        "auth", 
        { name, email }, 
        "warning"
      )

      return {
        success: false,
        message: "All fields are required",
      }
    } 
  
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      logEvent(
        `Registration failed: User already exists - ${email}`,
        'auth',
        { email },
        'warning'
      );

      return { success: false, message: 'User already exists' };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // Sign and set auth token
    const token = await signAuthToken({ userId: user.id });
    await setAuthCookie(token);

    logEvent(
      `User registered succcessfully: ${email}`,
      'auth',
      { userId: user.id, email },
      'info'
    );

    return { success: true, message: 'Registration' };

  } catch (error) {
    logEvent(
      'Unexpected error during registration',
      'auth',
      {},
      'error',
      error
    );
    return { success: false, message: 'Something went wrong, please try again' };
  }
  
}

// Log user out and remove auth cookie
export async function logoutUser(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    await removeAuthCookie();

    logEvent('User logged out successfully', 'auth', {}, 'info');

    return { success: true, message: 'Logout Successful' };
  } catch (error) {
    logEvent('Unexpected error during logout', 'auth', {}, 'error', error);

    return { success: false, message: 'Logout failed. Please try again' };
  }
}