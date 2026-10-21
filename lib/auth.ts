import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
export function authorized(request:NextRequest) {
 const secret=process.env.ADMIN_API_TOKEN;
 const given=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
 if (!secret || !given) return false;
 const a=Buffer.from(given),b=Buffer.from(secret);
 return a.length===b.length && timingSafeEqual(a,b);
}
