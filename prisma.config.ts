import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join(__dirname, "lib", "prisma", "schema.prisma"),
  datasource: {
    url: `mysql://${process.env.DB_USER ?? "mariadb"}:${process.env.DB_PASS ?? "docker"}@${process.env.DB_HOST ?? "localhost"}:${process.env.DB_PORT ?? 3306}/${process.env.DB_NAME ?? "cwis_preservation"}`,
  },
  // @ts-expect-error migrate adapter required for prisma db pull
  migrate: {
    adapter: async () => {
      const { PrismaMariaDb } = await import("@prisma/adapter-mariadb");
      const connectionString = `mysql://${process.env.DB_USER ?? "mariadb"}:${process.env.DB_PASS ?? "docker"}@${process.env.DB_HOST ?? "localhost"}:${process.env.DB_PORT ?? 3306}/${process.env.DB_NAME ?? "cwis_preservation"}`;
      return new PrismaMariaDb(connectionString);
    },
  },
});