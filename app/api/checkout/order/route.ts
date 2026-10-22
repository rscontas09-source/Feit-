import {createHash} from "crypto";
import {NextRequest,NextResponse} from "next/server";
import {db} from "../../../../lib/db";
import {createBroskiOrder,normalizePhone,validateCustomer,gatewayError,type BroskiPayload} from "../../../../lib/broski-checkout";
export const runtime="nodejs";
const allowedOrigins=(process.env.CHECKOUT_ALLOWED_ORIGINS||"").split(",").map(x=>x.trim()).filter(Boolean);
export async function POST(req:NextRequest){
 const origin=req.headers.get("origin");
 // Endpoint first-party: exige origem HTTPS explicitamente autorizada.
 if(!origin||!allowedOrigins.includes(origin))return NextResponse.json({error:"Origem não autorizada."},{status:403});
 const token=req.cookies.get("rc_checkout")?.value;
 if(!token)return NextResponse.json({error:"Sessão inválida."},{status:401});
 let input:any;
 try{input=await req.json();}catch{return NextResponse.json({error:"Dados inválidos."},{status:400});}
 const method=input?.method;
 if(method!=="mbway"&&method!=="multibanco")return NextResponse.json({error:"Método inválido."},{status:400});
 let phone:string|undefined;
 try{if(method==="mbway")phone=normalizePhone(input.phone||"");}catch(e){return NextResponse.json({error:(e as Error).message},{status:400});}
 const customer=input?.customer;
 try{validateCustomer(customer,true);}catch(e){return NextResponse.json({error:(e as Error).message},{status:400});}
 // Proteção contra URLs e itens manipulados: configuração interna do servidor.
 const checkoutUrl=process.env.PORTUGAL_CHECKOUT_URL;
 if(!checkoutUrl||!/^https:\/\//.test(checkoutUrl)||checkoutUrl.length>1024)return NextResponse.json({error:"Checkout não configurado."},{status:503});
 const catalog=JSON.parse(process.env.PORTUGAL_CATALOG_JSON||"{}");
 const hash=createHash("sha256").update(token).digest("hex");
 const client=await db().connect();
 try{
  await client.query("BEGIN");
  const result=await client.query("SELECT * FROM checkout_sessions WHERE token_hash=$1 FOR UPDATE",[hash]);
  if(!result.rowCount){await client.query("ROLLBACK");return NextResponse.json({error:"Sessão inválida."},{status:401});}
  const s=result.rows[0],item=catalog[s.sku];
  if(!item||!Number.isSafeInteger(item.price_cents)||item.price_cents<1){await client.query("ROLLBACK");return NextResponse.json({error:"Produto indisponível."},{status:503});}
  const amount=item.price_cents*s.quantity;
  if(!Number.isSafeInteger(amount)|| (method==="mbway"&&(amount<50||amount>500000)) ||(method==="multibanco"&&(amount<1||amount>100000000))){await client.query("ROLLBACK");return NextResponse.json({error:"Valor fora do intervalo permitido para este método."},{status:400});}
  // Nunca crie outra tentativa enquanto houver pagamento ativo ou pago.
  if(s.current_status==="paid"||s.current_status==="pending"||s.current_status==="awaiting_payment"){
   await client.query("COMMIT");
   const voucher=s.current_status==="awaiting_payment"&&s.voucher&&Date.parse(s.voucher.expires_at)>Date.now()?s.voucher:undefined;
   return NextResponse.json({id:s.current_order_id,status:s.current_status,multibanco:voucher});
  }
  const base=s.id.replace(/-/g,"").slice(0,28),revision=s.attempt+1;
  const reusableReference=!!s.last_reference && ["payment_failed","mbway_not_active_for_phone","mbway_pending_for_phone","mbway_temporarily_blocked","amount_above_limit","payment_method_unavailable","validation_failed","amount_below_fee"].includes(s.last_error_code);
  const reference=reusableReference?s.last_reference:"rc_"+base+"_t"+revision;
  const idempotency="rc-"+base+"-v"+revision;
  const payload:BroskiPayload={amount,method,external_reference:reference,checkout_url:checkoutUrl,product_type:"physical",customer:{
   email:customer.email,name:customer.name,phone:customer.phone,nif:customer.nif,address:customer.address
  }};
  if(phone)payload.phone=phone;
  if(typeof item.description==="string")payload.description=item.description.slice(0,140);
  let effective=payload,key=idempotency;
  if(["network_unknown","rate_limited","service_unknown"].includes(s.last_error_code)&&s.last_body&&s.last_idempotency_key){
   if(s.last_body!==JSON.stringify(payload)){
    await client.query("ROLLBACK");
    return NextResponse.json({error:"Há uma tentativa anterior sem resultado confirmado. Consulte o status antes de alterar o pedido."},{status:409});
   }
   effective=JSON.parse(s.last_body);key=s.last_idempotency_key;
  }else{
   await client.query("UPDATE checkout_sessions SET attempt=$1,last_body=$2,last_idempotency_key=$3,last_reference=$4,last_error_code='network_unknown',updated_at=now() WHERE id=$5",[revision,JSON.stringify(payload),idempotency,reference,s.id]);
  }
  // Grave antes da rede: se houver timeout, o replay usa bytes e chave idênticos.
  await client.query("COMMIT");
  // A mesma chave com o mesmo corpo evita duplicidade mesmo em pedidos concorrentes.
  const response=await createBroskiOrder(effective,key);
  if(response.ok){
   const o=response.body;
   if(typeof o.id!=="string"||!["pending","awaiting_payment"].includes(o.status)||o.external_reference!==effective.external_reference){
    return NextResponse.json({error:"Resposta inesperada; consulte o suporte antes de tentar novamente."},{status:502});
   }
   const voucher=method==="multibanco"?o.multibanco||null:null;
   await db().query("INSERT INTO orders(id,store_id,external_reference,method,currency,amount,status,customer_email) VALUES($1,'fabrica-portugal',$2,$3,'EUR',$4,$5,$6) ON CONFLICT (id) DO NOTHING",[o.id,effective.external_reference,method,amount,o.status,customer.email]);
   await db().query("UPDATE checkout_sessions SET current_order_id=$1,current_status=$2,voucher=$3,customer_email=$4,last_error_code=NULL,updated_at=now() WHERE id=$5",[o.id,o.status,JSON.stringify(voucher),customer.email,s.id]);
   return NextResponse.json({id:o.id,status:o.status,...(voucher?{multibanco:voucher}:{})},{status:201});
  }
  const error=response.body?.error;
  const code=error?.code||"payment_error";
  // Para erros sem criação (402/409 telefone, 400), referência pode ser reutilizada.
  // Próxima alteração de payload exige CHAVE NOVA; retire a chave anterior.
  await db().query("UPDATE checkout_sessions SET last_error_code=$1,last_error_message=$2,updated_at=now() WHERE id=$3",[code,gatewayError(response.body),s.id]);
  return NextResponse.json({error:{code,message:gatewayError(response.body),retry_after_seconds:error?.retry_after_seconds}},{status:response.httpStatus});
 }catch(e){
  try{await client.query("ROLLBACK");}catch{}
  return NextResponse.json({error:"Não foi possível confirmar a solicitação. Não repita a compra imediatamente; consulte o status."},{status:503});
 }finally{client.release();}
}
