# Arena90 — Página de Vendas

## Agenda automática de jogos

A seção **JOGOS DE HOJE** foi preparada para sincronizar a programação publicada em:

`https://futemais.link/app2/`

A página tenta atualizar os dados nesta ordem:

1. `/api/jogos` — função serverless para Vercel (`api/jogos.js`).
2. `jogos-proxy.php` — alternativa para hospedagens com PHP/cURL.
3. Consulta direta pelo navegador — funciona apenas se o site de origem permitir CORS.

A agenda é atualizada automaticamente a cada 5 minutos enquanto a página estiver aberta.

### Vercel

Envie toda a pasta para um projeto Vercel. A função `api/jogos.js` será disponibilizada em `/api/jogos` automaticamente.

### Hospedagem PHP

Envie todos os arquivos preservando `jogos-proxy.php` no mesmo diretório do `index.html`. O servidor precisa ter PHP com cURL habilitado.

### Observação

Os cartões usam a fonte externa apenas para montar a agenda (times, horário e competição). Eles não redirecionam o visitante para a fonte externa.

## Checkout

No `index.html`, substitua o `href` do elemento com id `checkoutLink` pelo endereço real do checkout.
