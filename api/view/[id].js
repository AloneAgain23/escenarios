// api/view/[id].js
// Sin base de datos — lee desde memoria global compartida

if (!global._sessions) global._sessions = {};
const sessions = global._sessions;

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function bulletList(arr, cls = '') {
  if (!arr || !arr.length) return '<li class="empty-li">—</li>';
  return arr.map(i => `<li class="${cls}">${esc(i)}</li>`).join('');
}

function scenarioBadge(tipo) {
  return {
    tendencial: { label: 'Tendencial', color: '#1A5FA8', bg: '#EAF1FB', icon: '→' },
    optimista:  { label: 'Optimista',  color: '#1A7A3C', bg: '#E8F5EC', icon: '↑' },
    adverso:    { label: 'Adverso',    color: '#C8102E', bg: '#FDF0F2', icon: '↓' },
  }[tipo] || { label: tipo, color: '#555', bg: '#f0f0f0', icon: '•' };
}

function scenarioCard(sc, idx) {
  const b = scenarioBadge(sc.tipo);
  return `
  <section class="scenario-card tipo-${esc(sc.tipo)}"
           style="--sc-color:${b.color};--sc-bg:${b.bg};"
           aria-label="Escenario ${idx+1}">
    <div class="sc-header">
      <span class="sc-icon">${b.icon}</span>
      <div class="sc-head-text">
        <span class="sc-tipo-badge" style="background:${b.bg};color:${b.color};">${b.label}</span>
        <h2 class="sc-nombre">${esc(sc.nombre || '—')}</h2>
      </div>
    </div>
    <div class="sc-narrativa">${esc(sc.narrativa || '')}</div>
    <div class="sc-grid">
      <div class="sc-col">
        <div class="sc-section-label">⚡ Impulsores</div>
        <ul>${bulletList(sc.impulsores, 'impulsor')}</ul>
      </div>
      <div class="sc-col">
        <div class="sc-section-label">⚠ Riesgos</div>
        <ul>${bulletList(sc.riesgos, 'riesgo')}</ul>
      </div>
      <div class="sc-col">
        <div class="sc-section-label">✦ Oportunidades</div>
        <ul>${bulletList(sc.oportunidades, 'oportunidad')}</ul>
      </div>
    </div>
    <div class="sc-bottom">
      <div class="sc-implications">
        <div class="sc-section-label">▸ Implicancias estratégicas</div>
        <ul>${bulletList(sc.implicancias)}</ul>
      </div>
      <div class="sc-signals">
        <div class="sc-section-label">📡 Señales de monitoreo</div>
        <ul>${bulletList(sc.senales_monitoreo, 'senal')}</ul>
      </div>
    </div>
  </section>`;
}

module.exports = async function handler(req, res) {
  const { id } = req.query;
  const session = sessions[id];

  if (!session || session.expires < Date.now()) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(404).send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>No encontrado — CEPLAN</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;
min-height:100vh;background:#f5f5f5;}
.box{text-align:center;padding:3rem;background:#fff;border-radius:12px;
box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:420px;}
h1{color:#C8102E;}p{color:#666;font-size:.9rem;}</style></head>
<body><div class="box">
<h1>⚠ Reporte no encontrado</h1>
<p>Este reporte no existe o ha expirado.<br>Genera uno nuevo desde ChatGPT.</p>
</div></body></html>`);
  }

  const { data, tema, sector, territorio, horizonte, pregunta_central, created_at } = session;
  const meta      = data.metadata || {};
  const insumos   = data.insumos  || {};
  const escenarios = data.escenarios || [];
  const cierre    = data.cierre   || {};
  const lectura   = data.lectura_prospectiva || '';

  const createdStr = created_at
    ? new Date(created_at).toLocaleString('es-PE') : '—';

  const insumoSections = [
    ['📈 Tendencias',    insumos.tendencias],
    ['⚠ Riesgos',       insumos.riesgos],
    ['✦ Oportunidades', insumos.oportunidades],
    ['🌐 Megatendencias',insumos.megatendencias],
  ].filter(([,arr]) => arr && arr.length)
   .map(([label, arr]) => `
    <div class="insumo-group">
      <div class="insumo-label">${label}</div>
      <ul>${arr.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
    </div>`).join('');

  const scenarioCards = escenarios.map((sc,i) => scenarioCard(sc,i)).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${esc(tema)} — Escenarios CEPLAN</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --rojo:      #C8102E;
      --rojo-dark: #9B0B22;
      --rojo-pale: #FDF0F2;
      --gris:      #F4F5F6;
      --gris2:     #E8EAEC;
      --borde:     #DDE1E6;
      --texto:     #111827;
      --muted:     #6B7280;
      --blanco:    #FFFFFF;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      background: var(--gris);
      color: var(--texto);
      font-family: 'Source Sans 3', sans-serif;
      font-size: 15px; line-height: 1.65;
    }

    /* HEADER */
    header {
      background: var(--rojo);
      box-shadow: 0 2px 16px rgba(200,16,46,.35);
      position: sticky; top: 0; z-index: 100;
    }
    .header-inner {
      max-width: 1200px; margin: 0 auto;
      padding: .85rem 2rem;
      display: flex; align-items: center;
      justify-content: space-between; gap: 1rem; flex-wrap: wrap;
    }
    .header-brand {
      font-weight: 700; font-size: .95rem;
      text-transform: uppercase; letter-spacing: .06em; color: #fff;
    }
    .header-brand span {
      display: block; font-size: .6rem; font-weight: 400;
      opacity: .75; letter-spacing: .12em;
    }
    .header-badge {
      background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.3);
      border-radius: 4px; padding: .28rem .75rem;
      font-size: .7rem; font-weight: 600; color: #fff; letter-spacing: .05em;
    }

    /* HERO */
    .hero {
      background: var(--blanco);
      border-bottom: 4px solid var(--rojo);
      padding: 2.5rem 2rem 2rem;
    }
    .hero-inner { max-width: 1200px; margin: 0 auto; }
    .hero-eyebrow {
      font-size: .68rem; font-weight: 700;
      letter-spacing: .2em; text-transform: uppercase;
      color: var(--rojo); margin-bottom: .5rem;
    }
    .hero-title {
      font-family: 'Playfair Display', serif;
      font-size: clamp(1.7rem,4vw,2.8rem);
      font-weight: 700; color: var(--texto);
      line-height: 1.15; margin-bottom: .75rem;
    }
    .hero-title em { font-style: italic; color: var(--rojo); }
    .meta-pills { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .75rem; }
    .meta-pill {
      background: var(--gris); border: 1px solid var(--borde);
      border-radius: 20px; padding: .25rem .85rem;
      font-size: .72rem; font-weight: 600; color: var(--muted);
    }
    .meta-pill strong { color: var(--texto); }

    /* MAIN */
    .main { max-width: 1200px; margin: 0 auto; padding: 2rem 2rem 4rem; }

    /* PREGUNTA */
    .pregunta-box {
      background: var(--blanco);
      border: 1px solid var(--borde);
      border-left: 4px solid var(--rojo);
      border-radius: 0 8px 8px 0;
      padding: 1.1rem 1.5rem; margin-bottom: 2rem;
    }
    .pregunta-label {
      font-size: .63rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: .14em;
      color: var(--rojo); margin-bottom: .3rem;
    }
    .pregunta-text {
      font-family: 'Playfair Display', serif;
      font-size: 1.05rem; font-style: italic;
      color: var(--texto); line-height: 1.5;
    }

    /* TWO-COL */
    .two-col {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 1.5rem; margin-bottom: 2.5rem;
    }
    @media (max-width: 768px) { .two-col { grid-template-columns: 1fr; } }

    .panel {
      background: var(--blanco);
      border: 1px solid var(--borde); border-radius: 8px; overflow: hidden;
    }
    .panel-header {
      background: var(--rojo); color: #fff; padding: .65rem 1.2rem;
      font-size: .7rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: .12em;
    }
    .panel-body { padding: 1.2rem; }

    .insumo-group { margin-bottom: 1rem; }
    .insumo-group:last-child { margin-bottom: 0; }
    .insumo-label {
      font-size: .63rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: .1em;
      color: var(--muted); margin-bottom: .35rem;
    }
    .insumo-group ul { list-style: none; padding: 0; }
    .insumo-group li {
      font-size: .85rem; padding: .2rem 0;
      border-bottom: 1px solid var(--gris2); color: var(--texto);
    }
    .insumo-group li::before { content: '▸ '; color: var(--rojo); font-size: .65rem; }
    .insumo-group li:last-child { border-bottom: none; }

    .lectura-text { font-size: .9rem; line-height: 1.75; color: var(--texto); }

    /* SECTION HEADING */
    .section-heading {
      font-family: 'Playfair Display', serif;
      font-size: 1.3rem; font-weight: 700; color: var(--texto);
      margin-bottom: 1.5rem; padding-bottom: .6rem;
      border-bottom: 2px solid var(--rojo);
      display: flex; align-items: center; gap: .6rem;
    }
    .section-heading span { color: var(--rojo); }

    /* SCENARIO CARDS */
    .scenarios-list { display: flex; flex-direction: column; gap: 1.5rem; }

    .scenario-card {
      background: var(--blanco);
      border: 1px solid var(--borde);
      border-top: 4px solid var(--sc-color, #ccc);
      border-radius: 0 0 10px 10px; overflow: hidden;
      animation: fadeUp .4s ease both;
    }
    .scenario-card:nth-child(1) { animation-delay: .05s; }
    .scenario-card:nth-child(2) { animation-delay: .15s; }
    .scenario-card:nth-child(3) { animation-delay: .25s; }
    @keyframes fadeUp {
      from { opacity:0; transform:translateY(14px); }
      to   { opacity:1; transform:translateY(0); }
    }

    .sc-header {
      display: flex; align-items: center; gap: 1rem;
      padding: 1.2rem 1.5rem;
      background: var(--sc-bg, #f9f9f9);
      border-bottom: 1px solid var(--borde);
    }
    .sc-icon {
      width: 42px; height: 42px;
      background: var(--sc-color); color: #fff;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.2rem; font-weight: 700; flex-shrink: 0;
    }
    .sc-head-text { display: flex; flex-direction: column; gap: .2rem; }
    .sc-tipo-badge {
      font-size: .62rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: .12em;
      padding: .15rem .5rem; border-radius: 3px;
      display: inline-block; width: fit-content;
    }
    .sc-nombre {
      font-family: 'Playfair Display', serif;
      font-size: 1.15rem; font-weight: 700;
      color: var(--texto); line-height: 1.2;
    }

    .sc-narrativa {
      padding: 1.2rem 1.5rem;
      font-size: .92rem; line-height: 1.75;
      color: var(--texto);
      border-bottom: 1px solid var(--gris2);
    }

    .sc-grid {
      display: grid; grid-template-columns: repeat(3,1fr);
      border-bottom: 1px solid var(--gris2);
    }
    @media (max-width: 680px) { .sc-grid { grid-template-columns: 1fr; } }

    .sc-col {
      padding: 1rem 1.2rem;
      border-right: 1px solid var(--gris2);
    }
    .sc-col:last-child { border-right: none; }
    .sc-section-label {
      font-size: .6rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: .13em;
      color: var(--muted); margin-bottom: .5rem;
    }
    .sc-col ul, .sc-implications ul, .sc-signals ul {
      list-style: none; padding: 0;
    }
    .sc-col li, .sc-implications li, .sc-signals li {
      font-size: .83rem; padding: .22rem 0;
      border-bottom: 1px solid var(--gris2);
      color: var(--texto); line-height: 1.4;
    }
    .sc-col li:last-child,
    .sc-implications li:last-child,
    .sc-signals li:last-child { border-bottom: none; }

    .impulsor::before    { content: '⚡ '; font-size: .65rem; }
    .riesgo::before      { content: '⚠ '; font-size: .65rem; }
    .oportunidad::before { content: '✦ '; font-size: .65rem; color: #1A7A3C; }
    .senal::before       { content: '📡 '; font-size: .65rem; }
    .empty-li            { color: var(--muted); font-style: italic; font-size: .8rem; }

    .sc-bottom {
      display: grid; grid-template-columns: 1fr 1fr;
    }
    @media (max-width: 680px) { .sc-bottom { grid-template-columns: 1fr; } }

    .sc-implications {
      padding: 1rem 1.2rem;
      border-right: 1px solid var(--gris2);
      background: rgba(200,16,46,.03);
    }
    .sc-signals { padding: 1rem 1.2rem; }

    /* CIERRE */
    .cierre-box {
      background: var(--blanco);
      border: 1px solid var(--borde);
      border-radius: 8px; overflow: hidden; margin-top: 2.5rem;
    }
    .cierre-header {
      background: var(--rojo-dark, #9B0B22); color: #fff;
      padding: .7rem 1.5rem;
      font-size: .7rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: .12em;
    }
    .cierre-body {
      padding: 1.5rem;
      display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;
    }
    @media (max-width: 640px) { .cierre-body { grid-template-columns: 1fr; } }
    .cierre-label {
      font-size: .63rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: .12em;
      color: var(--muted); margin-bottom: .5rem;
    }
    .cierre-body ul { list-style: none; padding: 0; }
    .cierre-body li {
      font-size: .87rem; padding: .25rem 0;
      border-bottom: 1px solid var(--gris2);
    }
    .cierre-body li::before { content: '▸ '; color: var(--rojo); }
    .cierre-body li:last-child { border-bottom: none; }
    .cierre-descargo {
      font-size: .78rem; color: var(--muted); font-style: italic;
      line-height: 1.6; grid-column: 1/-1;
      padding-top: 1rem; border-top: 1px solid var(--gris2);
    }

    /* FOOTER */
    footer {
      background: #9B0B22; color: rgba(255,255,255,.7);
      padding: 1.2rem 2rem; text-align: center;
      font-size: .68rem; letter-spacing: .06em;
    }

    @media (max-width: 640px) {
      .main { padding: 1.5rem 1rem 3rem; }
      .hero { padding: 1.5rem 1rem 1rem; }
      .header-inner { padding: .8rem 1rem; }
    }
  </style>
</head>
<body>

<header>
  <div class="header-inner">
    <div class="header-brand">
      Prospectiva Estratégica
      <span>CEPLAN — Centro Nacional de Planeamiento Estratégico</span>
    </div>
    <div class="header-badge">Escenarios Narrativos · Demo</div>
  </div>
</header>

<div class="hero">
  <div class="hero-inner">
    <div class="hero-eyebrow">▸ Ejercicio prospectivo</div>
    <h1 class="hero-title">${esc(tema)}</h1>
    <div class="meta-pills">
      ${sector     ? `<span class="meta-pill"><strong>Sector:</strong> ${esc(sector)}</span>` : ''}
      ${territorio ? `<span class="meta-pill"><strong>Territorio:</strong> ${esc(territorio)}</span>` : ''}
      ${horizonte  ? `<span class="meta-pill"><strong>Horizonte:</strong> ${esc(horizonte)}</span>` : ''}
      ${meta.model ? `<span class="meta-pill"><strong>Modelo:</strong> ${esc(meta.model)}</span>` : ''}
    </div>
  </div>
</div>

<main class="main">

  ${pregunta_central ? `
  <div class="pregunta-box">
    <div class="pregunta-label">❓ Pregunta central</div>
    <div class="pregunta-text">${esc(pregunta_central)}</div>
  </div>` : ''}

  <div class="two-col">
    <div class="panel">
      <div class="panel-header">Insumos seleccionados</div>
      <div class="panel-body">
        ${insumoSections || '<p style="color:#999;font-size:.85rem;">No se registraron insumos.</p>'}
      </div>
    </div>
    <div class="panel">
      <div class="panel-header">Lectura prospectiva</div>
      <div class="panel-body">
        <p class="lectura-text">${esc(lectura) || '<em>Sin lectura registrada.</em>'}</p>
      </div>
    </div>
  </div>

  <div class="section-heading"><span>◈</span> Escenarios narrativos</div>

  <div class="scenarios-list">${scenarioCards}</div>

  ${(cierre.hallazgos?.length || cierre.advertencia || cierre.descargo) ? `
  <div class="cierre-box">
    <div class="cierre-header">Cierre ejecutivo</div>
    <div class="cierre-body">
      ${cierre.hallazgos?.length ? `
      <div>
        <div class="cierre-label">Principales hallazgos</div>
        <ul>${cierre.hallazgos.map(h => `<li>${esc(h)}</li>`).join('')}</ul>
      </div>` : ''}
      ${cierre.advertencia ? `
      <div>
        <div class="cierre-label">Advertencia metodológica</div>
        <p style="font-size:.87rem;color:#444;line-height:1.6;">${esc(cierre.advertencia)}</p>
      </div>` : ''}
      ${cierre.descargo ? `<p class="cierre-descargo">${esc(cierre.descargo)}</p>` : ''}
    </div>
  </div>` : ''}

</main>

<footer>
  CEPLAN — Centro Nacional de Planeamiento Estratégico &nbsp;|&nbsp;
  Generado: ${createdStr} &nbsp;|&nbsp;
  Ejercicio exploratorio de demo · Sesión válida ~1h
</footer>

</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
