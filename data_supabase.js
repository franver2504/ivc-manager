/**
 * IVC Manager Pro — Capa de datos con Supabase (data.js)
 *
 * INSTRUCCIONES:
 * 1. Reemplaza TU_SUPABASE_URL con la URL de tu proyecto
 * 2. Reemplaza TU_SUPABASE_ANON_KEY con tu anon/public key
 * Ambas las encuentras en: Supabase → Settings → API
 */

// ─── CONFIGURACIÓN ───────────────────────────────────────────────────────────
// ⚠️  CAMBIA ESTOS DOS VALORES con los de tu proyecto Supabase

const SUPABASE_URL  = 'TU_SUPABASE_URL';        // ej: https://xyzabc.supabase.co
const SUPABASE_KEY  = 'TU_SUPABASE_ANON_KEY';   // empieza con "eyJ..."

// ─── CLIENTE SUPABASE ────────────────────────────────────────────────────────

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── ESTADO LOCAL (caché en memoria) ─────────────────────────────────────────
// Se llena al iniciar la app con una sola carga desde Supabase.
// Las operaciones de escritura actualizan la BD y el caché al mismo tiempo.

const State = {
  equipos:      [],
  eventos:      [],
  personal:     [],
  clientes:     [],
  cotizaciones: [],
  trazabilidad: [],
  currentUser:  null,
};

// ─── CARGA INICIAL ────────────────────────────────────────────────────────────
// Llama a esta función justo después del login exitoso.

async function cargarTodosLosDatos() {
  try {
    const [eq, ev, per, cli, cot, traz] = await Promise.all([
      sb.from('equipos').select('*').order('id'),
      sb.from('eventos').select('*').order('created_at', { ascending: false }),
      sb.from('personal').select('*').order('nombre'),
      sb.from('clientes').select('*').order('nombre'),
      sb.from('cotizaciones').select('*').order('created_at', { ascending: false }),
      sb.from('trazabilidad').select('*').order('created_at', { ascending: false }).limit(200),
    ]);

    // Mapear nombres de columnas de snake_case (Supabase) a camelCase (app)
    State.equipos      = (eq.data  || []).map(mapEquipo);
    State.eventos      = (ev.data  || []).map(mapEvento);
    State.personal     = (per.data || []).map(mapPersona);
    State.clientes     = (cli.data || []).map(x => x);
    State.cotizaciones = (cot.data || []).map(mapCotizacion);
    State.trazabilidad = (traz.data|| []).map(mapTrazabilidad);

    console.log('✅ Datos cargados desde Supabase');
  } catch (err) {
    console.error('❌ Error al cargar datos:', err);
    Toast.error('Error al conectar con la base de datos');
  }
}

// ─── MAPEADORES (snake_case ↔ camelCase) ─────────────────────────────────────

function mapEquipo(r) {
  return {
    id:        r.id,
    nombre:    r.nombre,
    cat:       r.cat,
    cant:      r.cant,
    estado:    r.estado,
    tarifa:    r.tarifa,
    serial:    r.serial,
    notas:     r.notas,
    mantFecha: r.mant_fecha || '',
    mantNotas: r.mant_notas || '',
  };
}

function mapEvento(r) {
  return {
    id:          r.id,
    nombre:      r.nombre,
    cliente:     r.cliente,
    inicio:      r.inicio,
    fin:         r.fin,
    estado:      r.estado,
    equiposCant: r.equipos_cant || [],
    personal:    r.personal_ids || [],
    notas:       r.notas,
    retornado:   r.retornado,
  };
}

function mapPersona(r) {
  return {
    id:     r.id,
    nombre: r.nombre,
    cargo:  r.cargo,
    tel:    r.tel,
    email:  r.email,
    esp:    r.esp,
    estado: r.estado,
  };
}

function mapCotizacion(r) {
  return {
    id:          r.id,
    nombre:      r.nombre,
    cliente:     r.cliente,
    fecha:       r.fecha,
    dias:        r.dias,
    equiposCant: r.equipos_cant || [],
    descuento:   r.descuento,
    estado:      r.estado,
    obs:         r.obs,
    total:       r.total,
  };
}

function mapTrazabilidad(r) {
  return {
    id:           r.id,
    fecha:        r.fecha,
    tipo:         r.tipo,
    eqId:         r.eq_id,
    eqNombre:     r.eq_nombre,
    cant:         r.cant,
    eventoNombre: r.evento_nombre,
    usuario:      r.usuario,
    notas:        r.notas,
  };
}

// ─── DB: CAPA DE ACCESO A DATOS ──────────────────────────────────────────────
// Misma API que antes — la UI no cambia nada.

const DB = {

  // ── EQUIPOS ───────────────────────────────────────────────────────────────

  getEquipos() { return State.equipos; },
  getEquipo(id) { return State.equipos.find(e => e.id === id) || null; },

  async crearEquipo(datos) {
    const { data, error } = await sb.from('equipos').insert({
      nombre:     datos.nombre,
      cat:        datos.cat,
      cant:       datos.cant,
      estado:     datos.estado,
      tarifa:     datos.tarifa,
      serial:     datos.serial,
      notas:      datos.notas,
      mant_fecha: datos.mantFecha || '',
      mant_notas: datos.mantNotas || '',
    }).select().single();
    if (error) throw error;
    const equipo = mapEquipo(data);
    State.equipos.push(equipo);
    return equipo;
  },

  async actualizarEquipo(id, datos) {
    const updates = {};
    if (datos.nombre    !== undefined) updates.nombre     = datos.nombre;
    if (datos.cat       !== undefined) updates.cat        = datos.cat;
    if (datos.cant      !== undefined) updates.cant       = datos.cant;
    if (datos.estado    !== undefined) updates.estado     = datos.estado;
    if (datos.tarifa    !== undefined) updates.tarifa     = datos.tarifa;
    if (datos.serial    !== undefined) updates.serial     = datos.serial;
    if (datos.notas     !== undefined) updates.notas      = datos.notas;
    if (datos.mantFecha !== undefined) updates.mant_fecha = datos.mantFecha;
    if (datos.mantNotas !== undefined) updates.mant_notas = datos.mantNotas;

    const { data, error } = await sb.from('equipos').update(updates).eq('id', id).select().single();
    if (error) throw error;
    const equipo = mapEquipo(data);
    const idx = State.equipos.findIndex(e => e.id === id);
    if (idx >= 0) State.equipos[idx] = equipo;
    return equipo;
  },

  async eliminarEquipo(id) {
    const { error } = await sb.from('equipos').delete().eq('id', id);
    if (error) throw error;
    State.equipos = State.equipos.filter(e => e.id !== id);
  },

  // ── EVENTOS ───────────────────────────────────────────────────────────────

  getEventos() { return State.eventos; },
  getEvento(id) { return State.eventos.find(e => e.id === id) || null; },

  async crearEvento(datos) {
    const { data, error } = await sb.from('eventos').insert({
      nombre:       datos.nombre,
      cliente:      datos.cliente,
      inicio:       datos.inicio,
      fin:          datos.fin,
      estado:       datos.estado,
      equipos_cant: datos.equiposCant || [],
      personal_ids: datos.personal || [],
      notas:        datos.notas,
      retornado:    false,
    }).select().single();
    if (error) throw error;
    const evento = mapEvento(data);
    State.eventos.unshift(evento);
    return evento;
  },

  async actualizarEvento(id, datos) {
    const updates = {};
    if (datos.nombre       !== undefined) updates.nombre       = datos.nombre;
    if (datos.cliente      !== undefined) updates.cliente      = datos.cliente;
    if (datos.inicio       !== undefined) updates.inicio       = datos.inicio;
    if (datos.fin          !== undefined) updates.fin          = datos.fin;
    if (datos.estado       !== undefined) updates.estado       = datos.estado;
    if (datos.equiposCant  !== undefined) updates.equipos_cant = datos.equiposCant;
    if (datos.personal     !== undefined) updates.personal_ids = datos.personal;
    if (datos.notas        !== undefined) updates.notas        = datos.notas;
    if (datos.retornado    !== undefined) updates.retornado    = datos.retornado;

    const { data, error } = await sb.from('eventos').update(updates).eq('id', id).select().single();
    if (error) throw error;
    const evento = mapEvento(data);
    const idx = State.eventos.findIndex(e => e.id === id);
    if (idx >= 0) State.eventos[idx] = evento;
    return evento;
  },

  async eliminarEvento(id) {
    const { error } = await sb.from('eventos').delete().eq('id', id);
    if (error) throw error;
    State.eventos = State.eventos.filter(e => e.id !== id);
  },

  // ── PERSONAL ──────────────────────────────────────────────────────────────

  getPersonal() { return State.personal; },
  getPersona(id) { return State.personal.find(p => p.id === id) || null; },

  async crearPersona(datos) {
    const { data, error } = await sb.from('personal').insert(datos).select().single();
    if (error) throw error;
    const persona = mapPersona(data);
    State.personal.push(persona);
    return persona;
  },

  async actualizarPersona(id, datos) {
    const { data, error } = await sb.from('personal').update(datos).eq('id', id).select().single();
    if (error) throw error;
    const persona = mapPersona(data);
    const idx = State.personal.findIndex(p => p.id === id);
    if (idx >= 0) State.personal[idx] = persona;
    return persona;
  },

  async eliminarPersona(id) {
    const { error } = await sb.from('personal').delete().eq('id', id);
    if (error) throw error;
    State.personal = State.personal.filter(p => p.id !== id);
  },

  // ── CLIENTES ──────────────────────────────────────────────────────────────

  getClientes() { return State.clientes; },
  getCliente(id) { return State.clientes.find(c => c.id === id) || null; },

  async crearCliente(datos) {
    const { data, error } = await sb.from('clientes').insert(datos).select().single();
    if (error) throw error;
    State.clientes.push(data);
    return data;
  },

  async actualizarCliente(id, datos) {
    const { data, error } = await sb.from('clientes').update(datos).eq('id', id).select().single();
    if (error) throw error;
    const idx = State.clientes.findIndex(c => c.id === id);
    if (idx >= 0) State.clientes[idx] = data;
    return data;
  },

  async eliminarCliente(id) {
    const { error } = await sb.from('clientes').delete().eq('id', id);
    if (error) throw error;
    State.clientes = State.clientes.filter(c => c.id !== id);
  },

  // ── COTIZACIONES ──────────────────────────────────────────────────────────

  getCotizaciones() { return State.cotizaciones; },
  getCotizacion(id) { return State.cotizaciones.find(c => c.id === id) || null; },

  async crearCotizacion(datos) {
    const { data, error } = await sb.from('cotizaciones').insert({
      nombre:       datos.nombre,
      cliente:      datos.cliente,
      fecha:        datos.fecha,
      dias:         datos.dias,
      equipos_cant: datos.equiposCant || [],
      descuento:    datos.descuento,
      estado:       datos.estado,
      obs:          datos.obs,
      total:        datos.total,
    }).select().single();
    if (error) throw error;
    const cot = mapCotizacion(data);
    State.cotizaciones.unshift(cot);
    return cot;
  },

  async actualizarCotizacion(id, datos) {
    const updates = {};
    if (datos.nombre       !== undefined) updates.nombre       = datos.nombre;
    if (datos.cliente      !== undefined) updates.cliente      = datos.cliente;
    if (datos.fecha        !== undefined) updates.fecha        = datos.fecha;
    if (datos.dias         !== undefined) updates.dias         = datos.dias;
    if (datos.equiposCant  !== undefined) updates.equipos_cant = datos.equiposCant;
    if (datos.descuento    !== undefined) updates.descuento    = datos.descuento;
    if (datos.estado       !== undefined) updates.estado       = datos.estado;
    if (datos.obs          !== undefined) updates.obs          = datos.obs;
    if (datos.total        !== undefined) updates.total        = datos.total;

    const { data, error } = await sb.from('cotizaciones').update(updates).eq('id', id).select().single();
    if (error) throw error;
    const cot = mapCotizacion(data);
    const idx = State.cotizaciones.findIndex(c => c.id === id);
    if (idx >= 0) State.cotizaciones[idx] = cot;
    return cot;
  },

  async eliminarCotizacion(id) {
    const { error } = await sb.from('cotizaciones').delete().eq('id', id);
    if (error) throw error;
    State.cotizaciones = State.cotizaciones.filter(c => c.id !== id);
  },

  // ── TRAZABILIDAD ──────────────────────────────────────────────────────────

  getTrazabilidad() { return State.trazabilidad; },

  async registrarMovimiento(tipo, equipo, cant, eventoNombre, notas = '') {
    const { data, error } = await sb.from('trazabilidad').insert({
      fecha:         new Date().toISOString().slice(0, 16),
      tipo,
      eq_id:         equipo.id,
      eq_nombre:     equipo.nombre,
      cant,
      evento_nombre: eventoNombre,
      usuario:       State.currentUser?.nombre || 'sistema',
      notas,
    }).select().single();
    if (error) throw error;
    const mov = mapTrazabilidad(data);
    State.trazabilidad.unshift(mov);
    return mov;
  },

  // ── USUARIOS / AUTH ───────────────────────────────────────────────────────

  async findUserByCredentials(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return null;

    // Cargar perfil extendido (rol, iniciales)
    const { data: perfil } = await sb.from('perfiles').select('*').eq('id', data.user.id).single();
    if (!perfil) return null;

    return {
      id:     data.user.id,
      user:   perfil.user_name,
      name:   perfil.nombre,
      rol:    perfil.rol,
      ini:    perfil.ini,
    };
  },

  async doLogoutDB() {
    await sb.auth.signOut();
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

// ─── UTILIDADES DE NEGOCIO ────────────────────────────────────────────────────

const Calc = {

  disponibles(equipo) {
    let enUso = 0;
    State.eventos
      .filter(ev => ev.estado === 'En curso' && !ev.retornado)
      .forEach(ev => {
        const item = (ev.equiposCant || []).find(x => x.id === equipo.id);
        if (item) enUso += item.cant;
      });
    return Math.max(0, equipo.cant - enUso);
  },

  diasHastaMant(fecha) {
    if (!fecha) return null;
    return Math.ceil((new Date(fecha) - new Date()) / 86_400_000);
  },

  alertasMantenimiento() {
    return State.equipos.filter(e => {
      if (e.estado === 'Mantenimiento') return true;
      if (e.mantFecha) {
        const dias = Calc.diasHastaMant(e.mantFecha);
        return dias !== null && dias <= 7;
      }
      return false;
    });
  },

  conflictosEquipos() {
    const conflictos = [];
    const activos = State.eventos.filter(e => e.estado !== 'Finalizado');
    activos.forEach(ev => {
      (ev.equiposCant || []).forEach(asig => {
        const equipo = State.equipos.find(e => e.id === asig.id);
        if (!equipo) return;
        const otros = activos.filter(o =>
          o.id !== ev.id && !(o.fin < ev.inicio || o.inicio > ev.fin)
        );
        const cantOtros = otros.reduce((s, o) => {
          const item = (o.equiposCant || []).find(x => x.id === asig.id);
          return s + (item ? item.cant : 0);
        }, 0);
        if (cantOtros + asig.cant > equipo.cant) {
          conflictos.push({ equipo: equipo.nombre, evento: ev.nombre, faltantes: cantOtros + asig.cant - equipo.cant });
        }
      });
    });
    return conflictos;
  },

  totalCotizacion(equiposCant, dias, descuentoPct) {
    const items = equiposCant.map(item => {
      const eq = State.equipos.find(e => e.id === item.id);
      return eq ? { nombre: eq.nombre, cant: item.cant, tarifa: eq.tarifa, subtotal: eq.tarifa * item.cant * dias } : null;
    }).filter(Boolean);
    const subtotal  = items.reduce((s, x) => s + x.subtotal, 0);
    const descuento = subtotal * (descuentoPct / 100);
    return { subtotal, descuento, total: subtotal - descuento, items };
  },

  notificaciones() {
    const notifs = [];
    const HOY = new Date();
    State.eventos.filter(e => e.estado === 'Planificado').forEach(ev => {
      const dias = Math.ceil((new Date(ev.inicio) - HOY) / 86_400_000);
      if (dias >= 0 && dias <= 3) notifs.push({ tipo: 'warn', msg: `Evento próximo: <b>${ev.nombre}</b> en ${dias === 0 ? 'hoy' : dias + ' día' + (dias === 1 ? '' : 's')}` });
    });
    State.eventos.filter(e => e.estado === 'Finalizado' && !e.retornado).forEach(ev => {
      notifs.push({ tipo: 'err', msg: `Retorno pendiente: <b>${ev.nombre}</b>` });
    });
    Calc.alertasMantenimiento()
      .filter(e => Calc.diasHastaMant(e.mantFecha) <= 0 && e.estado !== 'Mantenimiento')
      .forEach(e => notifs.push({ tipo: 'err', msg: `Mantenimiento vencido: <b>${e.nombre}</b>` }));
    Calc.conflictosEquipos().forEach(c => {
      notifs.push({ tipo: 'err', msg: `Conflicto: <b>${c.equipo}</b> sobreasignado en <b>${c.evento}</b>` });
    });
    const pend = State.cotizaciones.filter(c => c.estado === 'Pendiente').length;
    if (pend > 0) notifs.push({ tipo: 'info', msg: `${pend} cotización${pend > 1 ? 'es' : ''} pendiente${pend > 1 ? 's' : ''}` });
    return notifs;
  },
};

// ─── FORMATO ─────────────────────────────────────────────────────────────────

const Format = {
  moneda(v)    { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v); },
  fecha(s)     { if (!s) return ''; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; },
  iniciales(n) { return n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(); },
  rolLabel(r)  { return { admin: 'Administrador', operador: 'Operador', tecnico: 'Técnico' }[r] || r; },
};
