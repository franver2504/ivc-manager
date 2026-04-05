# CLAUDE.md — IVC Manager Pro

## Proyecto
App web de gestión para IVC Producciones (empresa audiovisual, Cartagena, Colombia).
Maneja inventario de equipos, eventos, personal, clientes, cotizaciones y trazabilidad.
Frontend vanilla (HTML + CSS + JS). Backend: Supabase (PostgreSQL + Auth).

## URLs importantes
- **App en producción:** https://lighthearted-torte-16ed1c.netlify.app
- **Repositorio GitHub:** https://github.com/franver2504/ivc-manager
- **Supabase proyecto:** https://spbsqkulwfnfdejaeyes.supabase.co

## Arquitectura de archivos
```
ivc_app/
├── índice.html         ← HTML principal (con acento en la i)
├── styles.css          ← Estilos — Design System "Industrial Architect"
├── data.js             ← Capa de datos Supabase (activo)
├── data_supabase.js    ← Respaldo original de data.js
├── ui.js               ← Componentes de UI reutilizables
├── app.js              ← Lógica principal, navegación, renderizado
├── netlify.toml        ← Redirección de / a /índice.html
└── supabase_tablas.sql ← Schema de BD (solo para referencia)
```

## Design System — Industrial Architect
- **Fondo:** #0e0e0e | **Superficies:** #131313 → #1c1b1b → #201f1f → #2a2a2a
- **Dorado:** #f2c732 / #d4ac0d
- **Títulos:** Space Grotesk | **Cuerpo:** Inter
- **Bordes:** ghost borders rgba(77,70,52,0.2)
- **Login:** imagen industrial + glassmorphism

## Reglas de código
- Comentarios en español, código en inglés
- app.js nunca accede a localStorage — siempre usa DB.*
- Todas las llamadas a DB son async/await
- No usar var. Solo const y let

## Base de datos — Tablas Supabase
- equipos: id, nombre, cat, cant, estado, tarifa, serial, notas, mant_fecha, mant_notas
- personal: id, nombre, cargo, tel, email, esp, estado
- clientes: id, nombre, empresa, tel, email, ciudad, tipo, notas
- eventos: id, nombre, cliente, inicio, fin, estado, equipos_cant(JSONB), personal_ids(JSONB), notas, retornado
- cotizaciones: id, nombre, cliente, fecha, dias, equipos_cant(JSONB), descuento, estado, obs, total
- trazabilidad: id, fecha, tipo, eq_id, eq_nombre, cant, evento_nombre, usuario, notas
- perfiles: id(UUID), nombre, user_name, rol, ini

## RLS habilitado en todas las tablas
Política: authenticated USING (true) WITH CHECK (true)

## Credenciales
admin@ivc.co / Admin2024! → admin
supervisor@ivc.co / Sup2024! → operador
luismtz@ivc.co / Luis2024! → tecnico

## UUIDs Supabase Auth
admin@ivc.co      → a1787521-d465-4947-b00a-c5efe36ea3d4
luismtz@ivc.co    → d0f8a7fe-f6b6-4155-8894-d281b128db07
supervisor@ivc.co → ad12a886-52da-4230-801a-a84b24a98141

## Supabase config en data.js
SUPABASE_URL = 'https://spbsqkulwfnfdejaeyes.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' (anon key completa en data.js)

## Problemas conocidos
- Netlify 404: netlify.toml redirige / a /índice.html
- Netlify límite gratuito: crear nuevo sitio con drag & drop
- Chrome traductor: desactivar — rompe el JS
- exportarExcel(): usa String(v) en todos los campos
- doLogin(): es async

## Restricciones
- No acceder a localStorage en app.js
- No olvidar await en DB.*
- No cambiar nombre índice.html
- No renombrar styles.css

## Negocio
- Cartagena, Colombia. Fechas es-CO. Tarifas en COP
- total cotización = suma(tarifa × cant) × dias × (1 - descuento/100)
- equipos_cant en eventos: [{id, cant}]
- trazabilidad: salida | retorno | mantenimiento | mant_ok
