import { Pool } from "pg";
let pool: Pool | undefined;
export function db() {
 if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada");
 if (!pool) pool = new Pool({connectionString:process.env.DATABASE_URL,ssl: process.env.DATABASE_SSL === "disable" ? false : {rejectUnauthorized:true},max:3});
 return pool;
}
