// api/generateScenario.js
// Vercel Serverless Function
// Requires: @vercel/kv (add in Vercel dashboard: Storage → KV)

import { kv } from '@vercel/kv';
import { nanoid } from 'nanoid';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tema, sector, territorio, horizonte, pregunta_central, escenarios_json } = req.body;

    if (!tema || !escenarios_json) {
      return res.status(400).json({ error: 'Faltan campos requeridos: tema, escenarios_json' });
    }

    // Parse if string
    let data = escenarios_json;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); }
      catch { return res.status(400).json({ error: 'escenarios_json no es JSON válido' }); }
    }

    const session_id = nanoid(16);
    const payload = {
      data,
      tema,
      sector:           sector || '',
      territorio:       territorio || '',
      horizonte:        horizonte || '',
      pregunta_central: pregunta_central || '',
      created_at:       new Date().toISOString(),
    };

    // Store in KV — expires in 30 days (2592000 seconds)
    await kv.set(`scenario:${session_id}`, JSON.stringify(payload), { ex: 2592000 });

    const BASE_URL = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://ceplan-escenarios.vercel.app';

    const view_url = `${BASE_URL}/view/${session_id}`;

    return res.status(200).json({
      success: true,
      session_id,
      view_url,
      message: `Reporte listo. Abre: ${view_url}`,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor', detail: String(err) });
  }
}
