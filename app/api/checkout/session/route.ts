import {randomUUID,randomBytes,createHash} from "crypto";
import {NextRequest,NextResponse} from "next/server";
import {db} from "../../../../lib/db";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 try{
 const j=await req.json();
 const catalog=JSON.parse(process.env.PORTUGAL_CATALOG_JSON||"{}");
 const sku=j?.sku;
 const qty=j?.quantity;
 if(typeof sku!=="string"||!Object.prototype.hasOwnProperty.call(catalog,sku)||!Number.isInteger(qty)||qty<1||qty>10)return NextResponse.json({error:"Carrinho inválido."},{status:400});
 const item=catalog[sku];
 if(!item||!Number.isSafeInteger(item.price_cents)||item.price_cents<1)return NextResponse.json({error:"Catálogo não configurado."},{status:503});
 const id=randomUUID(), token=randomBytes(32).toString("hex"), hash=createHash("sha256").update(token).digest("hex");
 await db().query("INSERT INTO checkout_sessions(id,token_hash,store_id,sku,quantity) VALUES($1,$2,'fabrica-portugal',$3,$4)",[id,hash,sku,qty]);
 const response=NextResponse.json({session:id,description:item.description||sku,amount:item.price_cents*qty,currency:"EUR"});
 response.cookies.set("rc_checkout",token,{httpOnly:true,secure:true,sameSite:"strict",path:"/api/checkout",maxAge:86400});
 return response;
 }catch{return NextResponse.json({error:"Não foi possível iniciar a compra."},{status:503});}
}
