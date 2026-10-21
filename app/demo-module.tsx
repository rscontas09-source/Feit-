"use client";
import {useState} from "react";
type Shop="pt"|"br";
type Order={id:string;client:string;email:string;total:number;status:"Pendente"|"Pago"|"Enviado";method:string;tracking:string;carrier:string};
const seed:Record<Shop,Order[]>={
pt:[
{id:"PT-001",client:"Maria Oliveira",email:"maria@example.com",total:49.9,status:"Pendente",method:"MB WAY",tracking:"",carrier:""},
{id:"PT-002",client:"João Silva",email:"joao@example.com",total:79.9,status:"Pago",method:"Multibanco",tracking:"",carrier:""},
{id:"PT-003",client:"Ana Costa",email:"ana@example.com",total:119,status:"Enviado",method:"MB WAY",tracking:"PT-DEMO-001",carrier:"CTT"}],
br:[
{id:"BR-001",client:"Pedro Almeida",email:"pedro@example.com",total:159,status:"Pago",method:"Pix",tracking:"",carrier:""},
{id:"BR-002",client:"Carla Santos",email:"carla@example.com",total:89,status:"Pendente",method:"Pix",tracking:"",carrier:""}]
};
export default function DemoModule({active,shop}:{active:string;shop:Shop}){
const [orders,setOrders]=useState(seed);
const [filter,setFilter]=useState("Todos");
const [selected,setSelected]=useState<string|null>(null);
const [code,setCode]=useState("");
const [carrier,setCarrier]=useState("");
const [saved,setSaved]=useState("");
const list=orders[shop];
const money=(n:number)=>new Intl.NumberFormat(shop==="pt"?"pt-PT":"pt-BR",{style:"currency",currency:shop==="pt"?"EUR":"BRL"}).format(n);
const chosen=list.find(x=>x.id===selected);
function saveTracking(){
 if(!chosen||chosen.status==="Pendente"||code.trim().length<3||carrier.trim().length<2)return;
 setOrders(old=>({...old,[shop]:old[shop].map(x=>x.id===selected?{...x,tracking:code.trim(),carrier:carrier.trim(),status:"Enviado"}:x)}));
 setSaved("Rastreio salvo somente nesta demonstração. Nenhum cliente foi notificado.");
 setSelected(null);setCode("");setCarrier("");
}
if(["Pedidos","Pagamentos","Rastreios","Clientes"].includes(active)){
 const visible=list.filter(o=>(filter==="Todos"||o.status===filter)&&(active!=="Rastreios"||o.status!=="Pendente"));
 return <section className="panel" aria-label={active}>
 <div className="panelTitle"><div><h2>{active}</h2><p>Exemplos fictícios — nenhuma ação modifica pedidos reais</p></div></div>
 <div className="filterRow">{["Todos","Pendente","Pago","Enviado"].map(x=><button key={x} className={"filterButton "+(filter===x?"on":"")} onClick={()=>setFilter(x)}>{x}</button>)}</div>
 <div className="dataScroll"><table className="dataTable"><thead><tr><th>Pedido</th><th>Cliente</th><th>Valor</th><th>Pagamento</th><th>Status</th><th>Rastreio</th></tr></thead><tbody>{visible.map(o=><tr key={o.id}><td><strong>{o.id}</strong></td><td>{o.client}<small>{o.email}</small></td><td>{money(o.total)}</td><td>{o.method}</td><td><span className={"statusTag "+o.status}>{o.status}</span></td><td>{o.tracking?<span>{o.carrier}: {o.tracking}</span>:o.status==="Pago"?<button className="actionButton" onClick={()=>{setSelected(o.id);setSaved("");}}>Adicionar</button>:"—"}</td></tr>)}</tbody></table></div>
 {saved&&<p className="inlineNotice">{saved}</p>}
 {chosen&&<div className="trackingForm"><h3>Adicionar rastreio: {chosen.id}</h3><label>Transportadora<input value={carrier} onChange={e=>setCarrier(e.target.value)} placeholder="Ex.: CTT"/></label><label>Código de rastreamento<input value={code} onChange={e=>setCode(e.target.value)} placeholder="Código informado pela transportadora"/></label><div className="actions"><button onClick={saveTracking} className="actionButton" disabled={code.trim().length<3||carrier.trim().length<2}>Salvar demonstração</button><button onClick={()=>setSelected(null)}>Cancelar</button></div><p>Nenhum e-mail é enviado neste modo. Ao atualizar a página, os exemplos voltam ao estado original.</p></div>}
 </section>;
}
if(active==="E-mails")return <section className="panel"><h2>Automações de e-mail</h2><p className="sectionIntro">Modelos prontos para personalização. Disparos desativados até termos provedor de e-mail, confirmação de pagamento e configuração de privacidade.</p><div className="templateGrid">{[["Pagamento pendente","Instruções para finalizar MB WAY, Multibanco ou Pix."],["Pagamento aprovado","Confirmação do pedido e próximos passos."],["Pedido enviado","Aviso de expedição com transportadora e rastreio."],["Pagamento expirado","Mensagem informativa, sem cobrança duplicada."]].map(([title,desc])=><article className="templateCard" key={title}><strong>{title}</strong><p>{desc}</p><span className="disabledChip">Aguardando integração</span></article>)}</div></section>;
if(active==="Integrações")return <section className="panel"><h2>Integrações por loja</h2><p className="sectionIntro">Credenciais e webhooks serão configurados somente no servidor, após o lançamento das interfaces.</p><div className="integrationRows">{[["Portugal","Broski / MB WAY / Multibanco","Aguardando conexão"],["Brasil","Gateway Pix genérico","Aguardando provedor"],["Banco de dados","Supabase PostgreSQL","Aguardando credenciais no servidor"],["E-mail","Provedor transacional","Aguardando configuração"]].map(([country,name,status])=><div className="integrationRow" key={country}><div><strong>{country}</strong><small>{name}</small></div><span className="disabledChip">{status}</span></div>)}</div></section>;
return <section className="panel"><h2>Funil de vendas</h2><p>O gráfico consolidado aparecerá quando os eventos reais forem recebidos. Os números da Visão geral são demonstrativos.</p></section>;
}