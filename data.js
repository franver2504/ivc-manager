/**
 * IVC Manager Pro — Capa de datos (data.js)
 *
 * ARQUITECTURA:
 * Este archivo es el único punto de contacto con el almacenamiento.
 * Para migrar a Supabase, solo se modifica este archivo.
 * La UI nunca accede a localStorage directamente.
 *
 * CUANDO SE CONECTE SUPABASE:
 * 1. Reemplazar las funciones de LS.* por llamadas a supabase.from(tabla).*
 * 2. Cambiar las funciones DB.* de síncronas a async/await
 * 3. La UI solo necesita agregar await antes de cada llamada a DB.*
 */

// ─── STORAGE ADAPTER ─────────────────────────────────────────────────────────
// Punto de intercambio: hoy = localStorage, mañana = Supabase

const Storage = {
  get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem('ivc_' + key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem('ivc_' + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Error guardando en storage:', e);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem('ivc_' + key);
    } catch {}
  }
};

// ─── DATOS SEMILLA (demo) ────────────────────────────────────────────────────

const SEED = {
  users: [
    { id: 1, user: 'admin',      pass: 'admin123', name: 'Administrador', rol: 'admin',    ini: 'AD' },
    { id: 2, user: 'supervisor', pass: 'sup2024',  name: 'Supervisor',    rol: 'operador', ini: 'SV' },
    { id: 3, user: 'luismtz',    pass: 'luis2024', name: 'Luis Martínez', rol: 'tecnico',  ini: 'LM' },
  ],
  equipos: [
    { id: 1, nombre: 'Cabeza móvil Beam 200W',   cat: 'Iluminación', cant: 8, estado: 'Disponible',   tarifa: 120000, serial: 'BM-001', notas: 'Marca Shehds', mantFecha: '',           mantNotas: '' },
    { id: 2, nombre: 'Consola MA2 Light',         cat: 'Iluminación', cant: 1, estado: 'Disponible',   tarifa: 350000, serial: 'MA2-01', notas: '',             mantFecha: '2026-04-15', mantNotas: 'Actualización firmware' },
    { id: 3, nombre: 'Subwoofer 18"',             cat: 'Sonido',      cant: 4, estado: 'Disponible',   tarifa: 85000,  serial: 'SW-001', notas: '',             mantFecha: '',           mantNotas: '' },
    { id: 4, nombre: 'Line Array QSC K12',        cat: 'Sonido',      cant: 6, estado: 'Disponible',   tarifa: 95000,  serial: 'QK-001', notas: '',             mantFecha: '2026-04-02', mantNotas: 'Revisar tweeter' },
    { id: 5, nombre: 'Proyector 10000 lúmenes',   cat: 'Video',       cant: 2, estado: 'Disponible',   tarifa: 280000, serial: 'PY-001', notas: 'Optoma',       mantFecha: '',           mantNotas: '' },
    { id: 6, nombre: 'Pantalla LED 3x2m',         cat: 'Video',       cant: 1, estado: 'Mantenimiento',tarifa: 500000, serial: 'LED-001',notas: 'Panel roto',   mantFecha: '2026-03-30', mantNotas: 'Reemplazo de panel' },
  ],
  eventos: [
    { id: 1, nombre: 'Festival Música del Caribe',     cliente: 'Alcaldía de Cartagena', inicio: '2026-03-28', fin: '2026-03-30', estado: 'Planificado', equiposCant: [{id:1,cant:4},{id:3,cant:2},{id:4,cant:3}], personal: [1,2], notas: '', retornado: false },
    { id: 2, nombre: 'Boda Pérez – Hotel Santa Clara', cliente: 'Carlos Pérez',          inicio: '2026-03-27', fin: '2026-03-27', estado: 'En curso',    equiposCant: [{id:2,cant:1},{id:5,cant:2}],               personal: [3],   notas: 'Montaje desde las 2pm', retornado: false },
    { id: 3, nombre: 'Congreso Empresarial',           cliente: 'Cámara de Comercio',    inicio: '2026-03-10', fin: '2026-03-11', estado: 'Finalizado',  equiposCant: [{id:4,cant:2},{id:5,cant:1}],               personal: [1],   notas: '', retornado: true },
  ],
  personal: [
    { id: 1, nombre: 'Luis Martínez', cargo: 'Jefe de iluminación', tel: '+57 300 123 4567', email: 'luis@ivc.co',    esp: 'Iluminación', estado: 'Activo' },
    { id: 2, nombre: 'Ana Gómez',     cargo: 'Técnica de sonido',   tel: '+57 310 987 6543', email: 'ana@ivc.co',     esp: 'Sonido',      estado: 'Activo' },
    { id: 3, nombre: 'Ricardo Díaz',  cargo: 'Operador de video',   tel: '+57 320 456 7890', email: 'ricardo@ivc.co', esp: 'Video',       estado: 'Activo' },
  ],
  clientes: [
    { id: 1, nombre: 'Carlos Pérez',  empresa: '',                     tel: '+57 311 222 3333', email: 'carlos@gmail.com',              ciudad: 'Cartagena', tipo: 'Particular', notas: '' },
    { id: 2, nombre: 'María González',empresa: 'Alcaldía de Cartagena',tel: '+57 5 6601000',    email: 'eventos@cartagena.gov.co',      ciudad: 'Cartagena', tipo: 'Gobierno',   notas: '' },
    { id: 3, nombre: 'Pedro Ruiz',    empresa: 'Cámara de Comercio',   tel: '+57 310 444 5555', email: 'pedro@camaracartagena.com',     ciudad: 'Cartagena', tipo: 'Empresa',    notas: '' },
  ],
  cotizaciones: [
    { id: 1, nombre: 'Boda Pérez', cliente: 'Carlos Pérez', fecha: '2026-03-27', dias: 1, equiposCant: [{id:2,cant:1},{id:5,cant:2}], descuento: 0, estado: 'Aprobada', obs: '', total: 910000 },
  ],
  trazabilidad: [
    { id: 1, fecha: '2026-03-27T14:00', tipo: 'salida',       eqId: 2, eqNombre: 'Consola MA2 Light',   cant: 1, eventoNombre: 'Boda Pérez – Hotel Santa Clara', usuario: 'admin', notas: '' },
    { id: 2, fecha: '2026-03-27T14:00', tipo: 'salida',       eqId: 5, eqNombre: 'Proyector 10000 lúmenes', cant: 2, eventoNombre: 'Boda Pérez – Hotel Santa Clara', usuario: 'admin', notas: '' },
    { id: 3, fecha: '2026-03-11T18:30', tipo: 'retorno',      eqId: 4, eqNombre: 'Line Array QSC K12', cant: 2, eventoNombre: 'Congreso Empresarial', usuario: 'admin', notas: '' },
    { id: 4, fecha: '2026-03-25T09:00', tipo: 'mantenimiento',eqId: 6, eqNombre: 'Pantalla LED 3x2m',  cant: 1, eventoNombre: '—', usuario: 'admin', notas: 'Panel roto' },
  ],
};

// ─── ESTADO DE LA APP ────────────────────────────────────────────────────────

const State = {
  users:         Storage.get('users',         SEED.users),
  equipos:       Storage.get('equipos',       SEED.equipos),
  eventos:       Storage.get('eventos',       SEED.eventos),
  personal:      Storage.get('personal',      SEED.personal),
  clientes:      Storage.get('clientes',      SEED.clientes),
  cotizaciones:  Storage.get('cotizaciones',  SEED.cotizaciones),
  trazabilidad:  Storage.get('trazabilidad',  SEED.trazabilidad),

  // Contadores de ID
  nextId: {
    users:        Storage.get('nextId_users',        4),
    equipos:      Storage.get('nextId_equipos',      7),
    eventos:      Storage.get('nextId_eventos',      4),
    personal:     Storage.get('nextId_personal',     4),
    clientes:     Storage.get('nextId_clientes',     4),
    cotizaciones: Storage.get('nextId_cotizaciones', 2),
    trazabilidad: Storage.get('nextId_trazabilidad', 5),
  },

  currentUser: null,
};

// ─── DB: CAPA DE ACCESO A DATOS ──────────────────────────────────────────────
// Cada método guarda en Storage después de modificar State.
// Al migrar a Supabase: reemplazar el cuerpo de cada método.

const DB = {

  // ── HELPERS INTERNOS ──────────────────────────────────────────────────────

  _nextId(tabla) {
    const id = State.nextId[tabla];
    State.nextId[tabla]++;
    Storage.set('nextId_' + tabla, State.nextId[tabla]);
    return id;
  },

  _save(tabla) {
    Storage.set(tabla, State[tabla]);
  },

  // ── EQUIPOS ───────────────────────────────────────────────────────────────

  getEquipos() {
    return State.equipos;
  },

  getEquipo(id) {
    return State.equipos.find(e => e.id === id) || null;
  },

  crearEquipo(datos) {
    const equipo = {
      id:        this._nextId('equipos'),
      mantFecha: '',
      mantNotas: '',
      ...datos,
    };
    State.equipos.push(equipo);
    this._save('equipos');
    return equipo;
  },

  actualizarEquipo(id, datos) {
    const idx = State.equipos.findIndex(e => e.id === id);
    if (idx === -1) return null;
    State.equipos[idx] = { ...State.equipos[idx], ...datos };
    this._save('equipos');
    return State.equipos[idx];
  },

  eliminarEquipo(id) {
    State.equipos = State.equipos.filter(e => e.id !== id);
    this._save('equipos');
  },

  // ── EVENTOS ───────────────────────────────────────────────────────────────

  getEventos() {
    return State.eventos;
  },

  getEvento(id) {
    return State.eventos.find(e => e.id === id) || null;
  },

  crearEvento(datos) {
    const evento = {
      id:        this._nextId('eventos'),
      retornado: false,
      ...datos,
    };
    State.eventos.push(evento);
    this._save('eventos');
    return evento;
  },

  actualizarEvento(id, datos) {
    const idx = State.eventos.findIndex(e => e.id === id);
    if (idx === -1) return null;
    State.eventos[idx] = { ...State.eventos[idx], ...datos };
    this._save('eventos');
    return State.eventos[idx];
  },

  eliminarEvento(id) {
    State.eventos = State.eventos.filter(e => e.id !== id);
    this._save('eventos');
  },

  // ── PERSONAL ──────────────────────────────────────────────────────────────

  getPersonal() {
    return State.personal;
  },

  getPersona(id) {
    return State.personal.find(p => p.id === id) || null;
  },

  crearPersona(datos) {
    const persona = { id: this._nextId('personal'), ...datos };
    State.personal.push(persona);
    this._save('personal');
    return persona;
  },

  actualizarPersona(id, datos) {
    const idx = State.personal.findIndex(p => p.id === id);
    if (idx === -1) return null;
    State.personal[idx] = { ...State.personal[idx], ...datos };
    this._save('personal');
    return State.personal[idx];
  },

  eliminarPersona(id) {
    State.personal = State.personal.filter(p => p.id !== id);
    this._save('personal');
  },

  // ── CLIENTES ──────────────────────────────────────────────────────────────

  getClientes() {
    return State.clientes;
  },

  getCliente(id) {
    return State.clientes.find(c => c.id === id) || null;
  },

  crearCliente(datos) {
    const cliente = { id: this._nextId('clientes'), ...datos };
    State.clientes.push(cliente);
    this._save('clientes');
    return cliente;
  },

  actualizarCliente(id, datos) {
    const idx = State.clientes.findIndex(c => c.id === id);
    if (idx === -1) return null;
    State.clientes[idx] = { ...State.clientes[idx], ...datos };
    this._save('clientes');
    return State.clientes[idx];
  },

  eliminarCliente(id) {
    State.clientes = State.clientes.filter(c => c.id !== id);
    this._save('clientes');
  },

  // ── COTIZACIONES ──────────────────────────────────────────────────────────

  getCotizaciones() {
    return State.cotizaciones;
  },

  getCotizacion(id) {
    return State.cotizaciones.find(c => c.id === id) || null;
  },

  crearCotizacion(datos) {
    const cot = { id: this._nextId('cotizaciones'), ...datos };
    State.cotizaciones.push(cot);
    this._save('cotizaciones');
    return cot;
  },

  actualizarCotizacion(id, datos) {
    const idx = State.cotizaciones.findIndex(c => c.id === id);
    if (idx === -1) return null;
    State.cotizaciones[idx] = { ...State.cotizaciones[idx], ...datos };
    this._save('cotizaciones');
    return State.cotizaciones[idx];
  },

  eliminarCotizacion(id) {
    State.cotizaciones = State.cotizaciones.filter(c => c.id !== id);
    this._save('cotizaciones');
  },

  // ── TRAZABILIDAD ──────────────────────────────────────────────────────────

  getTrazabilidad() {
    return State.trazabilidad;
  },

  registrarMovimiento(tipo, equipo, cant, eventoNombre, notas = '') {
    const mov = {
      id:           this._nextId('trazabilidad'),
      fecha:        new Date().toISOString().slice(0, 16),
      tipo,
      eqId:         equipo.id,
      eqNombre:     equipo.nombre,
      cant,
      eventoNombre,
      usuario:      State.currentUser?.name || 'sistema',
      notas,
    };
    State.trazabilidad.unshift(mov);
    this._save('trazabilidad');
    return mov;
  },

  // ── USUARIOS ──────────────────────────────────────────────────────────────

  getUsers() {
    return State.users;
  },

  findUserByCredentials(username, password) {
    return State.users.find(u => u.user === username && u.pass === password) || null;
  },

  crearUser(datos) {
    const user = { id: this._nextId('users'), ...datos };
    State.users.push(user);
    this._save('users');
    return user;
  },

  actualizarUser(id, datos) {
    const idx = State.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    State.users[idx] = { ...State.users[idx], ...datos };
    this._save('users');
    return State.users[idx];
  },

  eliminarUser(id) {
    State.users = State.users.filter(u => u.id !== id);
    this._save('users');
  },
};

// ─── PERMISOS ────────────────────────────────────────────────────────────────

const PERMS = {
  admin:    { canEdit: true,  canDelete: true,  canUsers: true  },
  operador: { canEdit: true,  canDelete: false, canUsers: false },
  tecnico:  { canEdit: false, canDelete: false, canUsers: false },
};

function can(permiso) {
  return !!(State.currentUser && PERMS[State.currentUser.rol]?.[permiso]);
}

// ─── UTILIDADES DE NEGOCIO ───────────────────────────────────────────────────
// Cálculos que dependen de los datos pero no de la UI

const Calc = {

  /**
   * Unidades disponibles de un equipo.
   * Solo cuenta eventos "En curso" (no Planificado ni Finalizado).
   */
  disponibles(equipo) {
    let enUso = 0;
    DB.getEventos()
      .filter(ev => ev.estado === 'En curso' && !ev.retornado)
      .forEach(ev => {
        const item = (ev.equiposCant || []).find(x => x.id === equipo.id);
        if (item) enUso += item.cant;
      });
    return Math.max(0, equipo.cant - enUso);
  },

  /**
   * Días hasta el mantenimiento programado (negativo = vencido).
   */
  diasHastaMant(fecha) {
    if (!fecha) return null;
    return Math.ceil((new Date(fecha) - new Date()) / 86_400_000);
  },

  /**
   * Equipos con alerta de mantenimiento activa (en mant. o próximos en 7 días).
   */
  alertasMantenimiento() {
    return DB.getEquipos().filter(e => {
      if (e.estado === 'Mantenimiento') return true;
      if (e.mantFecha) {
        const dias = Calc.diasHastaMant(e.mantFecha);
        return dias !== null && dias <= 7;
      }
      return false;
    });
  },

  /**
   * Detecta equipos sobreasignados entre eventos activos.
   * Retorna array de { equipo, evento, unidadesFaltantes }.
   */
  conflictosEquipos() {
    const conflictos = [];
    const eventosActivos = DB.getEventos().filter(e => e.estado !== 'Finalizado');

    eventosActivos.forEach(ev => {
      (ev.equiposCant || []).forEach(asig => {
        const equipo = DB.getEquipo(asig.id);
        if (!equipo) return;

        const otrosEventos = eventosActivos.filter(o =>
          o.id !== ev.id &&
          !(o.fin < ev.inicio || o.inicio > ev.fin)
        );

        const cantEnOtros = otrosEventos.reduce((sum, o) => {
          const item = (o.equiposCant || []).find(x => x.id === asig.id);
          return sum + (item ? item.cant : 0);
        }, 0);

        const totalNecesario = cantEnOtros + asig.cant;
        if (totalNecesario > equipo.cant) {
          conflictos.push({
            equipo:    equipo.nombre,
            evento:    ev.nombre,
            faltantes: totalNecesario - equipo.cant,
          });
        }
      });
    });

    return conflictos;
  },

  /**
   * Calcula el total de una cotización.
   */
  totalCotizacion(equiposCant, dias, descuentoPct) {
    const subtotal = equiposCant.reduce((sum, item) => {
      const eq = DB.getEquipo(item.id);
      return sum + (eq ? eq.tarifa * item.cant * dias : 0);
    }, 0);
    const descuento = subtotal * (descuentoPct / 100);
    return {
      subtotal,
      descuento,
      total: subtotal - descuento,
      items: equiposCant.map(item => {
        const eq = DB.getEquipo(item.id);
        return eq
          ? { nombre: eq.nombre, cant: item.cant, tarifa: eq.tarifa, subtotal: eq.tarifa * item.cant * dias }
          : null;
      }).filter(Boolean),
    };
  },

  /**
   * Notificaciones del sistema basadas en estado actual.
   */
  notificaciones() {
    const notifs = [];
    const HOY = new Date();

    // Eventos próximos (próximos 3 días)
    DB.getEventos()
      .filter(e => e.estado === 'Planificado')
      .forEach(ev => {
        const dias = Math.ceil((new Date(ev.inicio) - HOY) / 86_400_000);
        if (dias >= 0 && dias <= 3) {
          notifs.push({
            tipo: 'warn',
            msg:  `Evento próximo: <b>${ev.nombre}</b> en ${dias === 0 ? 'hoy' : dias + (dias === 1 ? ' día' : ' días')}`,
          });
        }
      });

    // Equipos pendientes de retorno
    DB.getEventos()
      .filter(e => e.estado === 'Finalizado' && !e.retornado)
      .forEach(ev => {
        notifs.push({ tipo: 'err', msg: `Retorno pendiente: <b>${ev.nombre}</b>` });
      });

    // Mantenimientos vencidos
    DB.getEquipos()
      .filter(e => e.mantFecha && Calc.diasHastaMant(e.mantFecha) <= 0 && e.estado !== 'Mantenimiento')
      .forEach(e => {
        notifs.push({ tipo: 'err', msg: `Mantenimiento vencido: <b>${e.nombre}</b>` });
      });

    // Conflictos de equipos
    Calc.conflictosEquipos().forEach(c => {
      notifs.push({ tipo: 'err', msg: `Conflicto: <b>${c.equipo}</b> sobreasignado en <b>${c.evento}</b>` });
    });

    // Cotizaciones pendientes
    const pendientes = DB.getCotizaciones().filter(c => c.estado === 'Pendiente').length;
    if (pendientes > 0) {
      notifs.push({ tipo: 'info', msg: `${pendientes} cotización${pendientes > 1 ? 'es' : ''} pendiente${pendientes > 1 ? 's' : ''}` });
    }

    return notifs;
  },
};

// ─── FORMATO ─────────────────────────────────────────────────────────────────

const Format = {
  moneda(valor) {
    return new Intl.NumberFormat('es-CO', {
      style:                 'currency',
      currency:              'COP',
      maximumFractionDigits: 0,
    }).format(valor);
  },

  fecha(isoStr) {
    if (!isoStr) return '';
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}/${y}`;
  },

  iniciales(nombre) {
    return nombre
      .split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  },

  rolLabel(rol) {
    return { admin: 'Administrador', operador: 'Operador', tecnico: 'Técnico' }[rol] || rol;
  },
};
