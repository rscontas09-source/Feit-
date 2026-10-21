import {createHash} from "crypto";
import {NextRequest,NextResponse} from "next/server";
import {db} from "../../../../lib/db";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 const token=req.cookies.get("rc_checkout")?.value;
 if(!token)return NextResponse.json({error:"Sessão não encontrada"},{status:401});
 const hash=createHash("sha256").update(token).digest("hex");
 try{
 const s=await db().query("SELECT current_order_id,current_status,voucher FROM checkout_sessions WHERE token_hash=$1",[hash]);
 if(!s.rowCount)return NextResponse.json({error:"Sessão não encontrada"},{status:404});
 const session=s.rows[0];
 const status=session.current_order_id?(await db().query("SELECT status FROM orders WHERE id=$1",[session.current_order_id])).rows[0]?.status||session.current_status:null;
 const voucher=session.voucher;
 const validVoucher=status==="awaiting_payment"&&voucher&&Date.parse(voucher.expires_at)>Date.now();
 return NextResponse.json({id:session.current_order_id,status:status||null,multibanco:validVoucher?voucher:undefined},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Consulta indisponível"},{status:503});}
}
