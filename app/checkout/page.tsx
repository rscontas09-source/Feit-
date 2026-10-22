"use client";
import {useEffect,useState} from "react";
type Method="mbway"|"multibanco";
type Response={id?:string;status?:string;multibanco?:{entity:string;reference:string;amount:number;expires_at:string};error?:string|{code?:string;message:string;retry_after_seconds?:number}};
export default function Checkout(){
 const [sku,setSku]=useState("");const [qty,setQty]=useState(1),[method,setMethod]=useState<Method>("mbway"),[session,setSession]=useState(false);
 const [amount,setAmount]=useState(0),[description,setDescription]=useState("");
 const [name,setName]=useState(""),[email,setEmail]=useState(""),[phone,setPhone]=useState(""),[line1,setLine1]=useState(""),[postal,setPostal]=useState(""),[city,setCity]=useState("");
 const [loading,setLoading]=useState(false),[answer,setAnswer]=useState<Response>({}),[message,setMessage]=useState("");
 const money=(n:number)=>(n/100).toLocaleString("pt-PT",{style:"currency",currency:"EUR"});
 useEffect(()=>{if(!answer.id||answer.status!=="pending")return;
  const timer=setInterval(async()=>{try{const res=await fetch("/api/checkout/status",{cache:"no-store"});if(res.ok){const data=await res.json();setAnswer(a=>({...a,status:data.status||a.status}));}}catch{}},2500);
  const timeout=setTimeout(()=>{setMessage("O pagamento não foi confirmado no tempo esperado. Verifique o app MB WAY antes de tentar novamente.");clearInterval(timer);},300000);
  return()=>{clearInterval(timer);clearTimeout(timeout)};
 },[answer.id,answer.status]);
 async function start(){setLoading(true);setMessage("");try{
 const r=await fetch("/api/checkout/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sku,quantity:qty})});
 const j=await r.json();if(!r.ok)throw Error(j.error||"Falha ao iniciar sessão");
 setAmount(j.amount);setDescription(j.description);setSession(true);setAnswer({});
 }catch(e){setMessage((e as Error).message)}finally{setLoading(false)}}
 async function pay(){setLoading(true);setMessage("");try{
 const r=await fetch("/api/checkout/order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({method,phone,customer:{name,email,address:{line1,postal_code:postal,city,country:"PT"}}})});
 const j:Response=await r.json();if(!r.ok){setMessage(typeof j.error==="string"?j.error:j.error?.message||"Não foi possível processar o pagamento.");return}
 setAnswer(j);
 }catch{setMessage("Falha de ligação. Confira o estado do pedido antes de reenviar.");}finally{setLoading(false)}}
 const voucher=answer.multibanco,validVoucher=voucher&&Date.parse(voucher.expires_at)>Date.now();
 return <main className="checkoutPage"><div className="checkoutCard"><p className="eyebrow">RC FERRAMENTAS • PORTUGAL</p><h1>Finalizar compra</h1><p className="checkoutSubtitle">Checkout próprio, sem scripts ou redirecionamentos de terceiros.</p><div className="checkoutBadge">Ambiente de integração — configure servidor e catálogo antes de utilizar.</div>
 {!session?<div className="checkoutFields"><label>Código do produto (SKU)<input value={sku} onChange={e=>setSku(e.target.value)} placeholder="SKU do catálogo do servidor"/></label><label>Quantidade<input type="number" min={1} max={10} value={qty} onChange={e=>setQty(Number(e.target.value))}/></label><button onClick={start} disabled={!sku||loading}>{loading?"Aguarde...":"Continuar"}</button></div>:
 answer.status==="paid"?<div className="checkoutResult success"><h2>Pagamento confirmado</h2><p>Seu pedido foi pago e está em processamento.</p><small>Pedido {answer.id}</small></div>:
 answer.status==="awaiting_payment"&&validVoucher?<div className="checkoutResult"><h2>Referência Multibanco</h2><p>Guarde estes dados para efetuar o pagamento.</p><dl><dt>Entidade</dt><dd>{voucher.entity}</dd><dt>Referência</dt><dd>{voucher.reference}</dd><dt>Valor</dt><dd>{money(voucher.amount)}</dd><dt>Válido até</dt><dd>{new Date(voucher.expires_at).toLocaleString("pt-PT")}</dd></dl><p>O pedido só será enviado após confirmação do pagamento.</p></div>:
 answer.status==="pending"&&!message?<div className="checkoutResult"><div className="spinner"/><h2>Confirme o pagamento no app MB WAY do seu telemóvel</h2><p>Aguardando confirmação segura do pagamento.</p><small>Pedido {answer.id}</small></div>:
 <div className="checkoutFields"><div className="purchase"><strong>{description}</strong><strong>{money(amount)}</strong></div><h2>Método de pagamento</h2><div className="paymentChoices"><button className={method==="mbway"?"chosen":""} onClick={()=>setMethod("mbway")}><img src="https://docs.broski.pt/assets/mbway.svg" alt="MB WAY" height="28"/></button><button className={method==="multibanco"?"chosen":""} onClick={()=>setMethod("multibanco")}><img src="https://docs.broski.pt/assets/multibanco.svg" alt="Multibanco" height="40"/></button></div>
 <label>Nome<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label><label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label><label>Telemóvel{method==="mbway"?" MB WAY":""}<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+351 9XXXXXXXX" autoComplete="tel"/></label>
 <label>Morada de entrega<input value={line1} onChange={e=>setLine1(e.target.value)} autoComplete="street-address"/></label><div className="checkoutTwo"><label>Código postal<input placeholder="1000-001" value={postal} onChange={e=>setPostal(e.target.value)}/></label><label>Cidade<input value={city} onChange={e=>setCity(e.target.value)}/></label></div>
 <button onClick={pay} disabled={loading||!email||!line1||!postal||!city||(method==="mbway"&&!phone)}>{loading?"Aguarde...":"Gerar pagamento"}</button>
 </div>}
 {message&&<p className="checkoutError" role="alert">{message}</p>}
 {(answer.status==="failed"||answer.status==="expired"||(answer.status==="awaiting_payment"&&!validVoucher))&&<button onClick={()=>{setAnswer({});setMessage("");}} className="retry">Gerar novo pedido</button>}
 <p className="checkoutLegal">Pagamentos liberados somente depois de confirmação no servidor. Dados demonstrativos devem ser substituídos por produtos reais do catálogo.</p></div></main>;
}
