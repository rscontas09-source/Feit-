# RC Ferramentas — Painel Administrativo

Painel multi-lojas para Portugal (Broski: MB WAY e Multibanco) e Brasil (API Pix configurável).

## Escopo
- Lojas independentes, moedas EUR e BRL
- Visão geral, funil de vendas, pagamentos e pedidos
- Gestão manual de rastreios e notificações de e-mail
- Preparação para integração segura por API e webhooks

> Atenção: o painel inicial usa dados de demonstração. Não representa vendas reais. Não publique chaves de API neste repositório.

## Desenvolvimento
Projeto Next.js com App Router. Instale as dependências com `npm install` e execute `npm run dev`.

## Integrações a implementar
A integração Broski deve ser realizada exclusivamente no backend, após validação da documentação e das credenciais. Webhooks devem ter autenticidade validada e processamento idempotente. O provedor Pix brasileiro ainda será escolhido. E-mails transacionais serão enviados por serviço autorizado após consentimento e configuração do domínio.
