from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uuid
import json
from datetime import datetime, timedelta

app = FastAPI(title="CEPLAN Escenarios API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions = {}
SESSION_TTL_HOURS = 24

def cleanup_sessions():
    now = datetime.utcnow()
    expired = [k for k, v in sessions.items() if v["expires"] < now]
    for k in expired:
        del sessions[k]

@app.get("/")
def root():
    return {"status": "ok", "service": "CEPLAN Escenarios API"}

@app.post("/debug")
async def debug(request: Request):
    body = await request.json()
    return JSONResponse(body)

@app.post("/generateScenario")
async def generate_scenario(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Body no es JSON valido")

    tema = body.get("tema")
    sector = body.get("sector", "")
    territorio = body.get("territorio", "")
    horizonte = body.get("horizonte", "")
    pregunta_central = body.get("pregunta_central", "")
    data = body.get("escenarios_json")

    if not tema or not data:
        raise HTTPException(status_code=400, detail="Faltan campos: tema, escenarios_json")

    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception:
            raise HTTPException(status_code=400, detail="escenarios_json no es JSON valido")

    cleanup_sessions()

    session_id = str(uuid.uuid4()).replace("-", "")[:16]
    sessions[session_id] = {
        "data": data,
        "tema": tema,
        "sector": sector,
        "territorio": territorio,
        "horizonte": horizonte,
        "pregunta_central": pregunta_central,
        "expires": datetime.utcnow() + timedelta(hours=SESSION_TTL_HOURS),
        "created_at": datetime.utcnow().strftime("%d/%m/%Y"),
    }
    
    BASE_URL = "https://escenarios.onrender.com"
    view_url = f"{BASE_URL}/view/{session_id}"

    return JSONResponse({
        "success": True,
        "view_url": view_url,
        "message": f"Reporte listo. Abre: {view_url}",
    })

@app.get("/view/{session_id}", response_class=HTMLResponse)
def view_scenario(session_id: str):
    cleanup_sessions()
    if session_id not in sessions:
        return HTMLResponse("""<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>No encontrado</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f5f5f5;}
.box{text-align:center;padding:3rem;background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:420px;}
h1{color:#C8102E;}p{color:#666;font-size:.9rem;}</style></head>
<body><div class="box"><h1>Sesion no disponible</h1>
<p>Este reporte expiro o no existe.<br>Genera uno nuevo desde ChatGPT.</p></div></body></html>""", status_code=404)

    s = sessions[session_id]
    data = s["data"]
    meta = data.get("metadata", {})
    insumos = data.get("insumos", {})
    escenarios = data.get("escenarios", [])
    cierre = data.get("cierre", {})
    lectura = data.get("lectura_prospectiva", "")

    def esc(v):
        if not v: return ""
        return str(v).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace('"',"&quot;")

    def bullet_list(arr, cls=""):
        if not arr: return '<li class="empty-li">—</li>'
        return "".join(f'<li class="{cls}">{esc(i)}</li>' for i in arr)

    def badge(tipo):
        return {
            "tendencial": ("Tendencial","#1A5FA8","#EAF1FB","&rarr;"),
            "optimista":  ("Optimista", "#1A7A3C","#E8F5EC","&uarr;"),
            "adverso":    ("Adverso",   "#C8102E","#FDF0F2","&darr;"),
        }.get(tipo, (tipo,"#555","#f0f0f0","&bull;"))

    def scenario_card(sc):
        label, color, bg, icon = badge(sc.get("tipo",""))
        return f"""
        <section class="scenario-card" style="--sc-color:{color};--sc-bg:{bg};">
          <div class="sc-header">
            <span class="sc-icon">{icon}</span>
            <div class="sc-head-text">
              <span class="sc-tipo-badge" style="background:{bg};color:{color};">{label}</span>
              <h2 class="sc-nombre">{esc(sc.get("nombre",""))}</h2>
            </div>
          </div>
          <div class="sc-narrativa">{esc(sc.get("narrativa",""))}</div>
          <div class="sc-grid">
            <div class="sc-col"><div class="sc-section-label">&#9889; Impulsores</div><ul>{bullet_list(sc.get("impulsores",[]),"impulsor")}</ul></div>
            <div class="sc-col"><div class="sc-section-label">&#9888; Riesgos</div><ul>{bullet_list(sc.get("riesgos",[]),"riesgo")}</ul></div>
            <div class="sc-col"><div class="sc-section-label">&#10022; Oportunidades</div><ul>{bullet_list(sc.get("oportunidades",[]),"oportunidad")}</ul></div>
          </div>
          <div class="sc-bottom">
            <div class="sc-implications"><div class="sc-section-label">&#9656; Implicancias</div><ul>{bullet_list(sc.get("implicancias",[]))}</ul></div>
            <div class="sc-signals"><div class="sc-section-label">&#128225; Senales</div><ul>{bullet_list(sc.get("senales_monitoreo",[]),"senal")}</ul></div>
          </div>
        </section>"""

    insumo_html = ""
    for label, key in [("Tendencias","tendencias"),("Riesgos","riesgos"),("Oportunidades","oportunidades"),("Megatendencias","megatendencias")]:
        arr = insumos.get(key, [])
        if arr:
            items = "".join(f"<li>{esc(i)}</li>" for i in arr)
            insumo_html += f'<div class="insumo-group"><div class="insumo-label">{label}</div><ul>{items}</ul></div>'

    scenario_cards = "".join(scenario_card(sc) for sc in escenarios)

    cierre_html = ""
    if cierre.get("hallazgos") or cierre.get("advertencia") or cierre.get("descargo"):
        ha = "".join(f"<li>{esc(h)}</li>" for h in cierre.get("hallazgos", []))
        cierre_html = f"""
        <div class="cierre-box">
          <div class="cierre-header">Cierre ejecutivo</div>
          <div class="cierre-body">
            {"<div><div class='cierre-label'>Hallazgos</div><ul>" + ha + "</ul></div>" if ha else ""}
            {"<div><div class='cierre-label'>Advertencia</div><p style='font-size:.87rem;color:#444;line-height:1.6;'>" + esc(cierre.get("advertencia","")) + "</p></div>" if cierre.get("advertencia") else ""}
            {"<p class='cierre-descargo'>" + esc(cierre.get("descargo","")) + "</p>" if cierre.get("descargo") else ""}
          </div>
        </div>"""

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>{esc(s["tema"])} — Escenarios CEPLAN</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    :root{{--rojo:#C8102E;--rojo-dark:#9B0B22;--gris:#F4F5F6;--gris2:#E8EAEC;--borde:#DDE1E6;--texto:#111827;--muted:#6B7280;--blanco:#FFFFFF;}}
    *,*::before,*::after{{box-sizing:border-box;margin:0;padding:0;}}
    body{{background:var(--gris);color:var(--texto);font-family:'Source Sans 3',sans-serif;font-size:15px;line-height:1.65;}}
    header{{background:var(--rojo);box-shadow:0 2px 16px rgba(200,16,46,.35);position:sticky;top:0;z-index:100;}}
    .hi{{max-width:1200px;margin:0 auto;padding:.85rem 2rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;}}
    .hb{{font-weight:700;font-size:.95rem;text-transform:uppercase;letter-spacing:.06em;color:#fff;}}
    .hb span{{display:block;font-size:.6rem;font-weight:400;opacity:.75;letter-spacing:.12em;}}
    .hbadge{{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);border-radius:4px;padding:.28rem .75rem;font-size:.7rem;font-weight:600;color:#fff;}}
    .hero{{background:var(--blanco);border-bottom:4px solid var(--rojo);padding:2.5rem 2rem 2rem;}}
    .hero-inner{{max-width:1200px;margin:0 auto;}}
    .eyebrow{{font-size:.68rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--rojo);margin-bottom:.5rem;}}
    .hero-title{{font-family:'Playfair Display',serif;font-size:clamp(1.7rem,4vw,2.8rem);font-weight:700;color:var(--texto);line-height:1.15;margin-bottom:.75rem;}}
    .meta-pills{{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.75rem;}}
    .meta-pill{{background:var(--gris);border:1px solid var(--borde);border-radius:20px;padding:.25rem .85rem;font-size:.72rem;font-weight:600;color:var(--muted);}}
    .meta-pill strong{{color:var(--texto);}}
    .main{{max-width:1200px;margin:0 auto;padding:2rem 2rem 4rem;}}
    .pregunta-box{{background:var(--blanco);border:1px solid var(--borde);border-left:4px solid var(--rojo);border-radius:0 8px 8px 0;padding:1.1rem 1.5rem;margin-bottom:2rem;}}
    .pregunta-label{{font-size:.63rem;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:var(--rojo);margin-bottom:.3rem;}}
    .pregunta-text{{font-family:'Playfair Display',serif;font-size:1.05rem;font-style:italic;color:var(--texto);line-height:1.5;}}
    .two-col{{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:2.5rem;}}
    @media(max-width:768px){{.two-col{{grid-template-columns:1fr;}}}}
    .panel{{background:var(--blanco);border:1px solid var(--borde);border-radius:8px;overflow:hidden;}}
    .panel-header{{background:var(--rojo);color:#fff;padding:.65rem 1.2rem;font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;}}
    .panel-body{{padding:1.2rem;}}
    .insumo-group{{margin-bottom:1rem;}}.insumo-group:last-child{{margin-bottom:0;}}
    .insumo-label{{font-size:.63rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:.35rem;}}
    .insumo-group ul{{list-style:none;padding:0;}}
    .insumo-group li{{font-size:.85rem;padding:.2rem 0;border-bottom:1px solid var(--gris2);}}
    .insumo-group li::before{{content:'▸ ';color:var(--rojo);font-size:.65rem;}}
    .insumo-group li:last-child{{border-bottom:none;}}
    .lectura-text{{font-size:.9rem;line-height:1.75;color:var(--texto);}}
    .section-heading{{font-family:'Playfair Display',serif;font-size:1.3rem;font-weight:700;color:var(--texto);margin-bottom:1.5rem;padding-bottom:.6rem;border-bottom:2px solid var(--rojo);display:flex;align-items:center;gap:.6rem;}}
    .section-heading span{{color:var(--rojo);}}
    .scenarios-list{{display:flex;flex-direction:column;gap:1.5rem;}}
    .scenario-card{{background:var(--blanco);border:1px solid var(--borde);border-top:4px solid var(--sc-color,#ccc);border-radius:0 0 10px 10px;overflow:hidden;animation:fadeUp .4s ease both;}}
    .scenario-card:nth-child(1){{animation-delay:.05s;}}.scenario-card:nth-child(2){{animation-delay:.15s;}}.scenario-card:nth-child(3){{animation-delay:.25s;}}
    @keyframes fadeUp{{from{{opacity:0;transform:translateY(14px);}}to{{opacity:1;transform:translateY(0);}}}}
    .sc-header{{display:flex;align-items:center;gap:1rem;padding:1.2rem 1.5rem;background:var(--sc-bg,#f9f9f9);border-bottom:1px solid var(--borde);}}
    .sc-icon{{width:42px;height:42px;background:var(--sc-color);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:700;flex-shrink:0;}}
    .sc-head-text{{display:flex;flex-direction:column;gap:.2rem;}}
    .sc-tipo-badge{{font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;padding:.15rem .5rem;border-radius:3px;display:inline-block;}}
    .sc-nombre{{font-family:'Playfair Display',serif;font-size:1.15rem;font-weight:700;color:var(--texto);line-height:1.2;}}
    .sc-narrativa{{padding:1.2rem 1.5rem;font-size:.92rem;line-height:1.75;color:var(--texto);border-bottom:1px solid var(--gris2);}}
    .sc-grid{{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid var(--gris2);}}
    @media(max-width:680px){{.sc-grid{{grid-template-columns:1fr;}}}}
    .sc-col{{padding:1rem 1.2rem;border-right:1px solid var(--gris2);}}.sc-col:last-child{{border-right:none;}}
    .sc-section-label{{font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.13em;color:var(--muted);margin-bottom:.5rem;}}
    .sc-col ul,.sc-implications ul,.sc-signals ul{{list-style:none;padding:0;}}
    .sc-col li,.sc-implications li,.sc-signals li{{font-size:.83rem;padding:.22rem 0;border-bottom:1px solid var(--gris2);color:var(--texto);line-height:1.4;}}
    .sc-col li:last-child,.sc-implications li:last-child,.sc-signals li:last-child{{border-bottom:none;}}
    .impulsor::before{{content:'⚡ ';font-size:.65rem;}}.riesgo::before{{content:'⚠ ';font-size:.65rem;}}
    .oportunidad::before{{content:'✦ ';font-size:.65rem;color:#1A7A3C;}}.senal::before{{content:'📡 ';font-size:.65rem;}}
    .empty-li{{color:var(--muted);font-style:italic;font-size:.8rem;}}
    .sc-bottom{{display:grid;grid-template-columns:1fr 1fr;}}
    @media(max-width:680px){{.sc-bottom{{grid-template-columns:1fr;}}}}
    .sc-implications{{padding:1rem 1.2rem;border-right:1px solid var(--gris2);background:rgba(200,16,46,.03);}}
    .sc-signals{{padding:1rem 1.2rem;}}
    .cierre-box{{background:var(--blanco);border:1px solid var(--borde);border-radius:8px;overflow:hidden;margin-top:2.5rem;}}
    .cierre-header{{background:#9B0B22;color:#fff;padding:.7rem 1.5rem;font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;}}
    .cierre-body{{padding:1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;}}
    @media(max-width:640px){{.cierre-body{{grid-template-columns:1fr;}}}}
    .cierre-label{{font-size:.63rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);margin-bottom:.5rem;}}
    .cierre-body ul{{list-style:none;padding:0;}}
    .cierre-body li{{font-size:.87rem;padding:.25rem 0;border-bottom:1px solid var(--gris2);}}
    .cierre-body li::before{{content:'▸ ';color:var(--rojo);}}
    .cierre-body li:last-child{{border-bottom:none;}}
    .cierre-descargo{{font-size:.78rem;color:var(--muted);font-style:italic;line-height:1.6;grid-column:1/-1;padding-top:1rem;border-top:1px solid var(--gris2);}}
    footer{{background:#9B0B22;color:rgba(255,255,255,.7);padding:1.2rem 2rem;text-align:center;font-size:.68rem;letter-spacing:.06em;}}
    @media(max-width:640px){{.main{{padding:1.5rem 1rem 3rem;}}.hero{{padding:1.5rem 1rem 1rem;}}.hi{{padding:.8rem 1rem;}}}}
  </style>
</head>
<body>
<header>
  <div class="hi">
    <div class="hb">Prospectiva Estrategica<span>CEPLAN — Centro Nacional de Planeamiento Estrategico</span></div>
    <div class="hbadge">Escenarios Narrativos · Demo</div>
  </div>
</header>
<div class="hero">
  <div class="hero-inner">
    <div class="eyebrow">&#9656; Ejercicio prospectivo</div>
    <h1 class="hero-title">{esc(s["tema"])}</h1>
    <div class="meta-pills">
      {"<span class='meta-pill'><strong>Sector:</strong> " + esc(s["sector"]) + "</span>" if s["sector"] else ""}
      {"<span class='meta-pill'><strong>Territorio:</strong> " + esc(s["territorio"]) + "</span>" if s["territorio"] else ""}
      {"<span class='meta-pill'><strong>Horizonte:</strong> " + esc(s["horizonte"]) + "</span>" if s["horizonte"] else ""}
      {"<span class='meta-pill'><strong>Modelo:</strong> " + esc(meta.get("model","")) + "</span>" if meta.get("model") else ""}
    </div>
  </div>
</div>
<main class="main">
  {"<div class='pregunta-box'><div class='pregunta-label'>Pregunta central</div><div class='pregunta-text'>" + esc(s["pregunta_central"]) + "</div></div>" if s["pregunta_central"] else ""}
  <div class="two-col">
    <div class="panel"><div class="panel-header">Insumos seleccionados</div><div class="panel-body">{insumo_html or "<p style='color:#999;font-size:.85rem;'>No se registraron insumos.</p>"}</div></div>
    <div class="panel"><div class="panel-header">Lectura prospectiva</div><div class="panel-body"><p class="lectura-text">{esc(lectura) or "<em>Sin lectura registrada.</em>"}</p></div></div>
  </div>
  <div class="section-heading"><span>&#9672;</span> Escenarios narrativos</div>
  <div class="scenarios-list">{scenario_cards}</div>
  {cierre_html}
</main>
<footer>CEPLAN — Centro Nacional de Planeamiento Estrategico &nbsp;|&nbsp; {s["created_at"]} &nbsp;|&nbsp; Sesion valida 24h</footer>
</body>
</html>"""
    return HTMLResponse(html)
