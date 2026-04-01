-- ═══════════════════════════════════════════════════════════════
-- IVC Manager Pro — Script de creación de tablas en Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════

-- ─── EQUIPOS ─────────────────────────────────────────────────────
CREATE TABLE equipos (
  id          SERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL,
  cat         TEXT NOT NULL DEFAULT 'Otro',
  cant        INTEGER NOT NULL DEFAULT 1,
  estado      TEXT NOT NULL DEFAULT 'Disponible',
  tarifa      INTEGER NOT NULL DEFAULT 0,
  serial      TEXT NOT NULL DEFAULT '',
  notas       TEXT DEFAULT '',
  mant_fecha  TEXT DEFAULT '',
  mant_notas  TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PERSONAL ────────────────────────────────────────────────────
CREATE TABLE personal (
  id          SERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL,
  cargo       TEXT DEFAULT '',
  tel         TEXT DEFAULT '',
  email       TEXT DEFAULT '',
  esp         TEXT DEFAULT 'General',
  estado      TEXT DEFAULT 'Activo',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CLIENTES ────────────────────────────────────────────────────
CREATE TABLE clientes (
  id          SERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL,
  empresa     TEXT DEFAULT '',
  tel         TEXT DEFAULT '',
  email       TEXT DEFAULT '',
  ciudad      TEXT DEFAULT '',
  tipo        TEXT DEFAULT 'Particular',
  notas       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── EVENTOS ─────────────────────────────────────────────────────
CREATE TABLE eventos (
  id              SERIAL PRIMARY KEY,
  nombre          TEXT NOT NULL,
  cliente         TEXT NOT NULL,
  inicio          TEXT NOT NULL,
  fin             TEXT NOT NULL,
  estado          TEXT NOT NULL DEFAULT 'Planificado',
  equipos_cant    JSONB DEFAULT '[]',   -- [{id, cant}]
  personal_ids    JSONB DEFAULT '[]',   -- [id, id, ...]
  notas           TEXT DEFAULT '',
  retornado       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COTIZACIONES ────────────────────────────────────────────────
CREATE TABLE cotizaciones (
  id              SERIAL PRIMARY KEY,
  nombre          TEXT NOT NULL,
  cliente         TEXT NOT NULL,
  fecha           TEXT NOT NULL,
  dias            INTEGER NOT NULL DEFAULT 1,
  equipos_cant    JSONB DEFAULT '[]',   -- [{id, cant}]
  descuento       NUMERIC DEFAULT 0,
  estado          TEXT DEFAULT 'Pendiente',
  obs             TEXT DEFAULT '',
  total           NUMERIC DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TRAZABILIDAD ────────────────────────────────────────────────
CREATE TABLE trazabilidad (
  id              SERIAL PRIMARY KEY,
  fecha           TEXT NOT NULL,
  tipo            TEXT NOT NULL,        -- salida | retorno | mantenimiento | mant_ok
  eq_id           INTEGER REFERENCES equipos(id) ON DELETE SET NULL,
  eq_nombre       TEXT NOT NULL,
  cant            INTEGER NOT NULL DEFAULT 1,
  evento_nombre   TEXT DEFAULT '',
  usuario         TEXT DEFAULT 'sistema',
  notas           TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── USUARIOS ────────────────────────────────────────────────────
-- NOTA: los usuarios de la app se manejan con Supabase Auth.
-- Esta tabla guarda el perfil extendido (rol, iniciales).
CREATE TABLE perfiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  user_name   TEXT NOT NULL UNIQUE,
  rol         TEXT NOT NULL DEFAULT 'tecnico',  -- admin | operador | tecnico
  ini         TEXT NOT NULL DEFAULT 'US',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DATOS DE PRUEBA ─────────────────────────────────────────────
INSERT INTO equipos (nombre, cat, cant, estado, tarifa, serial, notas, mant_fecha, mant_notas) VALUES
  ('Cabeza móvil Beam 200W',  'Iluminación', 8, 'Disponible',    120000, 'BM-001',  'Marca Shehds',  '',           ''),
  ('Consola MA2 Light',       'Iluminación', 1, 'Disponible',    350000, 'MA2-01',  '',              '2026-04-15', 'Actualización firmware'),
  ('Subwoofer 18"',           'Sonido',      4, 'Disponible',     85000, 'SW-001',  '',              '',           ''),
  ('Line Array QSC K12',      'Sonido',      6, 'Disponible',     95000, 'QK-001',  '',              '2026-04-02', 'Revisar tweeter'),
  ('Proyector 10000 lúmenes', 'Video',       2, 'Disponible',    280000, 'PY-001',  'Optoma',        '',           ''),
  ('Pantalla LED 3x2m',       'Video',       1, 'Mantenimiento', 500000, 'LED-001', 'Panel roto',    '2026-03-30', 'Reemplazo de panel');

INSERT INTO personal (nombre, cargo, tel, email, esp, estado) VALUES
  ('Luis Martínez', 'Jefe de iluminación', '+57 300 123 4567', 'luis@ivc.co',    'Iluminación', 'Activo'),
  ('Ana Gómez',     'Técnica de sonido',   '+57 310 987 6543', 'ana@ivc.co',     'Sonido',      'Activo'),
  ('Ricardo Díaz',  'Operador de video',   '+57 320 456 7890', 'ricardo@ivc.co', 'Video',       'Activo');

INSERT INTO clientes (nombre, empresa, tel, email, ciudad, tipo) VALUES
  ('Carlos Pérez',   '',                       '+57 311 222 3333', 'carlos@gmail.com',         'Cartagena', 'Particular'),
  ('María González', 'Alcaldía de Cartagena',  '+57 5 6601000',    'eventos@cartagena.gov.co', 'Cartagena', 'Gobierno'),
  ('Pedro Ruiz',     'Cámara de Comercio',     '+57 310 444 5555', 'pedro@camaracc.com',       'Cartagena', 'Empresa');
