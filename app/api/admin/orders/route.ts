import {NextRequest,NextResponse} from "next/server";
import {authorized} from "../../../../lib/auth";
import {db} from "../../../../lib/db";
export async function PATCH(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:"Não autorizado"},{status:401});
 let body:any;
 try{body=await req.json();}catch{return NextResponse.json({error:"JSON inválido"},{status:400});}
 const {id,tracking_code,carrier}=body||{};
 if(typeof id!=="string"||id.length>128||typeof tracking_code!=="string"||tracking_code.length<3||tracking_code.length>120||typeof carrier!=="string"||carrier.length<2||carrier.length>100)return NextResponse.json({error:"Dados inválidos"},{status:400});
 try{
 const result=await db().query("UPDATE orders SET tracking_code=$1,carrier=$2,shipping_status='shipped',updated_at=now() WHERE id=$3 AND status='paid' AND amount_refunded=0 RETURNING id,tracking_code,carrier,shipping_status",[tracking_code,carrier,id]);
 if(!result.rowCount)return NextResponse.json({error:"Pedido não encontrado ou não elegível"},{status:409});
 return NextResponse.json({order:result.rows[0],email_sent:false});
 }catch{return NextResponse.json({error:"Falha ao salvar rastreio"},{status:503});}
}
