import {NextRequest,NextResponse} from "next/server";
import {db} from "../../../lib/db";
const allowed=new Set(["fabrica-portugal","loja-brasil"]);
const types=new Set(["visit","checkout_started"]);
const origins=(process.env.TRACKING_ORIGINS||"").split(",").map(x=>x.trim()).filter(Boolean);
export async function OPTIONS(req:NextRequest) {
 const origin=req.headers.get("origin")||"";
 if(!origins.includes(origin)) return new Response(null,{status:403});
 return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Vary":"Origin"}});
}
export async function POST(req:NextRequest){
 const origin=req.headers.get("origin")||"";
 if(!origins.includes(origin)) return NextResponse.json({error:"Origem não autorizada"},{status:403});
 try {
  const data=await req.json();
  if(!allowed.has(data.store)||!types.has(data.type)||typeof data.path!=="string"||data.path.length>500) return NextResponse.json({error:"Evento inválido"},{status:400});
  await db().query("INSERT INTO events(store_id,event_type,path) VALUES($1,$2,$3)",[data.store,data.type,data.path]);
  return new NextResponse(null,{status:204,headers:{"Access-Control-Allow-Origin":origin,"Vary":"Origin"}});
 }catch{return NextResponse.json({error:"Falha ao registrar"},{status:503});}
}
