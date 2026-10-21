import {NextRequest,NextResponse} from "next/server";
import {db} from "../../../../lib/db";
import {verifyBroskiSignature} from "../../../../lib/broski";
export const runtime="nodejs";
const statuses=new Set(["pending","awaiting_payment","paid","failed","expired","refunded"]);
const terminal=new Set(["expired","failed","refunded"]);
export async function POST(request:NextRequest){
 const secret=process.env.BROSKI_WEBHOOK_SECRET;
 if(!secret)return NextResponse.json({error:"Webhook não configurado"},{status:503});
 const raw=Buffer.from(await request.arrayBuffer());
 if(!verifyBroskiSignature(request.headers.get("broski-signature"),raw,secret))return NextResponse.json({error:"Assinatura inválida"},{status:401});
 let event:any;
 try{event=JSON.parse(raw.toString("utf8"));}catch{return NextResponse.json({error:"JSON inválido"},{status:400});}
 const obj=event?.data?.object;
 if(typeof event?.id!=="string"||event.id.length>128)return NextResponse.json({error:"ID inválido"},{status:400});
 if(obj?.object!=="order"||!statuses.has(obj?.status)||typeof obj.id!=="string"||!/^ord_[\w-]+$/.test(obj.id)||obj.currency!=="EUR")return NextResponse.json({ok:true,ignored:true});
 const client=await db().connect();
 try{
  await client.query("BEGIN");
  const inserted=await client.query("INSERT INTO webhook_events(id) VALUES($1) ON CONFLICT DO NOTHING RETURNING id",[event.id]);
  if(!inserted.rowCount){await client.query("COMMIT");return NextResponse.json({ok:true,duplicate:true});}
  const existing=await client.query("SELECT status,amount,amount_refunded FROM orders WHERE id=$1 FOR UPDATE",[obj.id]);
  const prev=existing.rows[0];
  // Nunca regredir de pago ou estornado para pendente; eventos chegam fora de ordem.
  const next=prev?.status==="refunded"?"refunded":prev?.status==="paid"&&obj.status!=="refunded"?"paid":terminal.has(prev?.status)&&["pending","awaiting_payment"].includes(obj.status)?prev.status:obj.status;
  const amount=Number.isSafeInteger(obj.amount)&&obj.amount>=0?obj.amount:prev?.amount??0;
  const refunded=Number.isSafeInteger(obj.amount_refunded)&&obj.amount_refunded>=0?obj.amount_refunded:prev?.amount_refunded??0;
  await client.query(`INSERT INTO orders(id,store_id,external_reference,method,currency,amount,amount_refunded,status)
  VALUES($1,'fabrica-portugal',$2,$3,'EUR',$4,$5,$6)
  ON CONFLICT(id) DO UPDATE SET
  external_reference=COALESCE(orders.external_reference,EXCLUDED.external_reference),
  method=COALESCE(orders.method,EXCLUDED.method),
  amount=GREATEST(orders.amount,EXCLUDED.amount),
  amount_refunded=GREATEST(orders.amount_refunded,EXCLUDED.amount_refunded),
  status=EXCLUDED.status,updated_at=now()`,[obj.id,obj.external_reference||null,obj.method||null,amount,refunded,next]);
  await client.query("UPDATE checkout_sessions SET current_order_id=$1,current_status=$2,updated_at=now() WHERE current_order_id=$1 OR last_reference=$3",[obj.id,next,obj.external_reference||""]);
  await client.query("COMMIT");
  return NextResponse.json({ok:true});
 }catch{await client.query("ROLLBACK");return NextResponse.json({error:"Falha temporária"},{status:503});}
 finally{client.release();}
}
