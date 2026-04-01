# Guía de conexión con Supabase — IVC Manager Pro

## PASO 1 — Crear el proyecto en Supabase

1. Ve a supabase.com → inicia sesión
2. Clic en "New project"
3. Llénalo así:
   - Name: ivc-manager
   - Database Password: una contraseña fuerte (guárdala)
   - Region: South America (São Paulo)
4. Clic en "Create new project" — espera 2 minutos


## PASO 2 — Crear las tablas

1. En el dashboard de tu proyecto, ve a: SQL Editor → New query
2. Copia y pega TODO el contenido del archivo "supabase_tablas.sql"
3. Clic en "Run" (botón verde abajo a la derecha)
4. Verás "Success" — tus tablas están creadas con datos de prueba


## PASO 3 — Crear los usuarios de acceso

Los usuarios de la app ahora usan Supabase Auth (login real con email).

1. En Supabase → Authentication → Users → "Add user"
2. Crea estos 3 usuarios:

   Email:    admin@ivc.co       Password: Admin2024!
   Email:    supervisor@ivc.co  Password: Sup2024!
   Email:    luismtz@ivc.co     Password: Luis2024!

3. Después de crearlos, ve a SQL Editor y ejecuta esto
   (reemplaza los UUID con los que aparecen en Authentication → Users):

   INSERT INTO perfiles (id, nombre, user_name, rol, ini) VALUES
     ('UUID-DEL-ADMIN',      'Administrador', 'admin',      'admin',    'AD'),
     ('UUID-DEL-SUPERVISOR', 'Supervisor',    'supervisor', 'operador', 'SV'),
     ('UUID-DE-LUISMTZ',     'Luis Martínez', 'luismtz',    'tecnico',  'LM');


## PASO 4 — Obtener las credenciales de la API

1. En Supabase → Settings → API
2. Copia estos dos valores:
   - "Project URL"       → ej: https://xyzabc123.supabase.co
   - "anon public" key   → empieza con "eyJhbG..."


## PASO 5 — Conectar el código

1. Abre el archivo "data_supabase.js"
2. Cambia las líneas 16 y 17:

   const SUPABASE_URL = 'https://xyzabc123.supabase.co';  ← tu URL
   const SUPABASE_KEY = 'eyJhbG...';                       ← tu anon key

3. Renombra los archivos:
   - data.js          → data_localStorage.js   (guárdalo como respaldo)
   - data_supabase.js → data.js                (este será el activo)


## PASO 6 — Actualizar index.html

Agrega el SDK de Supabase ANTES del script data.js.
Abre index.html y reemplaza las 3 últimas líneas de scripts:

ANTES:
   <script src="data.js"></script>
   <script src="ui.js"></script>
   <script src="app.js"></script>

DESPUÉS:
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   <script src="data.js"></script>
   <script src="ui.js"></script>
   <script src="app.js"></script>


## PASO 7 — Actualizar app.js (4 cambios pequeños)

El login y logout ahora son async. Busca estas funciones y reemplázalas:

### doLogin()
ANTES:
  const user = DB.findUserByCredentials(username, password);
  if (!user) { ... }
  State.currentUser = { ...user };
  ...
  renderDash();

DESPUÉS:
  mostrarLoading(true);
  const user = await DB.findUserByCredentials(username, password);
  mostrarLoading(false);
  if (!user) { ... }
  State.currentUser = { ...user };
  await cargarTodosLosDatos();   ← NUEVA LÍNEA
  ...
  renderDash();

### doLogout()
Agrega al inicio:
  await DB.doLogoutDB();

### Todas las funciones guardar*, crear*, actualizar*, eliminar*
Agrega "await" antes de cada llamada a DB:

  ANTES:  DB.crearEquipo(datos);
  DESPUÉS: await DB.crearEquipo(datos);

  ANTES:  DB.actualizarEvento(id, datos);
  DESPUÉS: await DB.actualizarEvento(id, datos);

  (y así con todas las demás)


## PASO 8 — Agregar indicador de carga

En index.html, dentro del <body>, agrega esto al principio:

  <div id="loading-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);
    z-index:9999;display:none;align-items:center;justify-content:center;flex-direction:column;gap:12px">
    <div style="width:40px;height:40px;border:3px solid rgba(212,160,23,.3);border-top-color:var(--accent);
      border-radius:50%;animation:spin 1s linear infinite"></div>
    <div style="color:var(--accent-t);font-size:13px;font-weight:500">Cargando datos...</div>
  </div>

En app.js agrega esta función:

  function mostrarLoading(visible) {
    const el = document.getElementById('loading-overlay');
    el.style.display = visible ? 'flex' : 'none';
  }

Y en styles.css agrega:
  @keyframes spin { to { transform: rotate(360deg); } }


## PASO 9 — Probar localmente

Abre index.html en el navegador (doble clic o arrastra a Chrome).
Intenta hacer login con admin@ivc.co / Admin2024!

Si ves los datos de prueba → todo funciona ✅
Si ves error en consola → revisa la URL y la API key en data.js


## PASO 10 — Publicar en Netlify

1. Ve a netlify.com → Log in
2. Clic en "Add new site" → "Deploy manually"
3. Arrastra la carpeta ivc_app completa al área de drop
4. En segundos tendrás una URL tipo: https://amazing-banach-123.netlify.app
5. Desde Site settings → Domain management puedes agregar un dominio personalizado


## RESUMEN DE ARCHIVOS FINALES

ivc_app/
├── index.html          ← HTML principal (modificado en paso 6)
├── styles.css          ← Estilos sin cambios
├── data.js             ← Antes era data_supabase.js (paso 5)
├── ui.js               ← Sin cambios
└── app.js              ← Con los await agregados (paso 7)
