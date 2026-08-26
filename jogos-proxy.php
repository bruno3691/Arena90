<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
$source = 'https://futemais.link/app2/';
$ch = curl_init($source);
curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_FOLLOWLOCATION=>true, CURLOPT_TIMEOUT=>15, CURLOPT_USERAGENT=>'Mozilla/5.0 Arena90/1.0', CURLOPT_SSL_VERIFYPEER=>true]);
$html = curl_exec($ch); $http = curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
if (!$html || $http >= 400) { http_response_code(502); echo json_encode(['error'=>'Não foi possível consultar a programação.','details'=>$err ?: ('HTTP '.$http),'games'=>[]], JSON_UNESCAPED_UNICODE); exit; }
libxml_use_internal_errors(true); $dom = new DOMDocument(); @$dom->loadHTML('<?xml encoding="utf-8" ?>'.$html); $xpath = new DOMXPath($dom);
function norm_text($s){ $s=html_entity_decode($s, ENT_QUOTES|ENT_HTML5, 'UTF-8'); $s=preg_replace('/\s+/u',' ', $s); $s=preg_replace('/(?:\s*\.\s*){2,}$/u','',$s); return trim($s); }
$patterns=['Campeonato Brasileiro Série A','Campeonato Brasileiro Serie A','Campeonato Brasileiro Série B','Campeonato Brasileiro Serie B','Campeonato Brasileiro Série C','Campeonato Brasileiro Serie C','Campeonato Brasileiro Série D','Campeonato Brasileiro Serie D','Copa Sul-Americana','Copa do Brasil','Copa Libertadores','Libertadores','Champions League','Europa League','Conference League','Premier League','Campeonato Inglês','Campeonato Ingles','Inglês','Ingles','Campeonato Espanhol','Espanhol','La Liga','Campeonato Italiano','Italiano','Serie A','Bundesliga','Ligue 1','Campeonato Francês','Campeonato Frances','Campeonato Português','Campeonato Portugues','Liga Portugal','Campeonato Argentino','Argentino','Mundial de Clubes','Amistoso','Feminino'];
usort($patterns, fn($a,$b)=>mb_strlen($b)<=>mb_strlen($a));
$bodyText=norm_text($dom->textContent); $date=null; if(preg_match('/HOJE\s+(\d{2}\/\d{2}\/\d{4})/iu',$bodyText,$dm))$date=$dm[1];
$games=[]; $seen=[];
foreach($xpath->query('//a[@href]') as $a){ $text=norm_text($a->textContent); if(!preg_match('/\b([0-2]?\d:[0-5]\d)\b/u',$text,$tm,PREG_OFFSET_CAPTURE))continue; $time=str_pad($tm[1][0],5,'0',STR_PAD_LEFT); $pos=$tm[0][1]; $left=norm_text(substr($text,0,$pos)); $away=norm_text(substr($text,$pos+strlen($tm[0][0]))); $away=trim($away," \t\n\r\0\x0B.•|-–—:"); $home=$left; $competition='Futebol'; foreach($patterns as $pattern){ $idx=mb_stripos($left,$pattern,0,'UTF-8'); if($idx!==false){$home=norm_text(mb_substr($left,0,$idx,'UTF-8'));$competition=norm_text(mb_substr($left,$idx,null,'UTF-8'));break;}} if(!$home||!$away)continue; $href=$a->getAttribute('href'); if(!preg_match('#^https?://#i',$href)){ $href=rtrim($source,'/').'/'.ltrim($href,'/'); } $key=$home.'|'.$away.'|'.$time; if(isset($seen[$key]))continue; $seen[$key]=true; $games[]=['home'=>$home,'away'=>$away,'competition'=>$competition,'time'=>$time,'href'=>$href]; }
usort($games, fn($a,$b)=>strcmp($a['time'],$b['time'])); echo json_encode(['source'=>$source,'date'=>$date,'updatedAt'=>gmdate('c'),'games'=>$games], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
