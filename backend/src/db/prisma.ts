import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

export async function connectPrisma(): Promise<void> {
  try {
    await prisma.$connect();
    console.log("[PRISMA] Database connected successfully.");
  } catch (error: any) {
    console.error("[PRISMA] Database connection failed:", error.message);
    throw error;
  }
}

