// api/view.js
// Lee datos compactos desde ?d= (base64url)

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function bulletList(arr, cls='') {
  if (!arr || !arr.length) return '<li class="empty-li">—</li>';
  return arr.map(i => `<li class="${cls}">${esc(i)}</li>`).join('');
}
function badge(tipo) {
  return {
    tendencial: { label:'Tendencial', color:'#1A5FA8', bg:'#EAF1FB', icon:'→' },
    optimista:  { label:'Optimista',  color:'#1A7A3C', bg:'#E8F5EC', icon:'↑' },
    adverso:    { label:'Adverso',    color:'#C8102E', bg:'#FDF0F2', icon:'↓' },
  }[tipo] || { label: tipo, color:'#555', bg:'#f0f0f0', icon:'•' };
}

function scenarioCard(sc) {
  const b = badge(sc.tp);
  return `
  <section class="scenario-card" style="--sc-color:${b.color};--sc-bg:${b.bg};">
    <div class="sc-header">
      <span class="sc-icon">${b.icon}</span>
      <div class="sc-head-text">
        <span class="sc-tipo-badge" style="background:${b.bg};color:${b.color};">${b.label}</span>
        <h2 class="sc-nombre">${esc(sc.nm)}</h2>
      </div>
    </div>
    <div class="sc-narrativa">${esc(sc.nv)}</div>
    <div class="sc-grid">
      <div class="sc-col">
        <div class="sc-section-label">⚡ Impulsores</div>
        <ul>${bulletList(sc.im,'impulsor')}</ul>
      </div>
      <div class="sc-col">
        <div class="sc-section-label">⚠ Riesgos</div>
        <ul>${bulletList(sc.ri,'riesgo')}</ul>
      </div>
      <div class="sc-col">
        <div class="sc-section-label">✦ Oportunidades</div>
        <ul>${bulletList(sc.op,'oportunidad')}</ul>
      </div>
    </div>
    <div class="sc-bottom">
      <div class="sc-implications">
        <div class="sc-section-label">▸ Implicancias estratégicas</div>
        <ul>${bulletList(sc.ic)}</ul>
      </div>
      <div class="sc-signals">
        <div class="sc-section-label">📡 Señales de monitoreo</div>
        <ul>${bulletList(sc.sm,'senal')}</ul>
      </div>
    </div>
  </section>`;
}

module.exports = async function handler(req, res) {
  const { d } = req.query;
  if (!d) {
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.status(400).send('<h1>Parametro faltante</h1>');
  }

  let s;
  try {
    s = JSON.parse(Buffer.from(d, 'base64url').toString('utf8'));
  } catch {
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.status(400).send('<h1>Datos invalidos</h1>');
  }

  const ins = s.in || {};
  const insumoSections = [
    ['📈 Tendencias',     ins.td],
    ['⚠ Riesgos',        ins.ri],
    ['✦ Oportunidades',  ins.op],
    ['🌐 Megatendencias', ins.mt],
  ].filter(([,a]) => a && a.length)
   .map(([label,arr]) => `
    <div class="insumo-group">
      <div class="insumo-label">${label}</div>
      <ul>${arr.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>
    </div>`).join('');

  const ci = s.ci || {};
  const scenarioCards = (s.es || []).map(sc => scenarioCard(sc)).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${esc(s.t)} — Escenarios CEPLAN</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    :root{--rojo:#C8102E;--rojo-dark:#9B0B22;--gris:#F4F5F6;--gris2:#E8EAEC;--borde:#DDE1E6;--texto:#111827;--muted:#6B7280;--blanco:#FFFFFF;}
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{background:var(--gris);color:var(--texto);font-family:'Source Sans 3',sans-serif;font-size:15px;line-height:1.65;}
    header{background:var(--rojo);box-shadow:0 2px 16px rgba(200,16,46,.35);position:sticky;top:0;z-index:100;}
    .hi{max-width:1200px;margin:0 auto;padding:.85rem 2rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;}
    .hb{font-weight:700;font-size:.95rem;text-transform:uppercase;letter-spacing:.06em;color:#fff;}
    .hb span{display:block;font-size:.6rem;font-weight:400;opacity:.75;letter-spacing:.12em;}
    .hbadge{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);border-radius:4px;padding:.28rem .75rem;font-size:.7rem;font-weight:600;color:#fff;}
    .hero{background:var(--blanco);border-bottom:4px solid var(--rojo);padding:2.5rem 2rem 2rem;}
    .hero-inner{max-width:1200px;margin:0 auto;}
    .eyebrow{font-size:.68rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--rojo);margin-bottom:.5rem;}
    .hero-title{font-family:'Playfair Display',serif;font-size:clamp(1.7rem,4vw,2.8rem);font-weight:700;color:var(--texto);line-height:1.15;margin-bottom:.75rem;}
    .meta-pills{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.75rem;}
    .meta-pill{background:var(--gris);border:1px solid var(--borde);border-radius:20px;padding:.25rem .85rem;font-size:.72rem;font-weight:600;color:var(--muted);}
    .meta-pill strong{color:var(--texto);}
    .main{max-width:1200px;margin:0 auto;padding:2rem 2rem 4rem;}
    .pregunta-box{background:var(--blanco);border:1px solid var(--borde);border-left:4px solid var(--rojo);border-radius:0 8px 8px 0;padding:1.1rem 1.5rem;margin-bottom:2rem;}
    .pregunta-label{font-size:.63rem;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:var(--rojo);margin-bottom:.3rem;}
    .pregunta-text{font-family:'Playfair Display',serif;font-size:1.05rem;font-style:italic;color:var(--texto);line-height:1.5;}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:2.5rem;}
    @media(max-width:768px){.two-col{grid-template-columns:1fr;}}
    .panel{background:var(--blanco);border:1px solid var(--borde);border-radius:8px;overflow:hidden;}
    .panel-header{background:var(--rojo);color:#fff;padding:.65rem 1.2rem;font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;}
    .panel-body{padding:1.2rem;}
    .insumo-group{margin-bottom:1rem;}.insumo-group:last-child{margin-bottom:0;}
    .insumo-label{font-size:.63rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:.35rem;}
    .insumo-group ul{list-style:none;padding:0;}
    .insumo-group li{font-size:.85rem;padding:.2rem 0;border-bottom:1px solid var(--gris2);}
    .insumo-group li::before{content:'▸ ';color:var(--rojo);font-size:.65rem;}
    .insumo-group li:last-child{border-bottom:none;}
    .lectura-text{font-size:.9rem;line-height:1.75;color:var(--texto);}
    .section-heading{font-family:'Playfair Display',serif;font-size:1.3rem;font-weight:700;color:var(--texto);margin-bottom:1.5rem;padding-bottom:.6rem;border-bottom:2px solid var(--rojo);display:flex;align-items:center;gap:.6rem;}
    .section-heading span{color:var(--rojo);}
    .scenarios-list{display:flex;flex-direction:column;gap:1.5rem;}
    .scenario-card{background:var(--blanco);border:1px solid var(--borde);border-top:4px solid var(--sc-color,#ccc);border-radius:0 0 10px 10px;overflow:hidden;animation:fadeUp .4s ease both;}
    .scenario-card:nth-child(1){animation-delay:.05s;}.scenario-card:nth-child(2){animation-delay:.15s;}.scenario-card:nth-child(3){animation-delay:.25s;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
    .sc-header{display:flex;align-items:center;gap:1rem;padding:1.2rem 1.5rem;background:var(--sc-bg,#f9f9f9);border-bottom:1px solid var(--borde);}
    .sc-icon{width:42px;height:42px;background:var(--sc-color);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:700;flex-shrink:0;}
    .sc-head-text{display:flex;flex-direction:column;gap:.2rem;}
    .sc-tipo-badge{font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;padding:.15rem .5rem;border-radius:3px;display:inline-block;}
    .sc-nombre{font-family:'Playfair Display',serif;font-size:1.15rem;font-weight:700;color:var(--texto);line-height:1.2;}
    .sc-narrativa{padding:1.2rem 1.5rem;font-size:.92rem;line-height:1.75;color:var(--texto);border-bottom:1px solid var(--gris2);}
    .sc-grid{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid var(--gris2);}
    @media(max-width:680px){.sc-grid{grid-template-columns:1fr;}}
    .sc-col{padding:1rem 1.2rem;border-right:1px solid var(--gris2);}.sc-col:last-child{border-right:none;}
    .sc-section-label{font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.13em;color:var(--muted);margin-bottom:.5rem;}
    .sc-col ul,.sc-implications ul,.sc-signals ul{list-style:none;padding:0;}
    .sc-col li,.sc-implications li,.sc-signals li{font-size:.83rem;padding:.22rem 0;border-bottom:1px solid var(--gris2);color:var(--texto);line-height:1.4;}
    .sc-col li:last-child,.sc-implications li:last-child,.sc-signals li:last-child{border-bottom:none;}
    .impulsor::before{content:'⚡ ';font-size:.65rem;}.riesgo::before{content:'⚠ ';font-size:.65rem;}
    .oportunidad::before{content:'✦ ';font-size:.65rem;color:#1A7A3C;}.senal::before{content:'📡 ';font-size:.65rem;}
    .empty-li{color:var(--muted);font-style:italic;font-size:.8rem;}
    .sc-bottom{display:grid;grid-template-columns:1fr 1fr;}
    @media(max-width:680px){.sc-bottom{grid-template-columns:1fr;}}
    .sc-implications{padding:1rem 1.2rem;border-right:1px solid var(--gris2);background:rgba(200,16,46,.03);}
    .sc-signals{padding:1rem 1.2rem;}
    .cierre-box{background:var(--blanco);border:1px solid var(--borde);border-radius:8px;overflow:hidden;margin-top:2.5rem;}
    .cierre-header{background:#9B0B22;color:#fff;padding:.7rem 1.5rem;font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;}
    .cierre-body{padding:1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;}
    @media(max-width:640px){.cierre-body{grid-template-columns:1fr;}}
    .cierre-label{font-size:.63rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);margin-bottom:.5rem;}
    .cierre-body ul{list-style:none;padding:0;}
    .cierre-body li{font-size:.87rem;padding:.25rem 0;border-bottom:1px solid var(--gris2);}
    .cierre-body li::before{content:'▸ ';color:var(--rojo);}
    .cierre-body li:last-child{border-bottom:none;}
    .cierre-descargo{font-size:.78rem;color:var(--muted);font-style:italic;line-height:1.6;grid-column:1/-1;padding-top:1rem;border-top:1px solid var(--gris2);}
    footer{background:#9B0B22;color:rgba(255,255,255,.7);padding:1.2rem 2rem;text-align:center;font-size:.68rem;letter-spacing:.06em;}
    @media(max-width:640px){.main{padding:1.5rem 1rem 3rem;}.hero{padding:1.5rem 1rem 1rem;}.hi{padding:.8rem 1rem;}}
  </style>
</head>
<body>
<header>
  <div class="hi">
    <div class="hb">Prospectiva Estratégica<span>CEPLAN — Centro Nacional de Planeamiento Estratégico</span></div>
    <div class="hbadge">Escenarios Narrativos · Demo</div>
  </div>
</header>
<div class="hero">
  <div class="hero-inner">
    <div class="eyebrow">▸ Ejercicio prospectivo</div>
    <h1 class="hero-title">${esc(s.t)}</h1>
    <div class="meta-pills">
      ${s.se ? `<span class="meta-pill"><strong>Sector:</strong> ${esc(s.se)}</span>` : ''}
      ${s.te ? `<span class="meta-pill"><strong>Territorio:</strong> ${esc(s.te)}</span>` : ''}
      ${s.h  ? `<span class="meta-pill"><strong>Horizonte:</strong> ${esc(s.h)}</span>` : ''}
      ${s.mo ? `<span class="meta-pill"><strong>Modelo:</strong> ${esc(s.mo)}</span>` : ''}
    </div>
  </div>
</div>
<main class="main">
  ${s.pq ? `<div class="pregunta-box"><div class="pregunta-label">❓ Pregunta central</div><div class="pregunta-text">${esc(s.pq)}</div></div>` : ''}
  <div class="two-col">
    <div class="panel">
      <div class="panel-header">Insumos seleccionados</div>
      <div class="panel-body">${insumoSections || '<p style="color:#999;font-size:.85rem;">No se registraron insumos.</p>'}</div>
    </div>
    <div class="panel">
      <div class="panel-header">Lectura prospectiva</div>
      <div class="panel-body"><p class="lectura-text">${esc(s.lp) || '<em>Sin lectura registrada.</em>'}</p></div>
    </div>
  </div>
  <div class="section-heading"><span>◈</span> Escenarios narrativos</div>
  <div class="scenarios-list">${scenarioCards}</div>
  ${(ci.ha?.length || ci.ad || ci.dc) ? `
  <div class="cierre-box">
    <div class="cierre-header">Cierre ejecutivo</div>
    <div class="cierre-body">
      ${ci.ha?.length ? `<div><div class="cierre-label">Hallazgos</div><ul>${ci.ha.map(h=>`<li>${esc(h)}</li>`).join('')}</ul></div>` : ''}
      ${ci.ad ? `<div><div class="cierre-label">Advertencia</div><p style="font-size:.87rem;color:#444;line-height:1.6;">${esc(ci.ad)}</p></div>` : ''}
      ${ci.dc ? `<p class="cierre-descargo">${esc(ci.dc)}</p>` : ''}
    </div>
  </div>` : ''}
</main>
<footer>CEPLAN — Centro Nacional de Planeamiento Estratégico &nbsp;|&nbsp; ${esc(s.ca)} &nbsp;|&nbsp; Ejercicio exploratorio de demo</footer>
</body>
</html>`;

  res.setHeader('Content-Type','text/html; charset=utf-8');
  return res.status(200).send(html);
};
