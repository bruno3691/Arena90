const SOURCE = 'https://futemais.link/app2/';
const SOURCE_HTTP = 'http://futemais.link/app2/';

const competitionPatterns = [
  'Campeonato Brasileiro Série A','Campeonato Brasileiro Serie A',
  'Campeonato Brasileiro Série B','Campeonato Brasileiro Serie B',
  'Campeonato Brasileiro Série C','Campeonato Brasileiro Serie C',
  'Campeonato Brasileiro Série D','Campeonato Brasileiro Serie D',
  'Copa Sul-Americana','Copa do Brasil','Copa Libertadores','Libertadores',
  'Champions League','Europa League','Conference League','Premier League',
  'Campeonato Inglês','Campeonato Ingles','Inglês','Ingles',
  'Campeonato Espanhol','Espanhol','La Liga',
  'Campeonato Italiano','Italiano','Serie A',
  'Bundesliga','Ligue 1','Campeonato Francês','Campeonato Frances',
  'Campeonato Português','Campeonato Portugues','Liga Portugal',
  'Campeonato Argentino','Argentino','Mundial de Clubes','Amistoso','Feminino'
].sort((a,b)=>b.length-a.length);

function decodeEntities(value='') {
  return value
    .replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"')
    .replace(/&#(?:39|x27);/gi,"'")
    .replace(/&aacute;/gi,'á').replace(/&eacute;/gi,'é').replace(/&iacute;/gi,'í')
    .replace(/&oacute;/gi,'ó').replace(/&uacute;/gi,'ú').replace(/&ccedil;/gi,'ç')
    .replace(/&atilde;/gi,'ã').replace(/&otilde;/gi,'õ');
}

function clean(value='') {
  return decodeEntities(String(value))
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]*>/g,' ')
    .replace(/\u00a0/g,' ')
    .replace(/\s+/g,' ')
    .replace(/(?:\s*\.\s*){2,}$/g,'')
    .trim();
}

function parseGame(raw, href='') {
  const text = clean(raw);
  const m = text.match(/\b([0-2]?\d:[0-5]\d)\b/);
  if (!m || m.index == null) return null;

  const time = m[1].padStart(5,'0');
  const left = clean(text.slice(0,m.index));
  let away = clean(text.slice(m.index + m[0].length))
    .replace(/^[\s•|\-–—:]+|[\s•|\-–—:.]+$/g,'')
    .trim();

  let home = left;
  let competition = 'Futebol';

  for (const pattern of competitionPatterns) {
    const idx = left.toLocaleLowerCase('pt-BR').indexOf(pattern.toLocaleLowerCase('pt-BR'));
    if (idx > -1) {
      home = clean(left.slice(0,idx));
      competition = clean(left.slice(idx));
      break;
    }
  }

  if (!home || !away) return null;
  if (home.length > 80 || away.length > 80) return null;
  return { home, away, competition, time, href };
}

function extractDate(text='') {
  const normalized = clean(text);
  const m = normalized.match(/(?:HOJE\s+)?(\d{2}\/\d{2}\/\d{4})/i);
  return m?.[1] || null;
}

function parseHtml(html) {
  const games = [];
  const anchorRe = /<a\b([^>]*?)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRe.exec(html))) {
    const rawHref = match[2] || '';
    let href = rawHref;
    try { href = new URL(rawHref, SOURCE).href; } catch (_) {}
    const game = parseGame(match[4], href);
    if (game) games.push(game);
  }

  // Fallback for HTML variants where the schedule is not inside anchors.
  if (!games.length) {
    const expanded = html
      .replace(/<br\s*\/?\s*>/gi,'\n')
      .replace(/<\/(?:a|div|li|p|tr|section)>/gi,'\n');
    for (const line of expanded.split(/\n+/)) {
      if (!/\b[0-2]?\d:[0-5]\d\b/.test(line)) continue;
      const game = parseGame(line);
      if (game) games.push(game);
    }
  }

  return { date: extractDate(html), games: uniqueGames(games) };
}

function parsePlainText(text) {
  const games = [];
  const lines = String(text)
    .replace(/\r/g,'\n')
    .split(/\n+/)
    .map(line => line.replace(/^\s*[-*#>]+\s*/,'').trim())
    .filter(Boolean);

  for (const line of lines) {
    if (!/\b[0-2]?\d:[0-5]\d\b/.test(line)) continue;
    const game = parseGame(line);
    if (game) games.push(game);
  }

  return { date: extractDate(text), games: uniqueGames(games) };
}

function uniqueGames(games) {
  return [...new Map(games.map(g => [`${g.home}|${g.away}|${g.time}`, g])).values()]
    .sort((a,b)=>a.time.localeCompare(b.time));
}

async function fetchWithTimeout(url, options={}, timeoutMs=12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, redirect:'follow', signal:controller.signal });
    const body = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status} em ${url}`);
    return { body, contentType: response.headers.get('content-type') || '' };
  } finally {
    clearTimeout(timer);
  }
}

async function getSchedule() {
  const browserHeaders = {
    'accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language':'pt-BR,pt;q=0.9,en;q=0.8',
    'cache-control':'no-cache',
    'pragma':'no-cache',
    'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'
  };

  const attempts = [
    {
      name:'direto-https',
      url:SOURCE,
      parse:parseHtml,
      options:{ headers:browserHeaders }
    },
    {
      name:'direto-http',
      url:SOURCE_HTTP,
      parse:parseHtml,
      options:{ headers:browserHeaders }
    },
    {
      name:'jina-reader',
      url:`https://r.jina.ai/http://futemais.link/app2/`,
      parse:parsePlainText,
      options:{ headers:{ 'accept':'text/plain', 'user-agent':browserHeaders['user-agent'] } }
    },
    {
      name:'allorigins',
      url:`https://api.allorigins.win/raw?url=${encodeURIComponent(SOURCE)}`,
      parse:parseHtml,
      options:{ headers:{ 'accept':'text/html,*/*', 'user-agent':browserHeaders['user-agent'] } }
    }
  ];

  const errors = [];
  for (const attempt of attempts) {
    try {
      const { body } = await fetchWithTimeout(attempt.url, attempt.options);
      const parsed = attempt.parse(body);
      if (parsed.games.length) {
        return { ...parsed, via:attempt.name };
      }
      errors.push(`${attempt.name}: resposta sem jogos`);
    } catch (error) {
      errors.push(`${attempt.name}: ${error?.name === 'AbortError' ? 'timeout' : String(error?.message || error)}`);
    }
  }

  const err = new Error('Nenhuma rota conseguiu consultar a programação.');
  err.attempts = errors;
  throw err;
}

module.exports = async function handler(req,res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Content-Type','application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers','Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error:'Método não permitido', games:[] });
  }

  try {
    const data = await getSchedule();
    res.setHeader('Cache-Control','s-maxage=120, stale-while-revalidate=300');
    return res.status(200).json({
      source:SOURCE,
      via:data.via,
      date:data.date,
      updatedAt:new Date().toISOString(),
      games:data.games
    });
  } catch (error) {
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({
      error:'Não foi possível consultar a programação.',
      details:String(error?.message || error),
      attempts:Array.isArray(error?.attempts) ? error.attempts : [],
      source:SOURCE,
      games:[]
    });
  }
};
