import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";

function getConnectionString(): string {
  const direct = process.env.DIRECT_DATABASE_URL;
  if (direct) return direct;

  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return url;
  }

  throw new Error(
    "Set DIRECT_DATABASE_URL to a postgresql:// connection string (required for Prisma driver adapter).",
  );
}

const adapter = new PrismaPg({ connectionString: getConnectionString() });

export const prisma = new PrismaClient({ adapter });
