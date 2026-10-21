import {createHmac,timingSafeEqual} from "crypto";
export function verifyBroskiSignature(header:string|null,raw:Buffer,secret:string) {
 const match=/^t=(\d+),v1=([0-9a-f]{64})$/.exec(header||"");
 if(!match) return false;
 const [,timestamp,signature]=match;
 if(Math.abs(Date.now()/1000-Number(timestamp))>300) return false;
 const expected=createHmac("sha256",secret).update(timestamp+".").update(raw).digest("hex");
 return timingSafeEqual(Buffer.from(signature,"hex"),Buffer.from(expected,"hex"));
}
export async function broskiOrder(id:string){
 const key=process.env.BROSKI_API_KEY;
 if(!key) throw new Error("BROSKI_API_KEY ausente");
 if(!/^ord_[\w-]+$/.test(id)) throw new Error("ID inválido");
 const r=await fetch("https://api.broski.pt/v1/orders/"+encodeURIComponent(id),{headers:{Authorization:"Bearer "+key},cache:"no-store"});
 if(!r.ok) throw new Error("Broski: "+r.status);
 return r.json();
}
