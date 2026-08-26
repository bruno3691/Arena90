document.querySelectorAll('[data-scroll]').forEach(btn => btn.addEventListener('click', () => {
  document.getElementById(btn.dataset.scroll)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}));

const menuBtn = document.getElementById('menuBtn');
const nav = document.getElementById('mainNav');
menuBtn?.addEventListener('click', () => nav.classList.toggle('nav-open'));

document.querySelectorAll('.faq-item').forEach(item => item.addEventListener('click', () => {
  document.querySelectorAll('.faq-item').forEach(x => { if (x !== item) x.classList.remove('open'); });
  item.classList.toggle('open');
}));

const GAMES_SOURCE = 'https://futemais.link/app2/';
const dailyGamesEl = document.getElementById('dailyGames');
const gamesDateEl = document.getElementById('gamesDate');
const gamesUpdatedEl = document.getElementById('gamesUpdated');
const showAllGamesBtn = document.getElementById('showAllGames');
const prevGamesBtn = document.getElementById('gamesPrev');
const nextGamesBtn = document.getElementById('gamesNext');

const competitionPatterns = [
  'Campeonato Brasileiro Série A', 'Campeonato Brasileiro Serie A',
  'Campeonato Brasileiro Série B', 'Campeonato Brasileiro Serie B',
  'Campeonato Brasileiro Série C', 'Campeonato Brasileiro Serie C',
  'Campeonato Brasileiro Série D', 'Campeonato Brasileiro Serie D',
  'Copa Sul-Americana', 'Copa do Brasil', 'Copa Libertadores', 'Libertadores',
  'Champions League', 'Europa League', 'Conference League', 'Premier League',
  'Campeonato Inglês', 'Campeonato Ingles', 'Inglês', 'Ingles',
  'Campeonato Espanhol', 'Espanhol', 'La Liga',
  'Campeonato Italiano', 'Italiano', 'Serie A',
  'Bundesliga', 'Ligue 1', 'Campeonato Francês', 'Campeonato Frances',
  'Campeonato Português', 'Campeonato Portugues', 'Liga Portugal',
  'Campeonato Argentino', 'Argentino', 'Mundial de Clubes', 'Amistoso', 'Feminino'
].sort((a, b) => b.length - a.length);

function normalizeText(value = '') {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').replace(/(?:\s*\.\s*){2,}$/g, '').trim();
}

function todayBR() {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric'
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${map.day}/${map.month}/${map.year}`;
}

function nowTimeBR() {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit'
  }).format(new Date());
}

function slugInitials(name) {
  const ignored = new Set(['de', 'da', 'do', 'dos', 'das', 'e', 'fc', 'ec', 'sc', 'clube', 'club']);
  const words = normalizeText(name).split(' ').filter(Boolean);
  const useful = words.filter(w => !ignored.has(w.toLowerCase()));
  if (useful.length === 1) return useful[0].slice(0, 3).toUpperCase();
  return useful.slice(0, 3).map(w => w[0]).join('').toUpperCase();
}

function parseGameText(raw, href = '') {
  let text = normalizeText(raw);
  const timeMatch = text.match(/\b([0-2]?\d:[0-5]\d)\b/);
  if (!timeMatch) return null;
  const time = timeMatch[1].padStart(5, '0');
  const [leftRaw, rightRaw = ''] = text.split(timeMatch[0]);
  const left = normalizeText(leftRaw);
  let away = normalizeText(rightRaw).replace(/^[\s•|\-–—:]+|[\s•|\-–—:.]+$/g, '').trim();
  let home = left;
  let competition = 'Futebol';

  for (const pattern of competitionPatterns) {
    const idx = left.toLocaleLowerCase('pt-BR').indexOf(pattern.toLocaleLowerCase('pt-BR'));
    if (idx > -1) {
      home = normalizeText(left.slice(0, idx));
      competition = normalizeText(left.slice(idx));
      break;
    }
  }

  if (!home || !away) return null;
  return { home, away, competition, time, href };
}

function parseSourceHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const bodyText = normalizeText(doc.body?.textContent || '');
  const dateMatch = bodyText.match(/HOJE\s+(\d{2}\/\d{2}\/\d{4})/i);
  const date = dateMatch?.[1] || todayBR();
  const games = [];

  [...doc.querySelectorAll('a[href]')].forEach(a => {
    const href = a.getAttribute('href') || '';
    const text = normalizeText(a.textContent || '');
    if (!/\b[0-2]?\d:[0-5]\d\b/.test(text)) return;
    const game = parseGameText(text, href);
    if (game) games.push(game);
  });

  const unique = [...new Map(games.map(g => [`${g.home}|${g.away}|${g.time}`, g])).values()];
  return { date, games: unique };
}

async function fetchJson(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

async function fetchText(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally { clearTimeout(timer); }
}

async function getDailyGames() {
  const providers = [
    async () => fetchJson('/api/jogos'),
    async () => fetchJson('jogos-proxy.php'),
    async () => parseSourceHtml(await fetchText(GAMES_SOURCE))
  ];

  let lastError;
  for (const provider of providers) {
    try {
      const data = await provider();
      if (data?.games?.length) return data;
    } catch (error) { lastError = error; }
  }
  throw lastError || new Error('Agenda indisponível');
}

function gameStatus(time) {
  const [h, m] = time.split(':').map(Number);
  const nowParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date()).split(':').map(Number);
  const gameMinutes = h * 60 + m;
  const nowMinutes = nowParts[0] * 60 + nowParts[1];
  const diff = nowMinutes - gameMinutes;
  if (diff >= 0 && diff <= 130) return { label: '● AO VIVO / AGORA', live: true };
  if (diff < 0) return { label: `HOJE • ${time}`, live: false };
  return { label: 'ENCERRADO / INICIADO', live: false, past: true };
}

function createGameCard(game) {
  const article = document.createElement('article');
  article.className = 'live-card dynamic-game-card';
  const status = gameStatus(game.time);
  if (status.live) article.classList.add('is-live');
  if (status.past) article.classList.add('is-past');

  const home = document.createElement('div');
  home.className = 'team';
  home.innerHTML = `<div class="crest auto-crest">${slugInitials(game.home)}</div><small>${escapeHtml(game.home)}</small>`;

  const center = document.createElement('div');
  center.className = 'score schedule-score';
  center.innerHTML = `<strong>${escapeHtml(game.time)}</strong><span class="${status.live ? 'status-live' : ''}">${escapeHtml(status.label)}</span><em>×</em>`;

  const away = document.createElement('div');
  away.className = 'team';
  away.innerHTML = `<div class="crest auto-crest away-crest">${slugInitials(game.away)}</div><small>${escapeHtml(game.away)}</small>`;

  const league = document.createElement('div');
  league.className = 'league';
  league.textContent = game.competition || 'Futebol';

  article.append(home, center, away, league);
  article.setAttribute('aria-label', `${game.home} contra ${game.away}, ${game.time}`);
  return article;
}

function escapeHtml(str = '') {
  return str.replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

function renderGames(data) {
  const games = Array.isArray(data.games) ? data.games : [];
  dailyGamesEl.innerHTML = '';
  dailyGamesEl.setAttribute('aria-busy', 'false');

  if (!games.length) {
    dailyGamesEl.innerHTML = '<div class="games-error"><strong>Nenhum jogo encontrado na programação de hoje.</strong><span>Tente atualizar novamente em alguns instantes.</span></div>';
    return;
  }

  games.sort((a, b) => a.time.localeCompare(b.time));
  games.forEach(game => dailyGamesEl.appendChild(createGameCard(game)));
  gamesDateEl.textContent = data.date ? `• ${data.date}` : '';
  gamesUpdatedEl.textContent = `Atualizado às ${nowTimeBR()}`;
  dailyGamesEl.dataset.count = String(games.length);

  const currentDate = todayBR();
  if (data.date && data.date !== currentDate) {
    gamesUpdatedEl.textContent = `Fonte exibindo ${data.date}`;
    gamesUpdatedEl.classList.add('source-warning');
  } else {
    gamesUpdatedEl.classList.remove('source-warning');
  }
}

function renderGamesError() {
  dailyGamesEl.setAttribute('aria-busy', 'false');
  dailyGamesEl.innerHTML = `<div class="games-error"><strong>Não foi possível atualizar a agenda agora.</strong><span>A programação é carregada automaticamente do Futemais quando a página está online.</span><button type="button" id="retryGames">TENTAR NOVAMENTE</button></div>`;
  gamesUpdatedEl.textContent = 'Agenda temporariamente indisponível';
  document.getElementById('retryGames')?.addEventListener('click', loadDailyGames);
}

async function loadDailyGames() {
  if (!dailyGamesEl) return;
  dailyGamesEl.setAttribute('aria-busy', 'true');
  gamesUpdatedEl.textContent = 'Atualizando agenda…';
  try {
    const data = await getDailyGames();
    renderGames(data);
  } catch (error) {
    console.warn('Arena90: falha ao atualizar jogos', error);
    renderGamesError();
  }
}

function scrollGames(direction) {
  const card = dailyGamesEl?.querySelector('.live-card:not(.game-skeleton)');
  const amount = card ? card.getBoundingClientRect().width + 16 : 320;
  dailyGamesEl?.scrollBy({ left: direction * amount, behavior: 'smooth' });
}
prevGamesBtn?.addEventListener('click', () => scrollGames(-1));
nextGamesBtn?.addEventListener('click', () => scrollGames(1));

showAllGamesBtn?.addEventListener('click', () => {
  const expanded = dailyGamesEl.classList.toggle('show-all');
  showAllGamesBtn.textContent = expanded ? 'MOSTRAR MENOS' : 'VER TODOS OS JOGOS';
  if (expanded) dailyGamesEl.scrollTo({ left: 0, behavior: 'smooth' });
});

loadDailyGames();
setInterval(loadDailyGames, 5 * 60 * 1000);
