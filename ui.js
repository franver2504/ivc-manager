/**
 * IVC Manager Pro — Utilidades de UI (ui.js)
 *
 * Contiene:
 * - Badges y chips de estado
 * - Toast notifications (reemplaza alert())
 * - Modal de confirmación (reemplaza confirm())
 * - Chip selector para eventos y cotizaciones
 * - Funciones de renderizado de detalles
 */

// ─── BADGES ──────────────────────────────────────────────────────────────────

const Badge = {
  equipo(equipo) {
    if (equipo.estado === 'Mantenimiento') {
      return '<span class="badge b-warn">Mantenimiento</span>';
    }
    const disp = Calc.disponibles(equipo);
    if (disp === 0)           return '<span class="badge b-err">En evento</span>';
    if (disp < equipo.cant)   return '<span class="badge b-info">Parcial</span>';
    return '<span class="badge b-ok">Disponible</span>';
  },

  evento(estado) {
    const map = {
      'En curso':   '<span class="badge b-info">En curso</span>',
      'Finalizado': '<span class="badge b-ok">Finalizado</span>',
      'Planificado':'<span class="badge b-accent">Planificado</span>',
    };
    return map[estado] || `<span class="badge b-gray">${estado}</span>`;
  },

  mantenimiento(dias) {
    if (dias === null)  return '<span style="color:var(--text3)">—</span>';
    if (dias <= 0)      return '<span class="badge b-err">Vencido</span>';
    if (dias <= 7)      return `<span class="badge b-warn">${dias}d</span>`;
    return `<span style="font-size:11px;color:var(--text3)">${dias}d</span>`;
  },

  trazabilidad(tipo) {
    return `<span class="traz-badge traz-${tipo}">${
      { salida: 'Salida', retorno: 'Retorno', mantenimiento: 'Mant.', mant_ok: 'Disponible' }[tipo] || tipo
    }</span>`;
  },

  rol(rol) {
    const cls = { admin: 'role-admin', operador: 'role-operador', tecnico: 'role-tecnico' };
    return `<span class="${cls[rol] || ''}">${Format.rolLabel(rol)}</span>`;
  },
};

// ─── TOAST ───────────────────────────────────────────────────────────────────
// Reemplaza alert(). Muestra una notificación temporal en la esquina.

const Toast = {
  _container: null,

  _getContainer() {
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.id = 'toast-container';
      this._container.style.cssText = `
        position: fixed; bottom: 24px; right: 24px;
        z-index: 9999; display: flex; flex-direction: column; gap: 8px;
      `;
      document.body.appendChild(this._container);
    }
    return this._container;
  },

  show(mensaje, tipo = 'ok', duracion = 3000) {
    const colores = {
      ok:   { bg: 'var(--ok-l)',   border: 'var(--ok)',   texto: 'var(--ok-t)'   },
      err:  { bg: 'var(--err-l)',  border: 'var(--err)',  texto: 'var(--err-t)'  },
      warn: { bg: 'var(--warn-l)', border: 'var(--warn)', texto: 'var(--warn-t)' },
      info: { bg: 'var(--info-l)', border: 'var(--info)', texto: 'var(--info-t)' },
    };

    const c = colores[tipo] || colores.ok;
    const toast = document.createElement('div');

    toast.style.cssText = `
      background: ${c.bg}; border: 1px solid ${c.border}; color: ${c.texto};
      border-left: 3px solid ${c.border};
      padding: 10px 16px; border-radius: 8px; font-size: 13px;
      font-family: 'Inter', sans-serif; font-weight: 500;
      box-shadow: 0 4px 16px rgba(0,0,0,.4);
      max-width: 320px; animation: toastIn .2s ease;
      cursor: pointer;
    `;
    toast.innerHTML = mensaje;
    toast.addEventListener('click', () => toast.remove());

    this._getContainer().appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastOut .2s ease forwards';
      setTimeout(() => toast.remove(), 200);
    }, duracion);
  },

  ok(msg)   { this.show(msg, 'ok');   },
  error(msg){ this.show(msg, 'err');  },
  warn(msg) { this.show(msg, 'warn'); },
  info(msg) { this.show(msg, 'info'); },
};

// ─── CONFIRM MODAL ───────────────────────────────────────────────────────────
// Reemplaza confirm(). Retorna una Promise<boolean>.

function mostrarConfirm(mensaje, { titulo = '¿Confirmar acción?', btnOk = 'Confirmar', tipo = 'warn' } = {}) {
  return new Promise(resolve => {
    const colores = {
      warn:   'var(--warn-t)',
      danger: 'var(--err-t)',
      ok:     'var(--ok-t)',
    };

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(10,9,7,.7);
      z-index: 1000; display: flex; align-items: center; justify-content: center;
      padding: 20px; backdrop-filter: blur(3px);
      animation: fadeIn .15s ease;
    `;

    overlay.innerHTML = `
      <div style="
        background: var(--surface); border: 1px solid var(--border);
        border-radius: 14px; padding: 24px 26px; width: 100%; max-width: 400px;
        box-shadow: 0 8px 32px rgba(0,0,0,.6); animation: fadeUp .18s ease;
      ">
        <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:10px">${titulo}</div>
        <div style="font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:20px">${mensaje}</div>
        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button id="confirm-cancel" style="
            padding:7px 16px;border-radius:8px;border:1px solid var(--border2);
            background:var(--surface2);color:var(--text2);font-family:inherit;
            font-size:13px;font-weight:600;cursor:pointer;
          ">Cancelar</button>
          <button id="confirm-ok" style="
            padding:7px 16px;border-radius:8px;border:none;
            background:${colores[tipo]||colores.warn};color:var(--bg);
            font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;
          ">${btnOk}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#confirm-ok').addEventListener('click', () => {
      overlay.remove(); resolve(true);
    });
    overlay.querySelector('#confirm-cancel').addEventListener('click', () => {
      overlay.remove(); resolve(false);
    });
    overlay.addEventListener('click', e => {
      if (e.target === overlay) { overlay.remove(); resolve(false); }
    });
  });
}

// ─── MODALES ─────────────────────────────────────────────────────────────────

const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');

    // Inicializar chips según el modal
    if (id === 'modal-ev') {
      const evId = document.getElementById('ev-id')?.value;
      if (!evId) Chips.reset(['equipos', 'personal']);
      document.getElementById('conflict-alert').style.display = 'none';
    }
    if (id === 'modal-cot') {
      const cotId = document.getElementById('cot-id')?.value;
      if (!cotId) Chips.reset(['cotEquipos']);
    }
  },

  close(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');

    // Limpiar campos según el modal
    const camposPorModal = {
      'modal-ev':      ['ev-id', 'ev-nombre', 'ev-cliente', 'ev-inicio', 'ev-fin', 'ev-notas'],
      'modal-eq':      ['eq-id', 'eq-nombre', 'eq-serial', 'eq-notas'],
      'modal-cot':     ['cot-id', 'cot-nombre', 'cot-cliente', 'cot-obs'],
      'modal-persona': ['p-id', 'p-nombre', 'p-cargo', 'p-tel', 'p-email'],
      'modal-cliente': ['cli-id', 'cli-nombre', 'cli-empresa', 'cli-tel', 'cli-email', 'cli-ciudad', 'cli-notas'],
      'modal-user':    ['u-id', 'u-nombre', 'u-user', 'u-pass', 'u-ini'],
    };

    (camposPorModal[id] || []).forEach(campo => {
      const el = document.getElementById(campo);
      if (el) el.value = '';
    });

    if (id === 'modal-cot') {
      const resumen = document.getElementById('cot-resumen');
      if (resumen) { resumen.style.display = 'none'; resumen._total = 0; }
    }
  },

  initGlobalListeners() {
    // Cerrar overlay al hacer clic fuera
    document.querySelectorAll('.overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) Modal.close(overlay.id);
      });
    });

    // Cerrar con Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.overlay.open').forEach(o => Modal.close(o.id));
      }
    });
  },
};

// ─── CHIP SELECTOR ───────────────────────────────────────────────────────────
// Selector interactivo con búsqueda, checkboxes y chips visuales.

const Chips = {
  // Estado de selección por tipo
  sel: {
    equipos:    new Map(),  // Map<id, cantidad>
    personal:   new Set(),  // Set<id>
    cotEquipos: new Map(),  // Map<id, cantidad>
  },

  reset(tipos = ['equipos', 'personal', 'cotEquipos']) {
    tipos.forEach(t => {
      this.sel[t] = t === 'personal' ? new Set() : new Map();
      this.render(t);
    });
  },

  cargar(equiposCant = [], personalIds = []) {
    this.sel.equipos  = new Map(equiposCant.map(x => [Number(x.id), Number(x.cant) || 1]));
    this.sel.personal = new Set(personalIds.map(Number));
    this.render('equipos');
    this.render('personal');
  },

  cargarCot(equiposCant = []) {
    this.sel.cotEquipos = new Map(equiposCant.map(x => [Number(x.id), Number(x.cant) || 1]));
    this.render('cotEquipos');
  },

  toggle(tipo, id, checked) {
    if (tipo === 'personal') {
      checked ? this.sel.personal.add(Number(id)) : this.sel.personal.delete(Number(id));
    } else {
      const sel = this.sel[tipo];
      checked ? sel.set(Number(id), 1) : sel.delete(Number(id));
    }
    this.render(tipo);
    if (tipo === 'cotEquipos') calcCotizacion();
  },

  setCantidad(tipo, id, valor) {
    const equipo = DB.getEquipo(Number(id));
    const max    = equipo ? equipo.cant : 99;
    const cant   = Math.max(1, Math.min(parseInt(valor) || 1, max));
    this.sel[tipo].set(Number(id), cant);
    this.render(tipo);
    if (tipo === 'cotEquipos') calcCotizacion();
  },

  filtrar(tipo, query) {
    this.render(tipo, query.toLowerCase());
  },

  render(tipo, query = '') {
    const listEl = document.getElementById('cs-' + tipo + '-list');
    const tagsEl = document.getElementById('cs-' + tipo + '-tags');
    if (!listEl || !tagsEl) return;

    const esPersonal = tipo === 'personal';
    const fuente     = esPersonal ? DB.getPersonal() : DB.getEquipos();
    const sel        = this.sel[tipo];

    // Filtrar
    const filtrados = fuente.filter(x => {
      if (!query) return true;
      const txt = esPersonal
        ? `${x.nombre} ${x.cargo}`.toLowerCase()
        : `${x.nombre} ${x.cat} ${x.serial}`.toLowerCase();
      return txt.includes(query);
    });

    // Renderizar lista
    if (!filtrados.length) {
      listEl.innerHTML = '<div class="cs-empty">Sin resultados</div>';
    } else if (esPersonal) {
      listEl.innerHTML = filtrados.map(x => {
        const checked = sel.has(x.id);
        return `<label class="cs-opt ${checked ? 'on' : ''}">
          <input type="checkbox" ${checked ? 'checked' : ''}
            onchange="Chips.toggle('personal', ${x.id}, this.checked)">
          <div>
            <div class="cs-opt-name">${x.nombre}</div>
            <div class="cs-opt-sub">${x.cargo}</div>
          </div>
          <span></span>
        </label>`;
      }).join('');
    } else {
      listEl.innerHTML = filtrados.map(x => {
        const checked = sel.has(x.id);
        const cant    = sel.get(x.id) || 1;
        const disp    = Calc.disponibles(x) + (checked ? cant : 0);
        const fnToggle = `Chips.toggle('${tipo}', ${x.id}, this.checked)`;
        const fnCant   = `Chips.setCantidad('${tipo}', ${x.id}, this.value)`;
        return `<label class="cs-opt ${checked ? 'on' : ''}">
          <input type="checkbox" ${checked ? 'checked' : ''} onchange="${fnToggle}">
          <div>
            <div class="cs-opt-name">${x.nombre}</div>
            <div class="cs-opt-sub">${x.cat} · ${x.serial} · <b>${disp}</b> disp. · ${Format.moneda(x.tarifa || 0)}/día</div>
          </div>
          <input type="number" class="cant-inp" min="1" max="${x.cant}" value="${cant}"
            ${!checked ? 'disabled' : ''}
            onchange="${fnCant}"
            onclick="event.stopPropagation()">
        </label>`;
      }).join('');
    }

    // Renderizar chips (seleccionados)
    if (esPersonal) {
      const selPersonas = DB.getPersonal().filter(x => sel.has(x.id));
      tagsEl.innerHTML = selPersonas.length
        ? selPersonas.map(x => `
            <span class="chip">${x.nombre.split(' ')[0]}
              <btn onclick="Chips.toggle('personal', ${x.id}, false)">×</btn>
            </span>`).join('')
        : '<span style="font-size:11px;color:var(--text3)">Nadie asignado</span>';
    } else {
      const selEquipos = DB.getEquipos().filter(x => sel.has(x.id));
      tagsEl.innerHTML = selEquipos.length
        ? selEquipos.map(x => {
            const cant = sel.get(x.id);
            return `<span class="chip">${x.nombre.split(' ').slice(0, 2).join(' ')} ×${cant}
              <btn onclick="Chips.toggle('${tipo}', ${x.id}, false)">×</btn>
            </span>`;
          }).join('')
        : '<span style="font-size:11px;color:var(--text3)">Ninguno seleccionado</span>';
    }
  },

  // Convierte el estado del chip a arrays para guardar
  getEquiposCant(tipo = 'equipos') {
    return Array.from(this.sel[tipo].entries()).map(([id, cant]) => ({
      id:   Number(id),
      cant: Number(cant),
    }));
  },

  getPersonalIds() {
    return Array.from(this.sel.personal).map(Number);
  },
};

// ─── COLORES DE AVATAR ───────────────────────────────────────────────────────

const AVATAR_COLORS = [
  { bg: 'rgba(212,160,23,.15)', c: '#F5C842' },
  { bg: '#0F2B1A',              c: '#4ADE80' },
  { bg: '#2A1E08',              c: '#FBD26A' },
  { bg: '#2A0F0F',              c: '#FCA5A5' },
  { bg: '#0F1F3A',              c: '#93C5FD' },
];

function avatarColor(i) {
  return AVATAR_COLORS[i % AVATAR_COLORS.length];
}

// ─── CSS DINÁMICO PARA ANIMACIONES ───────────────────────────────────────────

(function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes toastIn  { from { opacity:0; transform: translateY(8px)  } to { opacity:1; transform: translateY(0) } }
    @keyframes toastOut { from { opacity:1; transform: translateY(0)     } to { opacity:0; transform: translateY(8px) } }
  `;
  document.head.appendChild(style);
})();
