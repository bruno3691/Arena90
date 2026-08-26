const SOURCE = 'https://futemais.link/app2/';
const competitionPatterns = [
  'Campeonato Brasileiro Série A','Campeonato Brasileiro Serie A','Campeonato Brasileiro Série B','Campeonato Brasileiro Serie B','Campeonato Brasileiro Série C','Campeonato Brasileiro Serie C','Campeonato Brasileiro Série D','Campeonato Brasileiro Serie D','Copa Sul-Americana','Copa do Brasil','Copa Libertadores','Libertadores','Champions League','Europa League','Conference League','Premier League','Campeonato Inglês','Campeonato Ingles','Inglês','Ingles','Campeonato Espanhol','Espanhol','La Liga','Campeonato Italiano','Italiano','Serie A','Bundesliga','Ligue 1','Campeonato Francês','Campeonato Frances','Campeonato Português','Campeonato Portugues','Liga Portugal','Campeonato Argentino','Argentino','Mundial de Clubes','Amistoso','Feminino'
].sort((a,b)=>b.length-a.length);
const clean = s => s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&#(?:39|x27);/gi,"'").replace(/&quot;/gi,'"').replace(/\s+/g,' ').replace(/(?:\s*\.\s*){2,}$/g,'').trim();
function parseGame(raw, href=''){
  const text=clean(raw); const m=text.match(/\b([0-2]?\d:[0-5]\d)\b/); if(!m)return null;
  const left=clean(text.slice(0,m.index)); let away=clean(text.slice(m.index+m[0].length)).replace(/^[\s•|\-–—:]+|[\s•|\-–—:.]+$/g,'').trim();
  let home=left, competition='Futebol';
  for(const pattern of competitionPatterns){const idx=left.toLocaleLowerCase('pt-BR').indexOf(pattern.toLocaleLowerCase('pt-BR'));if(idx>-1){home=clean(left.slice(0,idx));competition=clean(left.slice(idx));break;}}
  if(!home||!away)return null; return {home,away,competition,time:m[1].padStart(5,'0'),href};
}
module.exports = async function handler(req,res){
  try{
    const response=await fetch(SOURCE,{headers:{'user-agent':'Mozilla/5.0 Arena90/1.0','accept':'text/html'}});
    if(!response.ok) throw new Error(`Fonte respondeu ${response.status}`);
    const html=await response.text();
    const text=clean(html); const dm=text.match(/HOJE\s+(\d{2}\/\d{2}\/\d{4})/i);
    const games=[]; const re=/<a\b([^>]*?)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi; let match;
    while((match=re.exec(html))){const game=parseGame(match[4], new URL(match[2],SOURCE).href); if(game) games.push(game);}
    const unique=[...new Map(games.map(g=>[`${g.home}|${g.away}|${g.time}`,g])).values()].sort((a,b)=>a.time.localeCompare(b.time));
    res.setHeader('Cache-Control','s-maxage=120, stale-while-revalidate=300');
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.status(200).json({source:SOURCE,date:dm?.[1]||null,updatedAt:new Date().toISOString(),games:unique});
  }catch(error){res.status(502).json({error:'Não foi possível consultar a programação.',details:String(error?.message||error),games:[]});}
}
