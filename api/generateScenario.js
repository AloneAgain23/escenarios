// api/generateScenario.js
// Sin base de datos - codifica datos compactos en base64 dentro de la URL

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { tema, sector, territorio, horizonte, pregunta_central, escenarios_json } = req.body;

    if (!tema || !escenarios_json) {
      return res.status(400).json({ error: 'Faltan campos: tema, escenarios_json' });
    }

    let data = escenarios_json;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); }
      catch { return res.status(400).json({ error: 'escenarios_json no es JSON valido' }); }
    }

    // Recortar campos para minimizar el tamaño del payload
    function trim(str, max) {
      if (!str) return '';
      return String(str).slice(0, max);
    }
    function trimArr(arr, maxItems, maxLen) {
      if (!Array.isArray(arr)) return [];
      return arr.slice(0, maxItems).map(i => trim(i, maxLen));
    }

    const compact = {
      t: trim(tema, 120),
      se: trim(sector, 80),
      te: trim(territorio, 80),
      h: trim(horizonte, 40),
      pq: trim(pregunta_central, 200),
      ca: new Date().toISOString().slice(0, 10),
      mo: trim((data.metadata || {}).model, 40),
      in: {
        td: trimArr((data.insumos || {}).tendencias, 3, 100),
        ri: trimArr((data.insumos || {}).riesgos, 2, 100),
        op: trimArr((data.insumos || {}).oportunidades, 2, 100),
        mt: trimArr((data.insumos || {}).megatendencias, 1, 100),
      },
      lp: trim(data.lectura_prospectiva, 400),
      es: (data.escenarios || []).slice(0, 3).map(sc => ({
        tp: trim(sc.tipo, 15),
        nm: trim(sc.nombre, 80),
        nv: trim(sc.narrativa, 600),
        im: trimArr(sc.impulsores, 3, 80),
        ri: trimArr(sc.riesgos, 2, 80),
        op: trimArr(sc.oportunidades, 2, 80),
        ic: trimArr(sc.implicancias, 2, 100),
        sm: trimArr(sc.senales_monitoreo, 3, 100),
      })),
      ci: {
        ha: trimArr((data.cierre || {}).hallazgos, 2, 120),
        ad: trim((data.cierre || {}).advertencia, 150),
        dc: trim((data.cierre || {}).descargo, 200),
      },
    };

    const encoded = Buffer.from(JSON.stringify(compact)).toString('base64url');
    const BASE_URL = 'https://escenarios-palominogeraldo23-5744s-projects.vercel.app';
    const view_url = BASE_URL + '/api/view?d=' + encoded;

    return res.status(200).json({
      success: true,
      view_url: view_url,
      message: 'Reporte listo. Abre: ' + view_url,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno', detail: String(err) });
  }
};
