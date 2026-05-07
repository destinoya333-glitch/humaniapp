let rawBody = $('Webhook Consulta F2').first().json.body || {};
if (typeof rawBody === 'string') {
  rawBody = rawBody.replace(/^=/, '').trim();
  try { rawBody = JSON.parse(rawBody); } catch (e) { rawBody = {}; }
}
const wb = rawBody;
const consulta = (wb.consulta || wb.text || '').replace(/^=/, '');
const tipo = (wb.tipo || 'main').replace(/^=/, '');
const celularRaw = wb.celular || wb.phone || wb.waId || wb.from ||
  (() => { try { return $('Preparar Sustento F2').first().json.celular; } catch(e) { return ''; } })() ||
  (() => { try { return $('Buscar Pago Confirmado F2').first().json.Celular; } catch(e) { return ''; } })() || '';
const celular = celularRaw.toString().replace(/^=/, '').replace(/\D/g, '');
const nombreRaw = (wb.nombre || 'el cliente').replace(/^=/, '');
const nombre = nombreRaw;
const consultasMain = parseInt(wb.consultasMain || 0);
const reconsultas = parseInt(wb.reconsultas || 0);
let rowFecha = (wb.rowFecha || '').replace(/^=/, '');
const monto = parseFloat(wb.monto || 3);
const s = [3, 6, 9, 9.9].includes(Math.round(monto * 10) / 10) ? Math.round(monto * 10) / 10 : 3;
const DISCLAIMER = '\n\n_Aviso: Esta consulta es referencial y no reemplaza la asesoria de un profesional certificado._';
const depth = { 3: { secs: 3, label: 'BASICO' }, 6: { secs: 4, label: 'INTERMEDIO' }, 9: { secs: 6, label: 'PREMIUM' }, 9.9: { secs: 3, label: 'PRO' } };
const d = depth[s] || depth[3];
const esReconsulta = tipo === 'reconsulta';
const estadoEnSheets = (() => {
  try {
    const rows = $('Buscar Pago Confirmado F2').all();
    const fila = rows.find(r => r.json.Estado === 'consulta_recibida_sin_sustento');
    return fila ? fila.json.Estado : '';
  } catch(e) { return ''; }
})();
const esSustento = tipo === 'sustento' || estadoEnSheets === 'consulta_recibida_sin_sustento';
let srv = (wb.servicio || '').toLowerCase().trim().replace(/^=/, '');
if (!srv) {
  try {
    const rows = $('Buscar Pago Confirmado F2').all();
    if (rows && rows.length > 0 && rows[0].json.Servicio) {
      srv = rows[0].json.Servicio.toLowerCase().trim();
    }
  } catch(e) {}
}
if (!srv) { throw new Error('CRITICO: Servicio no disponible. tipo=' + tipo); }
let systemPrompt = '';
if (srv === 'legal') {
  systemPrompt = 'Eres un abogado peruano experto en derecho civil, penal, laboral y comercial. Proporcionas asesoria legal clara y fundamentada.\nFormato: *ASESORIA LEGAL - ' + d.label + '*\n\n[' + d.secs + ' secciones principales]' + DISCLAIMER;
} else if (srv === 'salud') {
  systemPrompt = 'Eres un medico general experto en diagnostico clinico y orientacion medica preventiva.\nFormato: *ORIENTACION DE SALUD - ' + d.label + '*\n\n[' + d.secs + ' secciones principales]' + DISCLAIMER;
} else if (srv === 'veterinaria') {
  systemPrompt = 'Eres un veterinario experto en medicina animal, diagnostico y cuidado de mascotas.\nFormato: *ORIENTACION VETERINARIA - ' + d.label + '*\n\n[' + d.secs + ' secciones principales]' + DISCLAIMER;
} else if (srv === 'plantas') {
  systemPrompt = 'Eres un agronomo experto en cultivos, plantas ornamentales, huertos caseros y cuidado vegetal.\nFormato: *ORIENTACION DE PLANTAS - ' + d.label + '*\n\n[' + d.secs + ' secciones principales]' + DISCLAIMER;
} else if (srv === 'financiero') {
  systemPrompt = 'Eres un asesor financiero personal experto en finanzas personales, inversiones, presupuesto y planificacion economica.\nFormato: *ASESORIA FINANCIERA - ' + d.label + '*\n\n[' + d.secs + ' secciones principales]' + DISCLAIMER;
} else if (srv === 'nutricionista') {
  systemPrompt = 'Eres un nutricionista profesional experto en nutricion, dietas, salud digestiva y bienestar alimentario.\nFormato: *NUTRICIONISTA EXPRESS - ' + d.label + '*\n\n[' + d.secs + ' secciones principales]' + DISCLAIMER;
}
let consultaFinal = consulta;
if (esSustento) {
  try {
    const rows = $('Buscar Pago Confirmado F2').all();
    const row = rows.filter(r => r.json.Consulta).sort((a, b) => new Date(b.json.Fecha) - new Date(a.json.Fecha))[0];
    if (row) {
      consultaFinal = row.json.Consulta || consulta;
      if (!rowFecha && row.json.Fecha) rowFecha = row.json.Fecha;
    }
  } catch(e) {}
}
const tipoSustento = $input.first().json.tipoSustento || 'texto';
const contenidoSustento = $input.first().json.contenidoSustento || null;
let userContent;
if (esSustento && tipoSustento === 'imagen' && contenidoSustento) {
  userContent = [{ type: 'text', text: 'Caso de ' + nombre + ':\n\n' + consultaFinal + '\n\nAnaliza la imagen adjunta.\n\nServicio: ' + srv.toUpperCase() + ' - S/ ' + s }, { type: 'image_url', image_url: { url: contenidoSustento } }];
} else if (esSustento && tipoSustento === 'pdf' && contenidoSustento) {
  userContent = [{ type: 'text', text: 'Caso de ' + nombre + ':\n\n' + consultaFinal + '\n\nAnaliza el documento PDF adjunto.\n\nServicio: ' + srv.toUpperCase() + ' - S/ ' + s }, { type: 'image_url', image_url: { url: 'data:application/pdf;base64,' + contenidoSustento } }];
} else if (esSustento && tipoSustento === 'word' && contenidoSustento) {
  userContent = 'Caso de ' + nombre + ':\n\n' + consultaFinal + '\n\nDocumento de sustento:\n' + contenidoSustento + '\n\nServicio: ' + srv.toUpperCase() + ' - S/ ' + s;
} else if (esReconsulta) {
  userContent = 'Seguimiento de ' + nombre + ' (reconsulta ' + (reconsultas + 1) + '):\n\n' + consultaFinal + '\n\nServicio: ' + srv.toUpperCase() + ' - S/ ' + s;
} else {
  userContent = 'Consulta de ' + nombre + ':\n\n' + consultaFinal + '\n\nServicio: ' + srv.toUpperCase() + ' - S/ ' + s;
}
const payload = JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }], max_tokens: 1500, temperature: 0.7 });
return [{ json: { celular, servicio: srv, monto: s, nombre, payload, rowFecha, tipo, consultasMain, reconsultas, Estado: 'entregado' } }];