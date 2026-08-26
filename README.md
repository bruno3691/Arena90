# Arena90 — Página de Vendas

## Agenda automática de jogos

A seção **JOGOS DE HOJE** consulta a programação publicada em:

`https://futemais.link/app2/`

### Vercel (recomendado para este pacote)

O navegador chama somente `/api/jogos`. A função serverless faz a consulta no backend, evitando o bloqueio de CORS do Futemais.

A função tenta, nesta ordem:

1. Consulta direta via HTTPS ao Futemais.
2. Consulta via HTTP com redirecionamento.
3. Reader/proxy server-side como fallback.
4. Outro proxy server-side como fallback final.

O frontend **não tenta mais acessar `futemais.link` diretamente**, porque esse domínio não envia `Access-Control-Allow-Origin` para o seu domínio.

### Publicação no Vercel

Envie o conteúdo da pasta mantendo:

```text
index.html
styles.css
script.js
vercel.json
api/
  jogos.js
assets/
  hero-match.jpg
```

Depois do deploy, teste primeiro:

`https://SEU-DOMINIO.vercel.app/api/jogos`

O resultado correto é JSON com `games` contendo a agenda. Só depois abra a página principal.

### Hospedagem PHP

Em uma hospedagem que execute PHP, `jogos-proxy.php` continua disponível como fallback. Ele deve ficar no mesmo diretório do `index.html`.

## Correções desta versão

- removido `@import "tailwindcss"` do CSS estático (corrige o 404 `tailwindcss`);
- removida a tentativa de `fetch()` direto para `https://futemais.link/app2/` no navegador (corrige o erro CORS no console);
- reforçada a função `/api/jogos` com múltiplas rotas server-side e timeout;
- cartões não inventam status “AO VIVO” apenas com base no horário; exibem o horário publicado pela fonte;
- a data exibida continua sendo a data publicada pela própria fonte.

## Checkout

No `index.html`, substitua o `href` do elemento com id `checkoutLink` pelo endereço real do checkout.
