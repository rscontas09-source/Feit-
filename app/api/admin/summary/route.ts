import {NextRequest,NextResponse} from "next/server";
import {authorized} from "../../../../lib/auth";
import {db} from "../../../../lib/db";
export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:"Não autorizado"},{status:401});
 const store=req.nextUrl.searchParams.get("store");
 if(!["fabrica-portugal","loja-brasil"].includes(store||""))return NextResponse.json({error:"Loja inválida"},{status:400});
 try {
  const [orders,events]=await Promise.all([
   db().query("SELECT id,external_reference,method,amount,amount_refunded,currency,status,customer_name,customer_email,shipping_status,tracking_code,carrier,created_at FROM orders WHERE store_id=$1 ORDER BY created_at DESC LIMIT 100",[store]),
   db().query("SELECT event_type,count(*)::int AS total FROM events WHERE store_id=$1 AND received_at >= now()-interval '30 days' GROUP BY event_type",[store])
  ]);
  const records=orders.rows;
  const paid=records.filter(x=>x.status==="paid");
  return NextResponse.json({store,period:"Últimos 30 dias para eventos; até 100 pedidos recentes",metrics:{paid_orders:paid.length,revenue_minor:paid.reduce((a,x)=>a+Number(x.amount)-Number(x.amount_refunded),0),pending:records.filter(x=>["pending","awaiting_payment"].includes(x.status)).length,events:Object.fromEntries(events.rows.map(x=>[x.event_type,x.total]))},orders:records});
 }catch{return NextResponse.json({error:"Banco de dados indisponível"},{status:503});}
}
