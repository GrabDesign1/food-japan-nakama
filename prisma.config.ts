// Prisma CLI 設定。Next.js と同じ .env.local を読み込む。
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // マイグレーションは Session pooler(5432) を使う。
    // Transaction pooler(6543/pgbouncer) は prepared statement 非対応でDDLに不向き。
    url: process.env["DIRECT_URL"],
  },
});
