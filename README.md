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

## APIs adicionadas
- `GET /api/health` — status da aplicação
- `POST /api/events` — recebe eventos de páginas previamente autorizadas (somente após consentimento, quando aplicável)
- `POST /api/webhooks/broski` — processa webhooks com assinatura verificada e deduplicação
- `GET /api/admin/summary?store=fabrica-portugal` — relatório JSON protegido por `Authorization: Bearer ADMIN_API_TOKEN`
- `PATCH /api/admin/orders` — registra rastreio em pedido pago, igualmente protegido

## Requisitos antes de usar em produção
1. Configure banco PostgreSQL, execute `db/schema.sql` e preencha `DATABASE_URL` no servidor.
2. Configure `BROSKI_WEBHOOK_SECRET` e cadastre HTTPS `/api/webhooks/broski` no painel Broski; confirme os eventos testando assinaturas.
3. Configure `ADMIN_API_TOKEN` longo e aleatório, sem divulgá-lo ao frontend; crie autenticação de usuários com sessões antes de operar pelo navegador.
4. Faça uma conciliação inicial com pedidos existentes da Broski, validando quais dados do comprador são expostos ao lojista na API.
5. E-mails automáticos ainda não estão implementados e exigirão provedor, regras de consentimento, templates e mecanismo de fila/retry.
6. A interface atual é demonstrativa e não consome as APIs de relatório. Não confunda números de exemplo com vendas reais.
7. As páginas existentes não foram alteradas. O código de rastreio será instalado posteriormente com domínio definido e políticas LGPD/RGPD.
8. Hospedagem, variáveis de ambiente e testes end-to-end ainda não foram executados.
