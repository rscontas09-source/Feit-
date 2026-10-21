export type Method="mbway"|"multibanco";
export type Address={line1:string;line2?:string;postal_code:string;city:string;region?:string;country?:string};
export type Customer={email:string;name?:string;phone?:string;nif?:string;address?:Address};
export type BroskiPayload={amount:number;method:Method;external_reference:string;checkout_url:string;phone?:string;product_type?:"digital"|"physical";description?:string;customer:Customer};
export const statuses=["pending","awaiting_payment","paid","expired","failed","refunded"] as const;
export function normalizePhone(input:string){
 const n=input.replace(/\s/g,"");
 const p=n.startsWith("+351")?n:"+351"+n;
 if(!/^\+3519[1236][0-9]{7}$/.test(p))throw Error("Introduza um telemóvel português válido.");
 return p;
}
export function validateCustomer(c:Customer,physical:boolean){
 if(!c||typeof c.email!=="string"||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email))throw Error("E-mail inválido.");
 if(physical){
 const a=c.address;
 if(!a||!a.line1?.trim()||!/^\d{4}-\d{3}$/.test(a.postal_code||"")||!a.city?.trim())throw Error("Morada de entrega incompleta.");
 }
}
export function gatewayError(e:any){return typeof e?.error?.message==="string"?e.error.message:"Não foi possível iniciar o pagamento. Tente novamente.";}
export async function createBroskiOrder(payload:BroskiPayload,key:string){
 const secret=process.env.BROSKI_API_KEY;
 if(!secret)throw Error("Integração Broski não configurada.");
 if(!/^[A-Za-z0-9_.-]{1,128}$/.test(key))throw Error("Chave de idempotência inválida.");
 // JSON.stringify cria texto Unicode; TextEncoder garante UTF-8.
 const body=new TextEncoder().encode(JSON.stringify(payload));
 for(let attempt=0;attempt<3;attempt++){
  let res:Response;
  try{res=await fetch("https://api.broski.pt/v1/orders",{method:"POST",headers:{"Authorization":"Bearer "+secret,"Content-Type":"application/json; charset=utf-8","Idempotency-Key":key},body,cache:"no-store",signal:AbortSignal.timeout(9000)});}
  catch(e){if(attempt===2)throw e;await new Promise(r=>setTimeout(r,500*2**attempt));continue;}
  const json=await res.json().catch(()=>({error:{message:"Resposta inesperada do processador de pagamentos."}}));
  if(res.status===429 && attempt<2){await new Promise(r=>setTimeout(r,600*2**attempt));continue;}
  return {httpStatus:res.status,body:json,ok:res.status===201};
 }
 throw Error("Serviço temporariamente indisponível.");
}
