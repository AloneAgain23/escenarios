// api/generateScenario.js
const { kv } = require('@vercel/kv');
const { randomBytes } = require('crypto');

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
      catch { return res.status(400).json({ error: 'escenarios_json no es JSON válido' }); }
    }

    const session_id = randomBytes(8).toString('hex');
    const payload = {
      data,
      tema,
      sector:           sector || '',
      territorio:       territorio || '',
      horizonte:        horizonte || '',
      pregunta_central: pregunta_central || '',
      created_at:       new Date().toISOString(),
    };

    // Guardar en KV con TTL de 30 días
    await kv.set(`scenario:${session_id}`, JSON.stringify(payload), { ex: 2592000 });

    const BASE_URL = 'https://escenarios-palominogeraldo23-5744s-projects.vercel.app';
    const view_url = `${BASE_URL}/view/${session_id}`;

    return res.status(200).json({
      success: true,
      session_id,
      view_url,
      message: `Reporte listo. Abre: ${view_url}`,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno', detail: String(err) });
  }
};
