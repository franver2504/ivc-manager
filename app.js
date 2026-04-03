/**
 * IVC Manager Pro — Lógica de la aplicación (app.js)
 *
 * Cada función hace UNA sola cosa.
 * Depende de: data.js, ui.js
 * No accede a localStorage directamente — siempre usa DB.*
 */

// ─── AUTH ─────────────────────────────────────────────────────────────────────

async function doLogin() {
  const username = document.getElementById('li-user').value.trim().toLowerCase();
  const password = document.getElementById('li-pass').value;

  const btnLogin = document.getElementById('btn-login') || document.querySelector('button[onclick*="doLogin"]');
  if (btnLogin) btnLogin.disabled = true;

  const user = await DB.findUserByCredentials(username, password);

  if (btnLogin) btnLogin.disabled = false;

  if (!user) {
    document.getElementById('li-err').style.display = 'block';
    return;
  }

  State.currentUser = { ...user };
  document.getElementById('li-err').style.display = 'none';
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';

  await cargarTodosLosDatos();
  _actualizarUIUsuario();
  goTo('dashboard');
}

async function doLogout() {
  await DB.doLogoutDB();
  State.currentUser = null;
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('li-user').value = '';
  document.getElementById('li-pass').value = '';
}

function _actualizarUIUsuario() {
  const u = State.currentUser;
  document.getElementById('sb-av').textContent    = u.ini;
  document.getElementById('sb-uname').textContent = u.name;
  document.getElementById('sb-urole').textContent = Format.rolLabel(u.rol);
  document.getElementById('dash-date').textContent = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  // Mostrar/ocultar items de admin
  document.querySelectorAll('.nav-admin').forEach(el => {
    el.style.display = can('canUsers') ? 'flex' : 'none';
  });
}

// ─── NAVEGACIÓN ───────────────────────────────────────────────────────────────

const PAGE_RENDERERS = {
  dashboard:    renderDash,
  inventario:   renderInv,
  eventos:      renderEv,
  cotizaciones: renderCotizaciones,
  calendario:   renderCalendario,
  alertas:      renderAlertas,
  trazabilidad: renderTraz,
  reportes:     renderReportes,
  clientes:     renderClientes,
  personal:     renderPersonal,
  historial:    renderHistSelect,
  usuarios:     renderUsers,
};

function goTo(pagina) {
  // Desactivar todo
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  // Activar página
  const pageEl = document.getElementById('page-' + pagina);
  if (pageEl) pageEl.classList.add('active');

  // Activar nav item correspondiente
  const navMap = Object.keys(PAGE_RENDERERS);
  const navItems = document.querySelectorAll('.nav-item');
  navMap.forEach((nombre, i) => {
    if (nombre === pagina && navItems[i]) navItems[i].classList.add('active');
  });

  // Llamar renderer
  if (PAGE_RENDERERS[pagina]) PAGE_RENDERERS[pagina]();
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

function renderDash() {
  _renderDashStats();
  _renderDashNotificaciones();
  _renderDashAlertas();
  _renderDashProximosEventos();
  _renderDashEquiposEnUso();
  updateAlertBadge();
}

function _renderDashStats() {
  const equipos  = DB.getEquipos();
  const eventos  = DB.getEventos();
  const cots     = DB.getCotizaciones();

  const total      = equipos.length;
  const disponibles= equipos.filter(e => Calc.disponibles(e) === e.cant && e.estado !== 'Mantenimiento').length;
  const mantenimiento = equipos.filter(e => e.estado === 'Mantenimiento').length;
  const activos    = eventos.filter(e => e.estado === 'En curso').length;
  const cotPend    = cots.filter(c => c.estado === 'Pendiente').length;

  document.getElementById('dash-stats').innerHTML = `
    <div class="stat s-accent" onclick="showDetail('total')">
      <div class="stat-lbl">Total equipos</div>
      <div class="stat-v">${total}</div>
      <div class="stat-sub">En inventario</div>
      <div class="stat-hint">↗ Ver todos</div>
    </div>
    <div class="stat s-ok" onclick="showDetail('disponibles')">
      <div class="stat-lbl">Disponibles</div>
      <div class="stat-v">${disponibles}</div>
      <div class="stat-sub">Listos para alquilar</div>
      <div class="stat-hint">↗ Ver detalle</div>
    </div>
    <div class="stat s-warn" onclick="showDetail('mantenimiento')">
      <div class="stat-lbl">Mantenimiento</div>
      <div class="stat-v">${mantenimiento}</div>
      <div class="stat-sub">Fuera de servicio</div>
      <div class="stat-hint">↗ Ver detalle</div>
    </div>
    <div class="stat s-err" onclick="showDetail('activos')">
      <div class="stat-lbl">Eventos activos</div>
      <div class="stat-v">${activos}</div>
      <div class="stat-sub">En producción</div>
      <div class="stat-hint">↗ Ver detalle</div>
    </div>
    <div class="stat s-info" onclick="goTo('cotizaciones')">
      <div class="stat-lbl">Cotizaciones</div>
      <div class="stat-v">${cotPend}</div>
      <div class="stat-sub">Pendientes</div>
      <div class="stat-hint">↗ Ver cotizaciones</div>
    </div>
  `;
}

function _renderDashNotificaciones() {
  const notifs = Calc.notificaciones();
  document.getElementById('notif-banner').innerHTML = notifs
    .slice(0, 4)
    .map(n => `<div class="alert a-${n.tipo}" style="margin-bottom:6px">${n.msg}</div>`)
    .join('');
}

function _renderDashAlertas() {
  const alertas = Calc.alertasMantenimiento();
  document.getElementById('d-alertas').innerHTML = alertas.length
    ? alertas.map(e => {
        const dias  = Calc.diasHastaMant(e.mantFecha);
        const isMant = e.estado === 'Mantenimiento';
        return `<div class="alert ${isMant ? 'a-err' : 'a-warn'}" style="cursor:pointer"
          onclick="showDetail('equipo', ${e.id})">
          <b>${e.nombre}</b>${isMant ? ' — En mantenimiento' : ` — en ${dias} día${dias === 1 ? '' : 's'}`}
        </div>`;
      }).join('')
    : '<div class="alert a-ok">Sin alertas urgentes esta semana</div>';
}

function _renderDashProximosEventos() {
  const proximos = DB.getEventos()
    .filter(e => e.estado === 'Planificado')
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .slice(0, 5);

  document.getElementById('d-eventos').innerHTML = proximos.length
    ? proximos.map(e => `
        <div class="dash-ev-item" onclick="abrirDetalleEvento(${e.id})">
          <div>
            <div style="font-size:12.5px;font-weight:600">${e.nombre}</div>
            <div style="font-size:10.5px;color:var(--text3)">${e.cliente} · ${e.inicio}</div>
          </div>
          <span class="badge b-accent" style="flex-shrink:0">Planif.</span>
        </div>`).join('')
    : '<div class="empty">Sin eventos próximos</div>';
}

function _renderDashEquiposEnUso() {
  const enCurso = DB.getEventos().filter(e => e.estado === 'En curso');

  document.getElementById('d-uso').innerHTML = enCurso.length
    ? `<table>
        <thead><tr><th>Evento</th><th>Cliente</th><th>Equipos</th><th>Hasta</th></tr></thead>
        <tbody>
          ${enCurso.map(e => {
            const eqTexto = (e.equiposCant || [])
              .map(x => {
                const eq = DB.getEquipo(x.id);
                return eq ? `${eq.nombre} ×${x.cant}` : '';
              })
              .filter(Boolean)
              .join(', ');
            return `<tr class="dash-uso-row" onclick="abrirDetalleEvento(${e.id})" style="cursor:pointer">
              <td><b>${e.nombre}</b></td>
              <td>${e.cliente}</td>
              <td style="font-size:11.5px">${eqTexto}</td>
              <td>${e.fin}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`
    : '<div class="empty">No hay equipos en uso actualmente</div>';
}

function updateAlertBadge() {
  const n     = Calc.alertasMantenimiento().length;
  const badge = document.getElementById('alert-badge');
  badge.textContent    = n;
  badge.style.display  = n > 0 ? 'inline' : 'none';
}

// ─── DETALLE DASHBOARD (MODAL) ────────────────────────────────────────────────

function showDetail(tipo, id) {
  const titulo = document.getElementById('detail-title');
  const cuerpo = document.getElementById('detail-body');
  let   html   = '';

  switch (tipo) {
    case 'total': {
      const equipos = DB.getEquipos();
      titulo.textContent = `Todos los equipos (${equipos.length})`;
      const cats = [...new Set(equipos.map(e => e.cat))];

      html += '<div class="detail-sec"><div class="detail-sec-title">Por categoría</div>';
      cats.forEach(cat => {
        const lista  = equipos.filter(e => e.cat === cat);
        const total  = lista.reduce((s, e) => s + e.cant, 0);
        const disp   = lista.reduce((s, e) => s + Calc.disponibles(e), 0);
        const pct    = total > 0 ? Math.round(disp / total * 100) : 0;
        const badgeCls = pct === 100 ? 'b-ok' : pct === 0 ? 'b-err' : 'b-info';
        html += `<div class="eq-detail-card">
          <div style="flex:1">
            <div style="font-weight:600;font-size:13px">${cat}</div>
            <div style="font-size:10.5px;color:var(--text3)">${lista.length} tipo${lista.length !== 1 ? 's' : ''} · ${total} unidades · ${disp} disponibles</div>
            <div class="prog-wrap" style="width:100%"><div class="prog-bar" style="width:${pct}%;background:var(--ok)"></div></div>
          </div>
          <span class="badge ${badgeCls}" style="margin-left:10px">${pct}%</span>
        </div>`;
      });
      html += '</div>';

      html += '<div class="detail-sec"><div class="detail-sec-title">Lista completa</div>';
      equipos.forEach(e => {
        html += `<div class="detail-kv">
          <span>${e.nombre} <span style="font-size:10px;color:var(--text3)">(${e.serial})</span></span>
          <span>${Calc.disponibles(e)}/${e.cant} ${Badge.equipo(e)}</span>
        </div>`;
      });
      html += '</div>';
      break;
    }

    case 'disponibles': {
      const lista = DB.getEquipos().filter(e => Calc.disponibles(e) === e.cant && e.estado !== 'Mantenimiento');
      titulo.textContent = `Equipos disponibles (${lista.length})`;
      html += '<div class="detail-sec"><div class="detail-sec-title">Disponibles al 100%</div>';
      if (!lista.length) {
        html += '<div class="empty">Ningún equipo completamente disponible</div>';
      } else {
        lista.forEach(e => {
          html += `<div class="detail-kv"><span>${e.nombre}</span><span>${e.cant} uds · ${Format.moneda(e.tarifa)}/día</span></div>`;
        });
      }
      html += '</div>';
      break;
    }

    case 'mantenimiento': {
      const lista = DB.getEquipos().filter(e => e.estado === 'Mantenimiento');
      titulo.textContent = `En mantenimiento (${lista.length})`;
      lista.forEach(e => {
        html += `<div class="eq-detail-card">
          <div style="flex:1">
            <div style="font-weight:600">${e.nombre}</div>
            <div style="font-size:10.5px;color:var(--text3)">${e.cat} · ${e.serial}</div>
            ${e.mantNotas ? `<div style="font-size:11px;color:var(--warn-t);margin-top:3px">${e.mantNotas}</div>` : ''}
          </div>
          <button class="btn btn-ok btn-sm" style="flex-shrink:0;margin-left:10px"
            onclick="cambiarEstadoEquipo(${e.id}, 'Disponible'); Modal.close('modal-detail')">
            ✔ Disponible
          </button>
        </div>`;
      });
      break;
    }

    case 'activos': {
      const lista = DB.getEventos().filter(e => e.estado === 'En curso');
      titulo.textContent = `Eventos activos (${lista.length})`;
      lista.forEach(e => {
        const pNombres = (e.personal || [])
          .map(pid => DB.getPersona(pid)?.nombre || '?')
          .join(', ');
        const eqTexto = (e.equiposCant || [])
          .map(x => { const eq = DB.getEquipo(x.id); return eq ? `${eq.nombre} ×${x.cant}` : ''; })
          .filter(Boolean);
        html += `<div class="eq-detail-card" style="flex-direction:column;align-items:flex-start;gap:7px">
          <div style="display:flex;justify-content:space-between;width:100%">
            <b style="font-size:13px">${e.nombre}</b>
            <span class="badge b-info">En curso</span>
          </div>
          <div style="font-size:11.5px;color:var(--text2)">${e.cliente} · ${e.inicio} → ${e.fin}</div>
          <div style="font-size:11px;color:var(--text3)">${eqTexto.join(' · ')}</div>
          ${pNombres ? `<div style="font-size:11px;color:var(--text3)">👥 ${pNombres}</div>` : ''}
        </div>`;
      });
      break;
    }

    case 'equipo': {
      const e = DB.getEquipo(id);
      if (!e) return;
      titulo.textContent = e.nombre;
      const disp = Calc.disponibles(e);
      const pct  = e.cant > 0 ? Math.round(disp / e.cant * 100) : 0;
      const barColor = pct === 100 ? 'var(--ok)' : pct === 0 ? 'var(--err)' : 'var(--accent)';
      const diasMant = Calc.diasHastaMant(e.mantFecha);

      html += `<div class="detail-sec">
        <div style="margin-bottom:12px">
          ${Badge.equipo(e)}
          <div class="prog-wrap" style="margin-top:8px;width:100%">
            <div class="prog-bar" style="width:${pct}%;background:${barColor}"></div>
          </div>
          <div style="font-size:10.5px;color:var(--text3);margin-top:3px">${disp} de ${e.cant} disponibles</div>
        </div>
        <div class="detail-kv"><span>Serial</span><span style="font-family:monospace">${e.serial}</span></div>
        <div class="detail-kv"><span>Tarifa/día</span><span style="color:var(--accent-t)">${Format.moneda(e.tarifa)}</span></div>
        ${e.mantFecha ? `<div class="detail-kv"><span>Próx. mantenimiento</span>${Badge.mantenimiento(diasMant)}</div>` : ''}
        ${e.notas ? `<div class="detail-kv"><span>Notas</span><span style="color:var(--text2)">${e.notas}</span></div>` : ''}
      </div>`;
      break;
    }
  }

  cuerpo.innerHTML = html;
  Modal.open('modal-detail');
}

// ─── INVENTARIO ───────────────────────────────────────────────────────────────

function renderInv() {
  const query   = document.getElementById('inv-q').value.toLowerCase();
  const cat     = document.getElementById('inv-cat').value;
  const estFilt = document.getElementById('inv-est').value;

  const lista = DB.getEquipos().filter(e => {
    if (query && !e.nombre.toLowerCase().includes(query) && !e.serial.toLowerCase().includes(query)) return false;
    if (cat && e.cat !== cat) return false;
    if (estFilt) {
      const disp = Calc.disponibles(e);
      if (estFilt === 'Disponible'   && !(disp === e.cant && e.estado !== 'Mantenimiento')) return false;
      if (estFilt === 'En evento'    && !(disp < e.cant  && e.estado !== 'Mantenimiento')) return false;
      if (estFilt === 'Mantenimiento' && e.estado !== 'Mantenimiento') return false;
    }
    return true;
  });

  const filas = lista.map(e => {
    const dias = Calc.diasHastaMant(e.mantFecha);
    const edBtn  = can('canEdit')   ? `<button class="btn btn-sm" onclick="abrirEditorEquipo(${e.id})">Editar</button>` : '';
    const delBtn = can('canDelete') ? `<button class="btn-del" onclick="confirmarEliminarEquipo(${e.id})">Borrar</button>` : '';
    return `<tr>
      <td><div class="td-main">${e.nombre}</div><div class="td-sub">${e.serial}</div></td>
      <td>${e.cat}</td>
      <td>${e.cant}</td>
      <td><b>${Calc.disponibles(e)}</b></td>
      <td style="color:var(--accent-t);font-weight:600">${Format.moneda(e.tarifa || 0)}</td>
      <td>${Badge.mantenimiento(dias)}</td>
      <td>${Badge.equipo(e)}</td>
      <td><div style="display:flex;gap:4px">${edBtn}${delBtn}</div></td>
    </tr>`;
  });

  document.getElementById('tbody-inv').innerHTML = filas.length
    ? filas.join('')
    : '<tr><td colspan="8"><div class="empty">No se encontraron equipos</div></td></tr>';

  document.getElementById('btn-add-eq').style.display = can('canEdit') ? 'inline-flex' : 'none';
}

function abrirEditorEquipo(id) {
  if (!can('canEdit')) return;
  const isNuevo = !id;
  const e = id ? DB.getEquipo(id) : {};

  document.getElementById('modal-eq-title').textContent = isNuevo ? 'Agregar equipo' : 'Editar equipo';
  document.getElementById('eq-id').value = id || '';
  ['nombre', 'cat', 'cant', 'estado', 'tarifa', 'serial', 'notas'].forEach(k => {
    const el = document.getElementById('eq-' + k);
    if (el) el.value = e[k] || (k === 'cant' ? 1 : '');
  });
  Modal.open('modal-eq');
}

function guardarEquipo() {
  if (!can('canEdit')) return;

  const nombre = document.getElementById('eq-nombre').value.trim();
  if (!nombre) { Toast.error('El nombre del equipo es obligatorio'); return; }

  const datos = {
    nombre,
    cat:    document.getElementById('eq-cat').value,
    cant:   parseInt(document.getElementById('eq-cant').value) || 1,
    estado: document.getElementById('eq-estado').value,
    tarifa: parseInt(document.getElementById('eq-tarifa').value) || 0,
    serial: document.getElementById('eq-serial').value.trim(),
    notas:  document.getElementById('eq-notas').value.trim(),
  };

  const id = document.getElementById('eq-id').value;
  if (id) {
    DB.actualizarEquipo(parseInt(id), datos);
    Toast.ok('Equipo actualizado');
  } else {
    DB.crearEquipo(datos);
    Toast.ok('Equipo agregado al inventario');
  }

  Modal.close('modal-eq');
  renderInv();
  updateAlertBadge();
}

async function confirmarEliminarEquipo(id) {
  if (!can('canDelete')) return;
  const eq = DB.getEquipo(id);
  const ok = await mostrarConfirm(
    `¿Eliminar <b>${eq.nombre}</b> del inventario? Esta acción no se puede deshacer.`,
    { titulo: 'Eliminar equipo', btnOk: 'Eliminar', tipo: 'danger' }
  );
  if (!ok) return;
  DB.eliminarEquipo(id);
  Toast.ok('Equipo eliminado');
  renderInv();
  updateAlertBadge();
}

function cambiarEstadoEquipo(id, nuevoEstado) {
  const equipo = DB.getEquipo(id);
  if (!equipo) return;

  const notas = nuevoEstado === 'Mantenimiento' ? 'Enviado a mantenimiento' : 'Disponible nuevamente';
  DB.registrarMovimiento(nuevoEstado === 'Mantenimiento' ? 'mantenimiento' : 'mant_ok', equipo, equipo.cant, '—', notas);
  DB.actualizarEquipo(id, {
    estado:    nuevoEstado,
    mantFecha: nuevoEstado === 'Disponible' ? '' : equipo.mantFecha,
  });

  Toast.ok(nuevoEstado === 'Disponible' ? `${equipo.nombre} marcado como disponible` : `${equipo.nombre} enviado a mantenimiento`);
  renderAlertas();
  renderInv();
  updateAlertBadge();
  renderDash();
}

// ─── EVENTOS ──────────────────────────────────────────────────────────────────

let evFiltroActivo = '';

function setEvFiltro(btn, estado) {
  evFiltroActivo = estado;
  document.querySelectorAll('.ev-filt-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('ev-est').value = estado;
  renderEv();
}

function renderEv() {
  const query   = document.getElementById('ev-q').value.toLowerCase();
  const filtEst = document.getElementById('ev-est').value;

  let lista = DB.getEventos().filter(e => {
    if (query && !e.nombre.toLowerCase().includes(query) && !e.cliente.toLowerCase().includes(query)) return false;
    if (filtEst && e.estado !== filtEst) return false;
    return true;
  });

  const orden = { 'En curso': 0, 'Planificado': 1, 'Finalizado': 2 };
  lista.sort((a, b) => {
    const diff = orden[a.estado] - orden[b.estado];
    return diff !== 0 ? diff : a.inicio.localeCompare(b.inicio);
  });

  if (!lista.length) {
    document.getElementById('tbody-ev').innerHTML = '<tr><td colspan="7"><div class="empty">No se encontraron eventos</div></td></tr>';
    return;
  }

  let html = '';
  let ultimoEstado = '';

  lista.forEach(e => {
    // Separador de grupo
    if (e.estado !== ultimoEstado) {
      ultimoEstado = e.estado;
      html += `<tr>
        <td colspan="7" style="padding:9px 11px 5px;background:var(--surface2);border-bottom:1px solid var(--border)">
          <span style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--text3)">${e.estado}</span>
        </td>
      </tr>`;
    }

    const finalizado = e.estado === 'Finalizado';
    const pNombres   = (e.personal || [])
      .map(pid => DB.getPersona(pid)?.nombre.split(' ')[0] || '?')
      .join(', ');
    const eqResumen  = (e.equiposCant || [])
      .map(x => { const eq = DB.getEquipo(x.id); return eq ? `${eq.nombre} ×${x.cant}` : ''; })
      .filter(Boolean)
      .join(', ');

    // Botón de estado
    let btnEstado = '';
    if (e.estado === 'Planificado' && can('canEdit')) {
      btnEstado = `<button class="btn btn-sm" style="background:var(--info-l);color:var(--info-t);border-color:rgba(59,130,246,.3);font-weight:700"
        onclick="event.stopPropagation(); iniciarEvento(${e.id})">▶ Iniciar</button>`;
    } else if (e.estado === 'En curso' && !e.retornado && can('canEdit')) {
      btnEstado = `<button class="btn btn-warn btn-sm" onclick="event.stopPropagation(); abrirRetorno(${e.id})">↩ Retorno</button>`;
    } else if (e.retornado) {
      btnEstado = '<span class="badge b-ok">Retornado ✔</span>';
    }

    const editBtn  = (!finalizado && can('canEdit'))   ? `<button class="btn btn-sm" onclick="event.stopPropagation(); abrirEditorEvento(${e.id})">Editar</button>` : '';
    const actaBtn  = `<button class="btn btn-sm" style="background:var(--accent-l);color:var(--accent-t);border-color:transparent" onclick="event.stopPropagation(); abrirActaSalida(${e.id})">Acta</button>`;
    const delBtn   = can('canDelete') ? `<button class="btn-del" onclick="event.stopPropagation(); confirmarEliminarEvento(${e.id})">Borrar</button>` : '';

    html += `<tr class="ev-row-click" onclick="abrirDetalleEvento(${e.id})" style="${finalizado ? 'opacity:.8' : ''}">
      <td>
        <div class="td-main">${e.nombre}</div>
        ${e.retornado ? '<div class="td-sub" style="color:var(--ok-t)">Equipos devueltos ✔</div>' : ''}
        ${finalizado && !e.retornado ? '<div class="td-sub">Cerrado</div>' : ''}
      </td>
      <td>${e.cliente}</td>
      <td style="font-size:11.5px">
        ${e.inicio}${e.fin !== e.inicio ? `<br><span style="color:var(--text3)">→ ${e.fin}</span>` : ''}
      </td>
      <td style="font-size:11.5px;color:var(--text2)">${pNombres || '—'}</td>
      <td style="font-size:11.5px;max-width:150px">
        <span style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${eqResumen}">${eqResumen || '—'}</span>
      </td>
      <td>${Badge.evento(e.estado)}</td>
      <td>
        <div class="ev-acts" onclick="event.stopPropagation()">
          ${editBtn}${actaBtn}${btnEstado}${delBtn}
        </div>
      </td>
    </tr>`;
  });

  document.getElementById('tbody-ev').innerHTML = html;
}

function abrirDetalleEvento(id) {
  const e = DB.getEvento(id);
  if (!e) return;

  document.getElementById('evd-nombre').textContent = e.nombre;
  document.getElementById('evd-badges').innerHTML =
    Badge.evento(e.estado) +
    (e.retornado ? '<span class="badge b-ok" style="margin-left:5px">Retornado ✔</span>' : '');

  // Personal
  const personalHTML = (e.personal || []).map(pid => {
    const p = DB.getPersona(pid);
    return p ? `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-weight:600;font-size:12.5px">${p.nombre}</div>
        <div style="font-size:10.5px;color:var(--text3)">${p.cargo}</div>
      </div>
    </div>` : '';
  }).join('');

  // Equipos
  const equiposHTML = (e.equiposCant || []).map(x => {
    const eq = DB.getEquipo(x.id);
    if (!eq) return '';
    return `<div class="eq-detail-card">
      <div style="flex:1">
        <div style="font-weight:600">${eq.nombre}</div>
        <div style="font-size:10.5px;color:var(--text3)">${eq.cat} · ${eq.serial}</div>
      </div>
      <span class="badge b-info">×${x.cant}</span>
    </div>`;
  }).join('');

  // Historial de movimientos de este evento
  const movimientos = DB.getTrazabilidad().filter(t => t.eventoNombre === e.nombre);
  const histHTML = movimientos.length
    ? movimientos.map(t => `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:11.5px">
          <span style="color:var(--text3);min-width:110px">${t.fecha.replace('T', ' ')}</span>
          ${Badge.trazabilidad(t.tipo)}
          <span style="flex:1">${t.eqNombre} ×${t.cant}</span>
          <span style="color:var(--text3)">${t.usuario}</span>
        </div>`).join('')
    : '<div class="empty" style="padding:10px 0">Sin movimientos registrados</div>';

  // Botones de acción
  let botonesHTML = '';
  if (e.estado !== 'Finalizado' && can('canEdit')) {
    if (e.estado === 'Planificado') {
      botonesHTML += `<button class="btn btn-sm" style="background:var(--info-l);color:var(--info-t);border-color:rgba(59,130,246,.3)"
        onclick="iniciarEvento(${e.id}); Modal.close('modal-ev-detail')">▶ Iniciar evento</button>`;
    }
    if (e.estado === 'En curso' && !e.retornado) {
      botonesHTML += `<button class="btn btn-warn btn-sm"
        onclick="Modal.close('modal-ev-detail'); abrirRetorno(${e.id})">↩ Confirmar retorno</button>`;
    }
    botonesHTML += `<button class="btn btn-sm" style="background:var(--accent-l);color:var(--accent-t);border-color:transparent"
      onclick="Modal.close('modal-ev-detail'); abrirActaSalida(${e.id})">Acta salida</button>`;
    if (!e.estado === 'Finalizado') {
      botonesHTML += `<button class="btn btn-sm"
        onclick="Modal.close('modal-ev-detail'); abrirEditorEvento(${e.id})">Editar</button>`;
    }
  }

  document.getElementById('evd-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <div style="background:var(--surface2);border-radius:8px;padding:11px 13px">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:3px">Cliente</div>
        <div style="font-weight:600;font-size:13px">${e.cliente}</div>
      </div>
      <div style="background:var(--surface2);border-radius:8px;padding:11px 13px">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:3px">Fechas</div>
        <div style="font-weight:600;font-size:13px">${e.inicio}${e.fin !== e.inicio ? ' → ' + e.fin : ''}</div>
      </div>
    </div>
    ${e.notas ? `<div style="background:var(--surface2);border-radius:8px;padding:9px 11px;margin-bottom:14px;font-size:12px;color:var(--text2);font-style:italic">${e.notas}</div>` : ''}
    ${personalHTML ? `<div style="margin-bottom:14px"><div class="detail-sec-title">Personal asignado</div>${personalHTML}</div>` : ''}
    ${equiposHTML  ? `<div style="margin-bottom:14px"><div class="detail-sec-title">Equipos asignados</div>${equiposHTML}</div>` : ''}
    <div style="margin-bottom:14px"><div class="detail-sec-title">Historial de movimientos</div>${histHTML}</div>
    ${botonesHTML  ? `<div style="display:flex;gap:7px;flex-wrap:wrap;padding-top:12px;border-top:1px solid var(--border)">${botonesHTML}</div>` : ''}
  `;

  Modal.open('modal-ev-detail');
}

function verificarConflictosFechas() {
  const inicio = document.getElementById('ev-inicio').value;
  const fin    = document.getElementById('ev-fin').value;
  if (!inicio || !fin) return;

  const evId    = parseInt(document.getElementById('ev-id').value) || 0;
  const solapados = DB.getEventos().filter(e =>
    e.id !== evId &&
    e.estado !== 'Finalizado' &&
    !(e.fin < inicio || e.inicio > fin)
  );

  const alerta = document.getElementById('conflict-alert');
  if (solapados.length) {
    alerta.style.display = 'block';
    alerta.textContent = `Conflicto de fechas con: ${solapados.map(e => e.nombre).join(', ')}`;
  } else {
    alerta.style.display = 'none';
  }
}

function sugerirCliente(inputId, suggId) {
  const q   = document.getElementById(inputId).value;
  const box = document.getElementById(suggId);
  if (!q || q.length < 2) { box.style.display = 'none'; return; }

  const resultados = DB.getClientes()
    .filter(c => `${c.nombre} ${c.empresa}`.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 4);

  if (!resultados.length) { box.style.display = 'none'; return; }

  box.style.display = 'block';
  box.innerHTML = resultados.map(c =>
    `<div style="padding:8px 11px;cursor:pointer;font-size:12.5px;border-bottom:1px solid var(--border)"
      onmousedown="document.getElementById('${inputId}').value='${c.nombre}'; document.getElementById('${suggId}').style.display='none'">
      ${c.nombre}${c.empresa ? ' — ' + c.empresa : ''}
    </div>`
  ).join('');
}

function abrirEditorEvento(id) {
  if (!can('canEdit')) return;
  const isNuevo = !id;
  const e = id ? DB.getEvento(id) : {};

  if (!isNuevo && e.estado === 'Finalizado') {
    Toast.warn('Los eventos finalizados no se pueden editar');
    return;
  }

  document.getElementById('modal-ev-title').textContent = isNuevo ? 'Nuevo evento' : 'Editar evento';
  document.getElementById('ev-id').value       = id || '';
  document.getElementById('ev-nombre').value   = e.nombre   || '';
  document.getElementById('ev-cliente').value  = e.cliente  || '';
  document.getElementById('ev-inicio').value   = e.inicio   || '';
  document.getElementById('ev-fin').value      = e.fin      || '';
  document.getElementById('ev-estado').value   = e.estado   || 'Planificado';
  document.getElementById('ev-notas').value    = e.notas    || '';

  Chips.cargar(e.equiposCant || [], e.personal || []);
  Modal.open('modal-ev');
}

function guardarEvento() {
  const nombre  = document.getElementById('ev-nombre').value.trim();
  const cliente = document.getElementById('ev-cliente').value.trim();
  if (!nombre) { Toast.error('El nombre del evento es obligatorio'); return; }

  const datos = {
    nombre,
    cliente,
    inicio:      document.getElementById('ev-inicio').value,
    fin:         document.getElementById('ev-fin').value,
    estado:      document.getElementById('ev-estado').value,
    equiposCant: Chips.getEquiposCant('equipos'),
    personal:    Chips.getPersonalIds(),
    notas:       document.getElementById('ev-notas').value.trim(),
  };

  const id = document.getElementById('ev-id').value;
  if (id) {
    DB.actualizarEvento(parseInt(id), datos);
    Toast.ok('Evento actualizado');
  } else {
    DB.crearEvento(datos);
    Toast.ok('Evento creado');
  }

  Modal.close('modal-ev');
  renderEv();
  _renderDashNotificaciones();
}

async function confirmarEliminarEvento(id) {
  if (!can('canDelete')) return;
  const e = DB.getEvento(id);
  const ok = await mostrarConfirm(
    `¿Eliminar el evento <b>${e.nombre}</b>? Esta acción no se puede deshacer.`,
    { titulo: 'Eliminar evento', btnOk: 'Eliminar', tipo: 'danger' }
  );
  if (!ok) return;
  DB.eliminarEvento(id);
  Toast.ok('Evento eliminado');
  renderEv();
}

async function iniciarEvento(id) {
  if (!can('canEdit')) return;
  const ev = DB.getEvento(id);
  if (!ev) return;

  // Verificar disponibilidad
  const faltantes = (ev.equiposCant || [])
    .map(x => {
      const eq = DB.getEquipo(x.id);
      if (!eq) return null;
      const disp = Calc.disponibles(eq);
      return disp < x.cant ? `${eq.nombre} (necesita ${x.cant}, disponibles ${disp})` : null;
    })
    .filter(Boolean);

  if (faltantes.length) {
    Toast.error('Equipos insuficientes:<br>' + faltantes.join('<br>'));
    return;
  }

  const ok = await mostrarConfirm(
    `¿Iniciar el evento <b>${ev.nombre}</b>? Los equipos quedarán marcados como no disponibles.`,
    { titulo: 'Iniciar evento', btnOk: 'Iniciar', tipo: 'ok' }
  );
  if (!ok) return;

  // Registrar salida en trazabilidad
  (ev.equiposCant || []).forEach(x => {
    const eq = DB.getEquipo(x.id);
    if (eq) DB.registrarMovimiento('salida', eq, x.cant, ev.nombre, 'Evento iniciado');
  });

  DB.actualizarEvento(id, { estado: 'En curso' });
  Toast.ok(`Evento "${ev.nombre}" iniciado`);
  renderEv();
  renderDash();
  renderInv();
  updateAlertBadge();
}

// ─── RETORNO ──────────────────────────────────────────────────────────────────

function abrirRetorno(id) {
  retornoEvId = id;
  const ev = DB.getEvento(id);
  if (!ev) return;

  let listaHTML = '<div style="font-size:12px;color:var(--text2);margin-bottom:10px">Equipos que regresan al inventario:</div>';
  listaHTML += '<div style="border:1px solid var(--border);border-radius:7px;overflow:hidden">';
  listaHTML += '<table style="margin:0"><thead><tr><th>Equipo</th><th>Serial</th><th>Cant.</th></tr></thead><tbody>';
  (ev.equiposCant || []).forEach(x => {
    const eq = DB.getEquipo(x.id);
    if (eq) {
      listaHTML += `<tr>
        <td><b>${eq.nombre}</b></td>
        <td style="font-size:11px;color:var(--text3)">${eq.serial}</td>
        <td style="text-align:center"><b>${x.cant}</b></td>
      </tr>`;
    }
  });
  listaHTML += '</tbody></table></div>';

  document.getElementById('retorno-lista').innerHTML = listaHTML;
  ['ret-obs', 'ret-entrega'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const recibeEl = document.getElementById('ret-recibe');
  if (recibeEl) recibeEl.value = State.currentUser?.name || '';

  Modal.open('modal-retorno');
}

async function confirmarRetorno() {
  const ev = DB.getEvento(retornoEvId);
  if (!ev) return;

  const obs = document.getElementById('ret-obs').value;

  // Registrar retornos en trazabilidad
  (ev.equiposCant || []).forEach(x => {
    const eq = DB.getEquipo(x.id);
    if (eq) DB.registrarMovimiento('retorno', eq, x.cant, ev.nombre, obs || '');
  });

  DB.actualizarEvento(retornoEvId, {
    retornado: true,
    estado:    'Finalizado',
    notas:     ev.notas + (obs ? `\nRetorno: ${obs}` : ''),
  });

  Toast.ok(`Retorno confirmado — equipos de "${ev.nombre}" disponibles nuevamente`);
  Modal.close('modal-retorno');
  renderEv();
  renderDash();
  renderInv();
  updateAlertBadge();
  _renderDashNotificaciones();
}

// ─── ACTAS ────────────────────────────────────────────────────────────────────

let actaEvId    = null;
let retornoEvId = null;

function abrirActaSalida(id) {
  actaEvId = id;
  const ev = DB.getEvento(id);
  if (!ev) return;

  document.getElementById('sal-evento').value  = `${ev.nombre} – ${ev.cliente}`;
  document.getElementById('sal-fecha').value   = ev.inicio;
  document.getElementById('sal-entrega').value = State.currentUser?.name || '';
  ['sal-recibe', 'sal-cargo', 'sal-obs'].forEach(field => {
    const el = document.getElementById(field);
    if (el) el.value = '';
  });
  Modal.open('modal-salida');
}

function imprimirActa(tipoActa) {
  const evId = tipoActa === 'salida' ? actaEvId : retornoEvId;
  const ev   = DB.getEvento(evId);
  if (!ev) return;

  const entrega = tipoActa === 'salida'
    ? document.getElementById('sal-entrega').value || '_____________'
    : document.getElementById('ret-entrega').value || '_____________';
  const recibe = tipoActa === 'salida'
    ? document.getElementById('sal-recibe').value  || '_____________'
    : document.getElementById('ret-recibe').value  || '_____________';
  const cargo   = tipoActa === 'salida' ? (document.getElementById('sal-cargo').value || '_____________') : 'Técnico IVC';
  const fecha   = tipoActa === 'salida' ? document.getElementById('sal-fecha').value  : ev.fin;
  const obs     = tipoActa === 'salida' ? document.getElementById('sal-obs').value    : document.getElementById('ret-obs').value;

  const pNombres = (ev.personal || [])
    .map(id => { const p = DB.getPersona(id); return p ? `${p.nombre} — ${p.cargo}` : ''; })
    .filter(Boolean)
    .join('<br>');

  const eqFilas = (ev.equiposCant || [])
    .map(x => {
      const eq = DB.getEquipo(x.id);
      return eq ? `<tr><td>${eq.nombre}</td><td>${eq.serial}</td><td>${eq.cat}</td><td style="text-align:center;font-weight:700">${x.cant}</td><td style="width:120px"></td></tr>` : '';
    })
    .filter(Boolean)
    .join('');

  const titulo     = tipoActa === 'salida' ? 'ACTA DE SALIDA DE EQUIPOS' : 'ACTA DE RETORNO DE EQUIPOS';
  const accentColor = tipoActa === 'salida' ? '#111' : '#B45309';
  const condicion  = tipoActa === 'salida'
    ? 'El receptor declara haber recibido los equipos listados en buen estado y se compromete a devolverlos en las mismas condiciones.'
    : 'El receptor declara haber recibido los equipos de vuelta y confirma que se encuentran en el estado acordado.';

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${titulo}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:36px 40px}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:2.5px solid #111;margin-bottom:22px}
  .logo{font-size:22px;font-weight:900;letter-spacing:-2px;color:#D4A017}.logo small{display:block;font-size:10px;font-weight:600;color:#555;margin-top:2px;letter-spacing:.1em;text-transform:uppercase}
  .doc{text-align:right;font-size:11px;color:#444;line-height:1.8}
  h2{text-align:center;font-size:13.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:18px;color:${accentColor}}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;background:#F5F4F0;padding:13px 15px;border-radius:6px;margin-bottom:18px}
  .irow{display:flex;flex-direction:column}.ilabel{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#666;margin-bottom:2px}
  table{width:100%;border-collapse:collapse;margin-bottom:18px}th{background:#111;color:#fff;padding:7px 9px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;text-align:left}
  td{padding:7px 9px;border-bottom:1px solid #E0DDD5;font-size:12px}tr:nth-child(even)td{background:#F9F8F5}
  .obs{padding:11px 13px;border:1px solid #D0CCC0;border-radius:6px;font-size:12px;margin-bottom:18px}.obs strong{display:block;margin-bottom:3px;font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#555}
  .cond{padding:11px 13px;background:#F5F4F0;border-radius:6px;font-size:11px;margin-bottom:26px;line-height:1.7}.cond strong{display:block;margin-bottom:3px}
  .sigs{display:grid;grid-template-columns:1fr 1fr;gap:60px}.sig{border-top:1px solid #111;padding-top:9px}.sig-space{height:52px}
  .sig-name{font-weight:700;font-size:12.5px}.sig-role{font-size:10.5px;color:#555;margin-top:2px}
  .pbox{margin-bottom:18px;padding:9px 13px;border:1px solid #E0DDD5;border-radius:6px;font-size:12px}.pbox strong{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#666;margin-bottom:5px}
  .foot{margin-top:20px;text-align:center;font-size:9.5px;color:#aaa;border-top:1px solid #eee;padding-top:9px}
  @media print{body{padding:20px}}</style></head><body>
  <div class="hdr">
    <div class="logo">IVC<small>Producciones</small></div>
    <div class="doc">${titulo}<br>N° IVC-${String(evId).padStart(4,'0')}-${tipoActa === 'salida' ? 'S' : 'R'}<br>Fecha: ${Format.fecha(fecha)}</div>
  </div>
  <h2>${titulo}</h2>
  <div class="info">
    <div class="irow"><span class="ilabel">Evento</span><span>${ev.nombre}</span></div>
    <div class="irow"><span class="ilabel">Cliente</span><span>${ev.cliente}</span></div>
    <div class="irow"><span class="ilabel">Fecha inicio</span><span>${Format.fecha(ev.inicio)}</span></div>
    <div class="irow"><span class="ilabel">Fecha fin</span><span>${Format.fecha(ev.fin)}</span></div>
  </div>
  ${pNombres ? `<div class="pbox"><strong>Personal técnico</strong>${pNombres}</div>` : ''}
  <table><thead><tr><th>Equipo</th><th>Serial</th><th>Categoría</th><th style="text-align:center">Cant.</th><th>Observación</th></tr></thead><tbody>${eqFilas}</tbody></table>
  ${obs ? `<div class="obs"><strong>Observaciones</strong>${obs}</div>` : ''}
  <div class="cond"><strong>Condiciones</strong>${condicion}</div>
  <div class="sigs">
    <div class="sig"><div class="sig-space"></div><div class="sig-name">${tipoActa === 'salida' ? entrega : recibe}</div><div class="sig-role">${tipoActa === 'salida' ? 'Entrega — IVC Producciones' : 'Recibe — IVC Producciones'}</div></div>
    <div class="sig"><div class="sig-space"></div><div class="sig-name">${tipoActa === 'salida' ? recibe : entrega}</div><div class="sig-role">${tipoActa === 'salida' ? cargo : 'Entrega — Cliente'}</div></div>
  </div>
  <div class="foot">IVC Producciones · ${titulo} · Generado el ${new Date().toLocaleDateString('es-CO')} · Válido solo con ambas firmas</div>
  </body></html>`;

  const win = window.open('', '_blank', 'width=900,height=1150');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);

  if (tipoActa === 'salida') Modal.close('modal-salida');
}

// ─── COTIZACIONES ─────────────────────────────────────────────────────────────

function calcCotizacion() {
  const dias    = parseInt(document.getElementById('cot-dias').value) || 1;
  const descPct = parseFloat(document.getElementById('cot-desc').value) || 0;
  const eqCant  = Chips.getEquiposCant('cotEquipos');
  const result  = Calc.totalCotizacion(eqCant, dias, descPct);
  const resumen = document.getElementById('cot-resumen');

  if (!result.items.length) {
    resumen.style.display = 'none';
    return;
  }

  resumen.style.display = 'block';
  resumen._total = result.total;

  resumen.innerHTML = `
    <div style="margin-bottom:10px">
      ${result.items.map(x => `
        <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);font-size:11.5px">
          <span>${x.nombre} ×${x.cant} × ${dias}d</span>
          <span style="color:var(--accent-t)">${Format.moneda(x.subtotal)}</span>
        </div>`).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--text2)">
      <span>Subtotal</span><span>${Format.moneda(result.subtotal)}</span>
    </div>
    ${descPct > 0 ? `
      <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--err-t)">
        <span>Descuento ${descPct}%</span><span>-${Format.moneda(result.descuento)}</span>
      </div>` : ''}
    <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;margin-top:8px;color:var(--accent-t);border-top:1px solid var(--border);padding-top:8px">
      <span>TOTAL</span><span>${Format.moneda(result.total)}</span>
    </div>
  `;
}

function renderCotizaciones() {
  const cots = DB.getCotizaciones();
  const grid = document.getElementById('cot-grid');

  if (!cots.length) {
    grid.innerHTML = '<div style="grid-column:1/-1"><div class="empty">No hay cotizaciones. Crea la primera con el botón de arriba.</div></div>';
    return;
  }

  grid.innerHTML = cots.map(c => {
    const estadoCls = `cot-estado-${c.estado.toLowerCase()}`;
    const eqResumen = (c.equiposCant || [])
      .map(x => { const eq = DB.getEquipo(x.id); return eq ? `${eq.nombre} ×${x.cant}` : ''; })
      .filter(Boolean)
      .join(', ');

    return `<div class="cot-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div>
          <div style="font-weight:700;font-size:13.5px">${c.nombre}</div>
          <div style="font-size:11.5px;color:var(--text2);margin-top:2px">${c.cliente}</div>
        </div>
        <span class="badge ${estadoCls}" style="border:1px solid">${c.estado}</span>
      </div>
      <div style="font-size:11.5px;color:var(--text3);margin-bottom:8px">📅 ${c.fecha} · ${c.dias} día${c.dias > 1 ? 's' : ''}</div>
      <div style="font-size:11.5px;color:var(--text3);margin-bottom:10px">${eqResumen || '—'}</div>
      <div style="font-size:17px;font-weight:700;color:var(--accent-t);margin-bottom:12px">${Format.moneda(c.total)}</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center">
        ${can('canEdit') ? `<button class="btn btn-sm" onclick="abrirEditorCotizacion(${c.id})">Editar</button>` : ''}
        ${can('canEdit') ? `<button class="btn btn-warn btn-sm" onclick="imprimirCot(${c.id})">Imprimir</button>` : ''}
        ${c.estado === 'Aprobada' ? `<button class="btn btn-ok btn-sm" onclick="crearEventoDesdeCot(${c.id})">→ Crear evento</button>` : ''}
        <select style="font-size:11px;padding:3px 7px;border:1px solid var(--border2);border-radius:6px;background:var(--surface2);color:var(--text);font-family:inherit"
          onchange="cambiarEstadoCot(${c.id}, this.value)">
          <option ${c.estado === 'Pendiente'  ? 'selected' : ''}>Pendiente</option>
          <option ${c.estado === 'Aprobada'   ? 'selected' : ''}>Aprobada</option>
          <option ${c.estado === 'Rechazada'  ? 'selected' : ''}>Rechazada</option>
        </select>
      </div>
    </div>`;
  }).join('');
}

function abrirEditorCotizacion(id) {
  const isNuevo = !id;
  const c = id ? DB.getCotizacion(id) : {};

  document.getElementById('modal-cot-title').textContent = isNuevo ? 'Nueva cotización' : 'Editar cotización';
  document.getElementById('cot-id').value      = id || '';
  document.getElementById('cot-nombre').value  = c.nombre  || '';
  document.getElementById('cot-cliente').value = c.cliente || '';
  document.getElementById('cot-fecha').value   = c.fecha   || '';
  document.getElementById('cot-dias').value    = c.dias    || 1;
  document.getElementById('cot-desc').value    = c.descuento || 0;
  document.getElementById('cot-estado').value  = c.estado  || 'Pendiente';
  document.getElementById('cot-obs').value     = c.obs     || '';

  Chips.cargarCot(c.equiposCant || []);
  calcCotizacion();
  Modal.open('modal-cot');
}

function guardarCotizacion() {
  const nombre  = document.getElementById('cot-nombre').value.trim();
  const cliente = document.getElementById('cot-cliente').value.trim();
  if (!nombre) { Toast.error('El nombre de la cotización es obligatorio'); return; }

  const dias       = parseInt(document.getElementById('cot-dias').value) || 1;
  const descuento  = parseFloat(document.getElementById('cot-desc').value) || 0;
  const eqCant     = Chips.getEquiposCant('cotEquipos');
  const resultado  = Calc.totalCotizacion(eqCant, dias, descuento);
  const resumen    = document.getElementById('cot-resumen');

  const datos = {
    nombre,
    cliente,
    fecha:       document.getElementById('cot-fecha').value,
    dias,
    equiposCant: eqCant,
    descuento,
    estado:      document.getElementById('cot-estado').value,
    obs:         document.getElementById('cot-obs').value.trim(),
    total:       resumen._total || resultado.total,
  };

  const id = document.getElementById('cot-id').value;
  if (id) {
    DB.actualizarCotizacion(parseInt(id), datos);
    Toast.ok('Cotización actualizada');
  } else {
    DB.crearCotizacion(datos);
    Toast.ok('Cotización creada');
  }

  Modal.close('modal-cot');
  renderCotizaciones();
  renderDash();
}

function cambiarEstadoCot(id, estado) {
  DB.actualizarCotizacion(id, { estado });
  Toast.ok(`Cotización marcada como ${estado}`);
  renderCotizaciones();
  renderDash();
}

function crearEventoDesdeCot(cotId) {
  const cot = DB.getCotizacion(cotId);
  if (!cot) return;

  DB.crearEvento({
    nombre:      cot.nombre,
    cliente:     cot.cliente,
    inicio:      cot.fecha,
    fin:         cot.fecha,
    estado:      'Planificado',
    equiposCant: cot.equiposCant || [],
    personal:    [],
    notas:       `Creado desde cotización #${cotId}`,
  });

  Toast.ok(`Evento "${cot.nombre}" creado desde la cotización`);
  goTo('eventos');
}

function imprimirCot(cotId) {
  const c = DB.getCotizacion(cotId);
  if (!c) return;
  const result = Calc.totalCotizacion(c.equiposCant || [], c.dias, c.descuento || 0);
  _generarPDFCotizacion({ ...c, items: result.items, subtotal: result.subtotal, descuentoVal: result.descuento });
}

function imprimirCotizacionModal() {
  const cotId = document.getElementById('cot-id').value;
  if (cotId) { imprimirCot(parseInt(cotId)); return; }

  const dias    = parseInt(document.getElementById('cot-dias').value) || 1;
  const descPct = parseFloat(document.getElementById('cot-desc').value) || 0;
  const eqCant  = Chips.getEquiposCant('cotEquipos');
  const result  = Calc.totalCotizacion(eqCant, dias, descPct);

  _generarPDFCotizacion({
    nombre:      document.getElementById('cot-nombre').value,
    cliente:     document.getElementById('cot-cliente').value,
    fecha:       document.getElementById('cot-fecha').value,
    dias,
    items:       result.items,
    subtotal:    result.subtotal,
    descuento:   descPct,
    descuentoVal:result.descuento,
    total:       result.total,
    obs:         document.getElementById('cot-obs').value,
  });
}

function _generarPDFCotizacion(c) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cotización IVC</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:36px 40px}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:2.5px solid #D4A017;margin-bottom:22px}
  .logo{font-size:24px;font-weight:900;letter-spacing:-2px;color:#D4A017}.logo small{display:block;font-size:10px;font-weight:600;color:#555;margin-top:2px;letter-spacing:.1em;text-transform:uppercase}
  .doc{text-align:right;font-size:11px;color:#444;line-height:1.9}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:5px 24px;background:#FFF8E6;padding:13px 15px;border-radius:6px;margin-bottom:18px;border:1px solid #F5C842}
  .irow{display:flex;flex-direction:column}.ilabel{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#B45309;margin-bottom:2px}
  table{width:100%;border-collapse:collapse;margin-bottom:14px}th{background:#D4A017;color:#fff;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;text-align:left}
  td{padding:8px 10px;border-bottom:1px solid #E0DDD5;font-size:12px}tr:nth-child(even)td{background:#FFF8E6}
  .tots{text-align:right;margin-bottom:20px}.trow{display:flex;justify-content:flex-end;gap:40px;padding:4px 0;font-size:12px;color:#555}
  .ttotal{display:flex;justify-content:flex-end;gap:40px;padding:10px 0 4px;font-size:15px;font-weight:700;border-top:2px solid #D4A017;color:#D4A017}
  .cond{padding:11px 13px;background:#F5F4F0;border-radius:6px;font-size:11px;margin-bottom:24px;line-height:1.7}.cond strong{display:block;margin-bottom:3px}
  .sigs{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:20px}.sig{border-top:1px solid #111;padding-top:9px}.sig-space{height:52px}
  .sig-name{font-weight:700;font-size:12.5px}.sig-role{font-size:10.5px;color:#555;margin-top:2px}
  .foot{margin-top:20px;text-align:center;font-size:9.5px;color:#aaa;border-top:1px solid #eee;padding-top:9px}
  @media print{body{padding:20px}}</style></head><body>
  <div class="hdr">
    <div class="logo">IVC<small>Producciones</small></div>
    <div class="doc">COTIZACIÓN DE SERVICIOS<br>N° COT-${String(Date.now()).slice(-4)}<br>Fecha: ${Format.fecha(c.fecha)}<br>Válida por 15 días</div>
  </div>
  <div class="info">
    <div class="irow"><span class="ilabel">Cliente</span><span style="font-weight:700">${c.cliente}</span></div>
    <div class="irow"><span class="ilabel">Evento</span><span>${c.nombre}</span></div>
    <div class="irow"><span class="ilabel">Fecha del evento</span><span>${Format.fecha(c.fecha)}</span></div>
    <div class="irow"><span class="ilabel">Días de alquiler</span><span>${c.dias} día${c.dias > 1 ? 's' : ''}</span></div>
  </div>
  <table>
    <thead><tr><th>Equipo</th><th style="text-align:center">Cant.</th><th style="text-align:right">Tarifa/día</th><th style="text-align:right">Subtotal</th></tr></thead>
    <tbody>${c.items.map(x => `<tr><td>${x.nombre}</td><td style="text-align:center">${x.cant}</td><td style="text-align:right">${Format.moneda(x.tarifa)}</td><td style="text-align:right;font-weight:600">${Format.moneda(x.subtotal)}</td></tr>`).join('')}</tbody>
  </table>
  <div class="tots">
    <div class="trow"><span>Subtotal</span><span>${Format.moneda(c.subtotal)}</span></div>
    ${c.descuento > 0 ? `<div class="trow" style="color:#B91C1C"><span>Descuento (${c.descuento}%)</span><span>-${Format.moneda(c.descuentoVal)}</span></div>` : ''}
    <div class="ttotal"><span>TOTAL</span><span>${Format.moneda(c.total)}</span></div>
  </div>
  ${c.obs ? `<div class="cond"><strong>Observaciones</strong>${c.obs}</div>` : ''}
  <div class="cond"><strong>Condiciones de servicio</strong>El alquiler incluye transporte, montaje y desmontaje. Los equipos deben ser devueltos en las mismas condiciones. Pago: 50% al confirmar, 50% al iniciar el evento.</div>
  <div class="sigs">
    <div class="sig"><div class="sig-space"></div><div class="sig-name">IVC Producciones</div><div class="sig-role">Firma y sello — Empresa</div></div>
    <div class="sig"><div class="sig-space"></div><div class="sig-name">${c.cliente}</div><div class="sig-role">Firma — Cliente · Acepta las condiciones</div></div>
  </div>
  <div class="foot">IVC Producciones — Cartagena, Colombia · Cotización válida por 15 días calendario</div>
  </body></html>`;

  const win = window.open('', '_blank', 'width=900,height=1150');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

// ─── CALENDARIO ───────────────────────────────────────────────────────────────

let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();

function calPrev() { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendario(); }
function calNext() { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendario(); }

function renderCalendario() {
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('cal-title').textContent = `${MESES[calMonth]} ${calYear}`;

  const primerDia = new Date(calYear, calMonth, 1).getDay();
  const diasMes   = new Date(calYear, calMonth + 1, 0).getDate();
  const diasAnt   = new Date(calYear, calMonth, 0).getDate();
  const hoyStr    = new Date().toISOString().split('T')[0];

  const conflictos    = Calc.conflictosEquipos();
  const eventosConf   = new Set(conflictos.map(c => c.evento));

  let html = '';

  // Celdas del mes anterior
  for (let i = 0; i < primerDia; i++) {
    html += `<div class="cal-cell other-month"><div class="cal-day">${diasAnt - primerDia + 1 + i}</div></div>`;
  }

  // Días del mes
  for (let d = 1; d <= diasMes; d++) {
    const dateStr  = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const esHoy    = dateStr === hoyStr;
    const eventos  = DB.getEventos().filter(e => e.inicio <= dateStr && e.fin >= dateStr);
    const hayConf  = eventos.some(e => eventosConf.has(e.nombre));

    html += `<div class="cal-cell ${esHoy ? 'today' : ''}">`;
    html += `<div class="cal-day">${d}</div>`;
    if (hayConf) html += `<div class="cal-conflict" title="Conflicto de equipos"></div>`;

    eventos.slice(0, 3).forEach(e => {
      const cls = e.estado === 'En curso' ? 'cal-ev-en-curso' : e.estado === 'Finalizado' ? 'cal-ev-finalizado' : 'cal-ev-planificado';
      html += `<div class="cal-ev-pill ${cls}" onclick="abrirDetalleEvento(${e.id})" title="${e.nombre}">${e.nombre}</div>`;
    });
    if (eventos.length > 3) html += `<div style="font-size:9.5px;color:var(--text3);padding:1px 4px">+${eventos.length - 3} más</div>`;
    html += `</div>`;
  }

  // Celdas del mes siguiente
  const total  = primerDia + diasMes;
  const celdas = Math.ceil(total / 7) * 7;
  for (let i = 1; i <= celdas - total; i++) {
    html += `<div class="cal-cell other-month"><div class="cal-day">${i}</div></div>`;
  }

  document.getElementById('cal-body').innerHTML = html;
}

// ─── ALERTAS ──────────────────────────────────────────────────────────────────

function renderAlertas() {
  document.getElementById('mant-eq').innerHTML = DB.getEquipos()
    .map(e => `<option value="${e.id}">${e.nombre}</option>`)
    .join('');

  const alertas = Calc.alertasMantenimiento();
  const todos   = DB.getEquipos()
    .filter(e => e.mantFecha || e.estado === 'Mantenimiento')
    .sort((a, b) => {
      if (a.estado === 'Mantenimiento' && b.estado !== 'Mantenimiento') return -1;
      if (b.estado === 'Mantenimiento' && a.estado !== 'Mantenimiento') return 1;
      return (a.mantFecha || '').localeCompare(b.mantFecha || '');
    });

  let html = '';

  if (alertas.length) {
    html += alertas.map(e => {
      const dias   = Calc.diasHastaMant(e.mantFecha);
      const isMant = e.estado === 'Mantenimiento';
      const btnLabel = isMant ? '✔ Disponible' : '⚙ Enviar a mant.';
      const btnAction = isMant
        ? `cambiarEstadoEquipo(${e.id}, 'Disponible')`
        : `cambiarEstadoEquipo(${e.id}, 'Mantenimiento')`;
      const alertClass = isMant ? 'a-err' : 'a-warn';
      const msg = isMant
        ? `<b>${e.nombre}</b> — En mantenimiento`
        : `<b>${e.nombre}</b> — Mantenimiento en ${dias} día${dias === 1 ? '' : 's'}`;
      return `<div class="alert ${alertClass}" style="display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div>${msg}<br><span style="font-size:11px">${e.mantNotas || e.notas || ''}</span></div>
        <button class="btn btn-sm" style="${isMant ? 'background:var(--ok-l);color:var(--ok-t)' : 'background:var(--warn-l);color:var(--warn-t)'}" onclick="${btnAction}">${btnLabel}</button>
      </div>`;
    }).join('');
  } else {
    html += '<div class="alert a-ok">Sin alertas urgentes esta semana</div>';
  }

  // Retornos pendientes
  DB.getEventos()
    .filter(e => e.estado === 'Finalizado' && !e.retornado)
    .forEach(ev => {
      html += `<div class="alert a-err">
        <b>Equipos pendientes de retorno:</b> ${ev.nombre} (${ev.fin})
        <br><button class="btn btn-ok btn-sm" style="margin-top:5px" onclick="abrirRetorno(${ev.id})">↩ Registrar retorno</button>
      </div>`;
    });

  // Conflictos
  Calc.conflictosEquipos().forEach(c => {
    html += `<div class="alert a-err"><b>Conflicto:</b> ${c.equipo} sobreasignado en <b>${c.evento}</b> por ${c.faltantes} unidad${c.faltantes > 1 ? 'es' : ''}</div>`;
  });

  // Tabla completa
  if (todos.length) {
    html += `<div style="margin-top:14px"><table>
      <thead><tr><th>Equipo</th><th>Estado</th><th>Fecha mant.</th><th>Días</th><th>Notas</th><th>Acción</th></tr></thead>
      <tbody>${todos.map(e => {
        const dias = Calc.diasHastaMant(e.mantFecha);
        const bc   = e.estado === 'Mantenimiento' ? 'b-warn' : dias !== null && dias <= 0 ? 'b-err' : dias !== null && dias <= 7 ? 'b-warn' : 'b-ok';
        const diasLabel = e.estado === 'Mantenimiento' ? '—' : dias === null ? '—' : dias <= 0 ? 'Vencido' : `${dias} días`;
        const estBadge  = `<span class="badge ${e.estado === 'Mantenimiento' ? 'b-warn' : 'b-ok'}">${e.estado}</span>`;
        const accion = e.estado === 'Mantenimiento'
          ? `<button class="btn btn-ok btn-sm" onclick="cambiarEstadoEquipo(${e.id}, 'Disponible')">✔ Disponible</button>`
          : `<button class="btn btn-sm" style="background:var(--warn-l);color:var(--warn-t);border-color:transparent" onclick="cambiarEstadoEquipo(${e.id}, 'Mantenimiento')">⚙ Mantenimiento</button>`;
        return `<tr>
          <td><b>${e.nombre}</b></td>
          <td>${estBadge}</td>
          <td style="font-size:11px">${e.mantFecha || '—'}</td>
          <td><span class="badge ${bc}">${diasLabel}</span></td>
          <td style="font-size:11px;color:var(--text2)">${e.mantNotas || '—'}</td>
          <td>${accion}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  } else {
    html += '<div class="empty" style="margin-top:10px">No hay mantenimientos programados</div>';
  }

  document.getElementById('alertas-list').innerHTML = html;
}

function guardarMantenimiento() {
  const eqId  = parseInt(document.getElementById('mant-eq').value);
  const fecha = document.getElementById('mant-fecha').value;
  if (!fecha) { Toast.warn('Selecciona una fecha'); return; }

  const equipo = DB.getEquipo(eqId);
  if (!equipo) return;

  DB.actualizarEquipo(eqId, {
    mantFecha: fecha,
    mantNotas: document.getElementById('mant-notas').value,
  });

  document.getElementById('mant-fecha').value = '';
  document.getElementById('mant-notas').value = '';

  Toast.ok(`Mantenimiento programado para ${equipo.nombre}`);
  renderAlertas();
  updateAlertBadge();
}

// ─── TRAZABILIDAD ─────────────────────────────────────────────────────────────

function renderTraz() {
  const query = document.getElementById('traz-q').value.toLowerCase();
  const tipo  = document.getElementById('traz-tipo').value;

  const lista = DB.getTrazabilidad().filter(t => {
    if (query && !t.eqNombre.toLowerCase().includes(query) && !t.eventoNombre.toLowerCase().includes(query) && !t.usuario.toLowerCase().includes(query)) return false;
    if (tipo && t.tipo !== tipo) return false;
    return true;
  });

  document.getElementById('tbody-traz').innerHTML = lista.length
    ? lista.map(t => `<tr>
        <td style="font-size:11px;color:var(--text3);white-space:nowrap">${t.fecha.replace('T', ' ')}</td>
        <td><div style="font-weight:600">${t.eqNombre}</div></td>
        <td style="text-align:center;font-weight:700">${t.cant}</td>
        <td>${Badge.trazabilidad(t.tipo)}</td>
        <td style="font-size:11.5px;color:var(--text2)">${t.eventoNombre}${t.notas ? `<br><span style="color:var(--text3)">${t.notas}</span>` : ''}</td>
        <td style="font-size:11px;color:var(--text3)">${t.usuario}</td>
      </tr>`).join('')
    : '<tr><td colspan="6"><div class="empty">No se encontraron movimientos</div></td></tr>';
}

// ─── REPORTES ─────────────────────────────────────────────────────────────────

function renderReportes() {
  const equipos      = DB.getEquipos();
  const eventos      = DB.getEventos();
  const cotizaciones = DB.getCotizaciones();

  const ingresosCot = cotizaciones
    .filter(c => c.estado === 'Aprobada')
    .reduce((s, c) => s + c.total, 0);

  // KPIs
  document.getElementById('rep-kpis').innerHTML = `
    <div class="rep-card"><div class="rep-lbl">Total eventos</div><div class="rep-v">${eventos.length}</div><div class="rep-sub">Todos los estados</div></div>
    <div class="rep-card"><div class="rep-lbl">Eventos activos</div><div class="rep-v">${eventos.filter(e => e.estado === 'En curso').length}</div><div class="rep-sub">En producción ahora</div></div>
    <div class="rep-card"><div class="rep-lbl">Equipos en flota</div><div class="rep-v">${equipos.length}</div><div class="rep-sub">${equipos.reduce((s, e) => s + e.cant, 0)} unidades totales</div></div>
    <div class="rep-card"><div class="rep-lbl">Ingresos cotizados</div><div class="rep-v" style="font-size:20px">${Format.moneda(ingresosCot)}</div><div class="rep-sub">Cotizaciones aprobadas</div></div>
  `;

  // Equipos más usados
  const eqUso = new Map();
  eventos.forEach(ev => {
    (ev.equiposCant || []).forEach(x => eqUso.set(x.id, (eqUso.get(x.id) || 0) + 1));
  });
  const topEq  = [...eqUso.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxEq  = topEq[0]?.[1] || 1;

  document.getElementById('rep-top-eq').innerHTML = topEq.length
    ? topEq.map(([id, usos]) => {
        const eq = DB.getEquipo(id);
        return eq ? `<div class="rep-bar-row">
          <span class="rep-bar-name">${eq.nombre}</span>
          <div class="rep-bar-wrap"><div class="rep-bar-fill" style="width:${Math.round(usos / maxEq * 100)}%"></div></div>
          <span class="rep-bar-val">${usos}</span>
        </div>` : '';
      }).join('')
    : '<div class="empty">Sin datos suficientes</div>';

  // Clientes más activos
  const cliUso = new Map();
  eventos.forEach(ev => cliUso.set(ev.cliente, (cliUso.get(ev.cliente) || 0) + 1));
  const topCli = [...cliUso.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxCli = topCli[0]?.[1] || 1;

  document.getElementById('rep-top-cli').innerHTML = topCli.length
    ? topCli.map(([cli, n]) => `<div class="rep-bar-row">
        <span class="rep-bar-name">${cli}</span>
        <div class="rep-bar-wrap"><div class="rep-bar-fill" style="width:${Math.round(n / maxCli * 100)}%"></div></div>
        <span class="rep-bar-val">${n}</span>
      </div>`).join('')
    : '<div class="empty">Sin datos</div>';

  // Ingresos por cotización
  const cotApro = cotizaciones.filter(c => c.estado === 'Aprobada');
  document.getElementById('rep-ingresos').innerHTML = cotApro.length
    ? `<table>
        <thead><tr><th>Cotización</th><th>Cliente</th><th>Fecha</th><th>Días</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>${cotApro.map(c => `<tr>
          <td>${c.nombre}</td><td>${c.cliente}</td><td>${c.fecha}</td><td>${c.dias}</td>
          <td style="text-align:right;color:var(--ok-t);font-weight:600">${Format.moneda(c.total)}</td>
        </tr>`).join('')}</tbody>
      </table>`
    : '<div class="empty">No hay cotizaciones aprobadas aún</div>';
}

// ─── CLIENTES ─────────────────────────────────────────────────────────────────

function renderClientes() {
  const query = document.getElementById('cli-q').value.toLowerCase();
  const lista = DB.getClientes().filter(c =>
    !query || `${c.nombre} ${c.empresa}`.toLowerCase().includes(query)
  );

  document.getElementById('clientes-grid').innerHTML = lista.length
    ? lista.map((c, i) => {
        const ac    = avatarColor(i);
        const nevs  = DB.getEventos().filter(e => e.cliente === c.nombre).length;
        const edBtn = can('canEdit')   ? `<button class="btn btn-sm" onclick="event.stopPropagation(); abrirEditorCliente(${c.id})">Editar</button>` : '';
        const delBtn= can('canDelete') ? `<button class="btn-del"    onclick="event.stopPropagation(); confirmarEliminarCliente(${c.id})">Borrar</button>` : '';
        return `<div class="crm-card">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            <div class="crm-av" style="background:${ac.bg};color:${ac.c}">${Format.iniciales(c.nombre)}</div>
            <div>
              <div class="crm-name">${c.nombre}</div>
              <div class="crm-emp">${c.empresa || c.tipo}</div>
            </div>
          </div>
          <div class="crm-meta">📞 ${c.tel}</div>
          <div class="crm-meta">✉ ${c.email}</div>
          <div class="crm-meta">📍 ${c.ciudad}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px">
            <span class="badge b-gray">${nevs} evento${nevs !== 1 ? 's' : ''}</span>
            <div style="display:flex;gap:5px">${edBtn}${delBtn}</div>
          </div>
        </div>`;
      }).join('')
    : '<div style="grid-column:1/-1"><div class="empty">No se encontraron clientes</div></div>';
}

function abrirEditorCliente(id) {
  const isNuevo = !id;
  const c = id ? DB.getCliente(id) : {};
  document.getElementById('modal-cliente-title').textContent = isNuevo ? 'Agregar cliente' : 'Editar cliente';
  document.getElementById('cli-id').value      = id || '';
  ['nombre','empresa','tel','email','ciudad','tipo','notas'].forEach(k => {
    const el = document.getElementById('cli-' + k);
    if (el) el.value = c[k] || '';
  });
  Modal.open('modal-cliente');
}

function guardarCliente() {
  const nombre = document.getElementById('cli-nombre').value.trim();
  if (!nombre) { Toast.error('El nombre es obligatorio'); return; }

  const datos = {
    nombre,
    empresa: document.getElementById('cli-empresa').value.trim(),
    tel:     document.getElementById('cli-tel').value.trim(),
    email:   document.getElementById('cli-email').value.trim(),
    ciudad:  document.getElementById('cli-ciudad').value.trim(),
    tipo:    document.getElementById('cli-tipo').value,
    notas:   document.getElementById('cli-notas').value.trim(),
  };

  const id = document.getElementById('cli-id').value;
  if (id) {
    DB.actualizarCliente(parseInt(id), datos);
    Toast.ok('Cliente actualizado');
  } else {
    DB.crearCliente(datos);
    Toast.ok('Cliente agregado');
  }

  Modal.close('modal-cliente');
  renderClientes();
}

async function confirmarEliminarCliente(id) {
  if (!can('canDelete')) return;
  const c  = DB.getCliente(id);
  const ok = await mostrarConfirm(
    `¿Eliminar al cliente <b>${c.nombre}</b>?`,
    { titulo: 'Eliminar cliente', btnOk: 'Eliminar', tipo: 'danger' }
  );
  if (!ok) return;
  DB.eliminarCliente(id);
  Toast.ok('Cliente eliminado');
  renderClientes();
}

// ─── HISTORIAL ────────────────────────────────────────────────────────────────

function renderHistSelect() {
  document.getElementById('hist-eq').innerHTML =
    '<option value="">Selecciona un equipo...</option>' +
    DB.getEquipos().map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
}

function renderHist() {
  const id = parseInt(document.getElementById('hist-eq').value);
  const contenedor = document.getElementById('hist-content');

  if (!id) {
    contenedor.innerHTML = '<div class="empty">Selecciona un equipo para ver su historial</div>';
    return;
  }

  const equipo    = DB.getEquipo(id);
  const eventos   = DB.getEventos().filter(e => (e.equiposCant || []).some(x => x.id === id));
  const movimient = DB.getTrazabilidad().filter(t => t.eqId === id);

  let html = `<div style="background:var(--surface2);border-radius:8px;padding:12px 14px;margin-bottom:14px">
    <div style="font-weight:700">${equipo.nombre}</div>
    <div style="font-size:11px;color:var(--text2);margin-top:2px">${equipo.cat} · ${equipo.serial} · ${equipo.cant} unidades · ${Format.moneda(equipo.tarifa || 0)}/día</div>
  </div>`;

  if (eventos.length) {
    html += `<div class="detail-sec-title" style="margin-bottom:8px">Eventos (${eventos.length})</div>`;
    html += eventos
      .sort((a, b) => b.inicio.localeCompare(a.inicio))
      .map(e => {
        const item = (e.equiposCant || []).find(x => x.id === id);
        return `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <span style="font-weight:600;font-size:12.5px">${e.nombre} — ×${item?.cant || 1}</span>
            ${Badge.evento(e.estado)}
          </div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">${e.cliente} · ${e.inicio}${e.fin !== e.inicio ? ' → ' + e.fin : ''}</div>
        </div>`;
      }).join('');
  }

  if (movimient.length) {
    html += `<div class="detail-sec-title" style="margin-top:14px;margin-bottom:8px">Movimientos (${movimient.length})</div>`;
    html += movimient.map(t => `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:11.5px">
        <span style="color:var(--text3);min-width:110px">${t.fecha.replace('T', ' ')}</span>
        ${Badge.trazabilidad(t.tipo)}
        <span style="color:var(--text3)">${t.eventoNombre}</span>
      </div>`).join('');
  }

  contenedor.innerHTML = html;
}

// ─── PERSONAL ─────────────────────────────────────────────────────────────────

function renderPersonal() {
  document.getElementById('personal-grid').innerHTML = DB.getPersonal().map((p, i) => {
    const ac    = avatarColor(i);
    const edBtn = can('canEdit')   ? `<button class="btn btn-sm" onclick="abrirEditorPersona(${p.id})">Editar</button>` : '';
    const delBtn= can('canDelete') ? `<button class="btn-del" onclick="confirmarEliminarPersona(${p.id})">Borrar</button>` : '';
    return `<div class="pc">
      <div class="pc-av" style="background:${ac.bg};color:${ac.c}">${Format.iniciales(p.nombre)}</div>
      <div class="pc-name">${p.nombre}</div>
      <div class="pc-cargo">${p.cargo}</div>
      <div class="pc-meta">📞 ${p.tel}</div>
      <div class="pc-meta">✉ ${p.email}</div>
      <div style="margin-top:8px;margin-bottom:10px">
        <span class="badge b-info">${p.esp}</span>
        <span class="badge ${p.estado === 'Activo' ? 'b-ok' : 'b-gray'}">${p.estado}</span>
      </div>
      <div style="display:flex;gap:5px">${edBtn}${delBtn}</div>
    </div>`;
  }).join('');

  document.getElementById('btn-add-p').style.display = can('canEdit') ? 'inline-flex' : 'none';
}

function abrirEditorPersona(id) {
  if (!can('canEdit')) return;
  const isNuevo = !id;
  const p = id ? DB.getPersona(id) : {};
  document.getElementById('modal-persona-title').textContent = isNuevo ? 'Agregar persona' : 'Editar persona';
  document.getElementById('p-id').value = id || '';
  ['nombre','cargo','tel','email','esp','estado'].forEach(k => {
    const el = document.getElementById('p-' + k);
    if (el) el.value = p[k] || '';
  });
  Modal.open('modal-persona');
}

function guardarPersona() {
  if (!can('canEdit')) return;
  const nombre = document.getElementById('p-nombre').value.trim();
  if (!nombre) { Toast.error('El nombre es obligatorio'); return; }

  const datos = {
    nombre,
    cargo:  document.getElementById('p-cargo').value.trim(),
    tel:    document.getElementById('p-tel').value.trim(),
    email:  document.getElementById('p-email').value.trim(),
    esp:    document.getElementById('p-esp').value,
    estado: document.getElementById('p-estado').value,
  };

  const id = document.getElementById('p-id').value;
  if (id) {
    DB.actualizarPersona(parseInt(id), datos);
    Toast.ok('Persona actualizada');
  } else {
    DB.crearPersona(datos);
    Toast.ok('Persona agregada al equipo');
  }

  Modal.close('modal-persona');
  renderPersonal();
}

async function confirmarEliminarPersona(id) {
  if (!can('canDelete')) return;
  const p  = DB.getPersona(id);
  const ok = await mostrarConfirm(
    `¿Eliminar a <b>${p.nombre}</b> del equipo de trabajo?`,
    { titulo: 'Eliminar persona', btnOk: 'Eliminar', tipo: 'danger' }
  );
  if (!ok) return;
  DB.eliminarPersona(id);
  Toast.ok('Persona eliminada');
  renderPersonal();
}

// ─── USUARIOS ─────────────────────────────────────────────────────────────────

function renderUsers() {
  if (!can('canUsers')) {
    document.getElementById('restrict-users').style.display = 'block';
    document.getElementById('users-grid').innerHTML = '';
    return;
  }
  document.getElementById('restrict-users').style.display = 'none';

  document.getElementById('users-grid').innerHTML = DB.getUsers().map(u => `
    <div class="uc">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div class="uc-av">${u.ini}</div>
        <div>
          <div style="font-weight:700;font-size:13px">${u.name}</div>
          <div style="font-size:11px;color:var(--text3)">@${u.user}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border)">
        <span style="color:var(--text3)">Rol</span>
        ${Badge.rol(u.rol)}
      </div>
      <div style="display:flex;gap:6px;margin-top:10px">
        <button class="btn btn-sm" onclick="abrirEditorUser(${u.id})">Editar</button>
        ${u.user !== 'admin'
          ? `<button class="btn-del" onclick="confirmarEliminarUser(${u.id})">Borrar</button>`
          : '<span style="font-size:10px;color:var(--text3)">Protegido</span>'}
      </div>
    </div>`).join('');
}

function abrirEditorUser(id) {
  const isNuevo = !id;
  const u = id ? DB.getUsers().find(x => x.id === id) : {};
  document.getElementById('modal-user-title').textContent = isNuevo ? 'Agregar usuario' : 'Editar usuario';
  document.getElementById('u-id').value     = id || '';
  document.getElementById('u-nombre').value = u.name || '';
  document.getElementById('u-user').value   = u.user || '';
  document.getElementById('u-pass').value   = u.pass || '';
  document.getElementById('u-rol').value    = u.rol  || 'tecnico';
  document.getElementById('u-ini').value    = u.ini  || '';
  Modal.open('modal-user');
}

function guardarUser() {
  const userVal = document.getElementById('u-user').value.trim().toLowerCase();
  const passVal = document.getElementById('u-pass').value;
  if (!userVal || !passVal) { Toast.error('Usuario y contraseña son obligatorios'); return; }
  if (passVal.length < 4)   { Toast.error('La contraseña debe tener al menos 4 caracteres'); return; }

  const id = document.getElementById('u-id').value;
  if (DB.getUsers().find(u => u.user === userVal && u.id !== parseInt(id))) {
    Toast.error('Ese nombre de usuario ya existe');
    return;
  }

  const datos = {
    name: document.getElementById('u-nombre').value.trim() || userVal,
    user: userVal,
    pass: passVal,
    rol:  document.getElementById('u-rol').value,
    ini:  (document.getElementById('u-ini').value.trim().toUpperCase() || userVal.slice(0, 2).toUpperCase()),
  };

  if (id) {
    DB.actualizarUser(parseInt(id), datos);
    Toast.ok('Usuario actualizado');
  } else {
    DB.crearUser(datos);
    Toast.ok('Usuario creado');
  }

  Modal.close('modal-user');
  renderUsers();
}

async function confirmarEliminarUser(id) {
  const u  = DB.getUsers().find(x => x.id === id);
  if (u?.user === 'admin') { Toast.warn('No se puede eliminar el usuario admin'); return; }
  const ok = await mostrarConfirm(
    `¿Eliminar al usuario <b>@${u.user}</b>?`,
    { titulo: 'Eliminar usuario', btnOk: 'Eliminar', tipo: 'danger' }
  );
  if (!ok) return;
  DB.eliminarUser(id);
  Toast.ok('Usuario eliminado');
  renderUsers();
}

// ─── EXCEL ────────────────────────────────────────────────────────────────────

function exportarExcel() {
  try {
    const wb = XLSX.utils.book_new();
    const str = v => (v == null ? '' : String(v));

    // Inventario
    const h1  = ['Equipo', 'Serial', 'Categoría', 'Total', 'Disponibles', 'Estado', 'Tarifa/día', 'Prox. Mant.'];
    const r1  = DB.getEquipos().map(e => {
      const d   = Calc.disponibles(e);
      const est = e.estado === 'Mantenimiento' ? 'Mantenimiento' : d === 0 ? 'En evento' : d < e.cant ? 'Parcial' : 'Disponible';
      return [str(e.nombre), str(e.serial), str(e.cat), e.cant, d, est, e.tarifa || 0, str(e.mantFecha)];
    });
    const ws1 = XLSX.utils.aoa_to_sheet([h1, ...r1]);
    XLSX.utils.book_append_sheet(wb, 'Inventario', ws1);

    // Eventos
    const h2  = ['Evento', 'Cliente', 'Inicio', 'Fin', 'Estado', 'Equipos', 'Personal', 'Notas'];
    const r2  = DB.getEventos().map(e => [
      str(e.nombre), str(e.cliente), str(e.inicio), str(e.fin), str(e.estado),
      (Array.isArray(e.equiposCant) ? e.equiposCant : []).map(x => { const eq = DB.getEquipo(x.id); return eq ? `${eq.nombre} x${x.cant}` : ''; }).filter(Boolean).join(', '),
      (Array.isArray(e.personal) ? e.personal : []).map(id => DB.getPersona(id)?.nombre || '').filter(Boolean).join(', '),
      str(e.notas),
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([h2, ...r2]);
    XLSX.utils.book_append_sheet(wb, 'Eventos', ws2);

    // Cotizaciones
    const h3  = ['Cotización', 'Cliente', 'Fecha', 'Días', 'Estado', 'Total'];
    const r3  = DB.getCotizaciones().map(c => [str(c.nombre), str(c.cliente), str(c.fecha), c.dias, str(c.estado), c.total]);
    const ws3 = XLSX.utils.aoa_to_sheet([h3, ...r3]);
    XLSX.utils.book_append_sheet(wb, 'Cotizaciones', ws3);

    // Clientes
    const h4  = ['Nombre', 'Empresa', 'Teléfono', 'Email', 'Ciudad', 'Tipo'];
    const r4  = DB.getClientes().map(c => [str(c.nombre), str(c.empresa), str(c.tel), str(c.email), str(c.ciudad), str(c.tipo)]);
    const ws4 = XLSX.utils.aoa_to_sheet([h4, ...r4]);
    XLSX.utils.book_append_sheet(wb, 'Clientes', ws4);

    XLSX.writeFile(wb, 'IVC_Manager.xlsx');
    Toast.ok('Exportación completada');
  } catch (err) {
    Toast.error('Error al exportar: ' + err.message);
  }
}

// ─── INICIALIZACIÓN ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  Modal.initGlobalListeners();
});
