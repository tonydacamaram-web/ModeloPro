/**
 * Obtiene la tasa BCV automáticamente.
 * Lógica portada de Victory Victoria (lib/bcv/fetchRate.ts).
 *
 * Fuentes con fallback:
 *  1. ve.dolarapi.com — solo si la fecha coincide con el día hábil vigente
 *  2. Scraping de bcv.org.ve via https nativo de Node
 *  3. Error 503 con mensaje para ingresar manualmente
 */

const https = require('https');

/**
 * Retorna la fecha del día hábil vigente (salta fines de semana).
 */
function diaHabilHoy() {
  const hoy = new Date();
  const dia = hoy.getDay();
  if (dia === 6) hoy.setDate(hoy.getDate() + 2); // sábado → lunes
  if (dia === 0) hoy.setDate(hoy.getDate() + 1); // domingo → lunes
  return hoy.toISOString().split('T')[0];
}

/**
 * Solicitud HTTP con módulo nativo de Node (evita bloqueos de fetch con cert bcv.org.ve).
 */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      rejectUnauthorized: false, // bcv.org.ve usa cert intermedio no reconocido por Node
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-VE,es;q=0.9',
        'Connection': 'close',
      },
      timeout: 8000,
    }, (res) => {
      // Seguir redirecciones manualmente
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpGet(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

/**
 * @returns {{ tasa: number, fuente: 'bcvapi' | 'scraping' }}
 */
async function fetchBCVRate() {
  const fechaEsperada = diaHabilHoy();

  // ── Intento 1: ve.dolarapi.com ──────────────────────────────────────────
  try {
    const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = await res.json();
      const tasa = data.promedio ?? data.venta ?? data.compra;
      const fechaApi = data.fechaActualizacion?.split('T')[0] ?? '';
      if (typeof tasa === 'number' && tasa > 0 && fechaApi === fechaEsperada) {
        return { tasa, fuente: 'bcvapi' };
      }
    }
  } catch { /* continúa con siguiente fuente */ }

  // ── Intento 2: scraping bcv.org.ve ─────────────────────────────────────
  try {
    const html = await httpGet('https://www.bcv.org.ve/');
    const match = html.match(/id="dolar"[\s\S]*?<strong[^>]*>\s*([\d,]+)\s*<\/strong>/i);
    if (match) {
      const tasa = parseFloat(match[1].replace(',', '.').trim());
      if (!isNaN(tasa) && tasa > 0) {
        return { tasa, fuente: 'scraping' };
      }
    }
  } catch { /* continúa */ }

  throw new Error('No se pudo obtener la tasa automáticamente. Ingrese la tasa manualmente.');
}

module.exports = { fetchBCVRate };
