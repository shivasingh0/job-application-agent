"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_js_1 = require("../../generated/prisma/client.js");
function getConnectionString() {
    const direct = process.env.DIRECT_DATABASE_URL;
    if (direct)
        return direct;
    const url = process.env.DATABASE_URL ?? "";
    if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
        return url;
    }
    throw new Error("Set DIRECT_DATABASE_URL to a postgresql:// connection string (required for Prisma driver adapter).");
}
const adapter = new adapter_pg_1.PrismaPg({ connectionString: getConnectionString() });
exports.prisma = new client_js_1.PrismaClient({ adapter });
//# sourceMappingURL=prisma.js.map