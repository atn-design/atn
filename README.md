# Andrea Top Nutrition — Landing Page

Landing page estática (HTML/CSS/JS, sin build) para la marca de Andrea. Todo el flujo de conversión sigue terminando en WhatsApp, pero desde la Fase 1 del backend (ver sección dedicada abajo) cada lead/orden también queda registrado en una base de datos real (Supabase), visible en un panel propio (`admin.html`).

**En vivo:** https://atn-design.github.io/atn/
**Panel de clientes:** https://atn-design.github.io/atn/admin.html
**Repositorio:** https://github.com/atn-design/atn

## Cómo verla localmente

Simplemente abre `index.html` en el navegador, o para probar con un servidor local (recomendado para que las rutas de imágenes se comporten igual que en producción):

```bash
npx serve .
# o
python -m http.server 5500
```

## Estructura

```
team-top-nutrition/
├── index.html                       # landing principal
├── diagnostico.html                  # quiz nativo de 6 preguntas con puntaje → resultado instantáneo
├── resultado.html                     # resultado personalizado según ?plan= (reset-7d | perdida-peso | recomposicion)
├── admin.html                         # panel protegido para Andrea: clientes/órdenes (Fase 1 backend)
├── css/styles.css                     # estilos complementarios a Tailwind (CDN)
├── js/main.js                         # nav, modal de inscripción, WhatsApp, FAQ (compartido por las 3 páginas públicas)
├── js/diagnostico.js                   # preguntas, puntajes y lógica del quiz nativo
├── js/resultado.js                     # lógica de resultado.html (lee ?plan= y ?email=, rellena el contenido)
├── js/admin.js                         # login (Supabase Auth) + tabla del panel admin
├── js/supabase-config.js               # URL/anon key de Supabase (placeholders — ver setup abajo)
├── supabase/schema.sql                 # esquema de base de datos + RLS, correr una vez en Supabase
├── supabase/functions/create-order/    # Edge Function: registra cliente + orden (Fase 1, sin pagos aún)
├── assets/img/                         # fotos reales de Andrea, testimonios, logos
└── assets/video/                       # video de fondo del hero
```

El frontend sigue sin paso de build: Tailwind se carga vía CDN (`cdn.tailwindcss.com`), igual que Google Fonts y FontAwesome. Se puede hostear en cualquier estático (Netlify, GitHub Pages, Cloudflare Pages) — **evitar el plan gratuito de Vercel**, cuyos términos de servicio prohíben explícitamente procesar pagos de visitantes en el tier Hobby (relevante porque este sitio ya apunta a eso en las Fases 2/3). El backend (Supabase) es la única pieza no estática, y vive fuera de este hosting.

## Pendientes antes de publicar

1. **Dato médico sensible.** Por pedido explícito, la sección "Sobre Mí" solo menciona en términos generales "un reto de salud familiar difícil", sin especificar el diagnóstico del hijo de Andrea. No cambiar esto sin confirmación directa de Andrea.
2. **Testimonios.** 3 de los 4 ya tienen nombre/edad/país reales (Karina, Alexander, Pauli — tomados del propio material de Andrea en Canva). El 4to (captura de Instagram de 5 días) sigue sin atribución real; reemplazar en `index.html` (sección `#testimonios`) si Andrea la consigue.
3. **Dominio y SEO.** Antes de publicar, agregar `og:url` y `og:image` con la URL final del dominio, y validar cómo se ve el link compartido (ej. con la vista previa de WhatsApp/Facebook).
4. **Video de fondo del hero.** `assets/video/hero-bg.mp4` es un clip stock genérico (mujer haciendo sentadillas con mancuernas) descargado de Mixkit bajo su "Stock Video Free License" (uso comercial permitido, sin atribución requerida — [ver clip original](https://mixkit.co/free-stock-video/a-young-woman-wearing-a-black-snugly-outfit-is-on-52111/)). Es un placeholder de marca genérico, no es Andrea. Si más adelante Andrea graba su propio video, reemplazar este archivo manteniendo el mismo nombre.
5. **Backend (Fase 1) sin configurar todavía (ver sección dedicada abajo).** El código ya registra cada lead/orden en Supabase, pero `js/supabase-config.js` tiene placeholders — hasta que no se cree el proyecto real y se peguen las credenciales, el registro falla en silencio (el flujo de WhatsApp/ebook sigue funcionando igual, simplemente no queda nada guardado).
6. **Precios de los 3 programas sin definir.** `supabase/schema.sql` inserta los 4 planes con `price_clp`/`price_usd` en `null` — Andrea todavía no definió precios. No bloquea la Fase 1 (no hay cobro todavía), pero hace falta antes de las Fases 2/3 (pagos).

## Embudo de diagnóstico

El diagnóstico con puntaje (antes la 2da encuesta de Tally) ahora es **nativo e instantáneo**, para poder cerrar la venta en el momento en vez de esperar un seguimiento manual de 48h. La captura gratuita de Tally se mantiene, pero como oferta de respaldo ("plan B"), no como primer paso.

1. **`index.html` sección `#diagnostico-cta`** (justo antes de `#programas`) — CTA compacto que lleva a `diagnostico.html`.
2. **`diagnostico.html`** — quiz nativo (`js/diagnostico.js`), un paso a la vez con barra de progreso:
   - Paso 0 — filtro de caso especial: "¿tienes alguna condición de salud que debamos conocer (embarazo, alergias, enfermedad)?". Si responde que sí, se salta todo el puntaje y se muestra un bloque dedicado con CTA directo a WhatsApp para que Andrea lo revise personalmente — nunca se le asigna un plan automático.
   - Paso 1 — perfil/rol (mamá, profesional, emprendedora, deportista): solo para contexto, no puntúa.
   - Pasos 2–5 — las 4 preguntas puntuadas (síntoma, actividad física, alimentación, tiempo disponible), con los puntajes reales que Andrea ya tenía configurados en Tally (ver tabla abajo).
   - Paso final — correo opcional, luego calcula el puntaje total y redirige a `resultado.html?plan=...&email=...`.
3. **`resultado.html?plan=...`** — resultado personalizado + CTA de WhatsApp para inscribirse (reutiliza el modal existente; si venía `?email=`, se precarga en el formulario). Debajo del resultado hay un upsell de FuXion (link real a la tienda).
4. **Oferta "plan B" (Protocolo Gratis 72h)** — al final de `index.html` (justo después del promo de FuXion en `#programas`), para quien no cierra la compra de un programa. Es 100% nativa (ya no usa Tally): abre el mismo modal de inscripción (`openModal('Protocolo de Desinflamación Express 72h (GRATIS)')`), y al enviarlo, `js/main.js` abre directo el [ebook](ebook.html) (página propia con el diseño de Canva incrustado) en una pestaña nueva (entrega instantánea) además del WhatsApp de siempre. Debajo del botón hay un link de respaldo por si el navegador bloquea la pestaña nueva.

### Mapeo de puntaje (rango 2–10, confirmado con Andrea sobre la configuración original de Tally)

| Puntaje total | Plan recomendado | `resultado.html?plan=` |
|---|---|---|
| ≤ 4 | Vitalidad Constante (90 Días) | `recomposicion` |
| 5–7 | Transformación Integral (45 Días) | `perdida-peso` |
| ≥ 8 | Reset Metabólico 7 Días | `reset-7d` |

Las 4 preguntas puntuadas y su detalle de puntaje exacto están documentadas como comentarios/datos en `js/diagnostico.js` (arreglo `STEPS`).

### Decisiones y pendientes

- **No se incluyó la pregunta de "ubicación/stock" (Chile) que tenía la encuesta original de Tally** (Bloque 5, "¿Dónde te encuentras para verificar disponibilidad de stock?") porque no aporta al puntaje y era específica de logística regional. Si Andrea la quiere de vuelta (ej. para segmentar leads por país), se puede agregar como paso adicional sin afectar el cálculo del plan.
- **Sin persistencia de leads en el diagnóstico nativo.** El correo capturado en el último paso de `diagnostico.html` solo se usa para precargar el formulario de WhatsApp en `resultado.html` — no se guarda en ningún lado (el sitio sigue siendo 100% estático, sin backend).
- **Ya no se usa Tally en ningún lado del sitio.** Tanto la captura del Protocolo Gratis como el diagnóstico son 100% nativos ahora (ver decisión abajo). Los IDs de Tally (`jaGXlR`, `QK8pOG`) quedaron solo como referencia histórica en este README, no se usan en el código.

## Ebook Reset 72h y captura de leads: decisión final (nativo, sin Tally)

Inicialmente la captura del Protocolo Gratis 72h usaba un popup de Tally (para guardar leads en una base de datos y
mandar el ebook por correo automáticamente). El usuario decidió priorizar la consistencia visual con el resto del sitio
(el popup de Tally se veía blanco/desalineado del tema oscuro+amarillo) sobre esas dos capacidades, así que ahora:

- El botón "Quiero mi Protocolo Gratis" (al final de `index.html`) abre el mismo modal nativo de inscripción que usan los programas.
- Al enviarlo, `js/main.js` (`handleFormSubmit`) abre directamente el [ebook](ebook.html) (página propia con el diseño de Canva incrustado) en una pestaña nueva — entrega instantánea, sin depender de un correo automático — y además abre WhatsApp como con cualquier otro plan.
- **Actualización:** esto ya NO pierde el registro del lead. Desde la Fase 1 del backend (ver sección siguiente), `handleFormSubmit` también llama a la Edge Function `create-order`, que guarda el cliente y la orden en Supabase — visible en `admin.html`. Antes de configurar Supabase (ver setup abajo), esa llamada falla en silencio y el comportamiento es el mismo de antes (nada se guarda, pero WhatsApp/ebook igual funcionan).

## Backend (Fase 1): base de datos de clientes, sin pagos todavía

Arquitectura elegida: **Supabase** (Postgres + Auth + Edge Functions) como única pieza de backend. El frontend sigue siendo estático; Supabase vive aparte y se llama por HTTPS. Se descartó Firebase (su plan gratis bloquea llamadas salientes a APIs externas como Flow/PayPal, necesarias en las Fases 2/3) y un servidor propio (demasiado mantenimiento para alguien no técnico).

### Qué hace hoy (Fase 1)

- Cada vez que alguien envía el modal de inscripción (cualquiera de los 3 programas o el Protocolo Gratis), `js/main.js` llama a la Edge Function `create-order`, que:
  1. Hace upsert del cliente en la tabla `customers` (usando el WhatsApp como clave única — mismo número, mismo cliente).
  2. Inserta una fila en `orders` con el plan elegido. El Protocolo Gratis queda `status='paid'` de inmediato (es gratis); Reset Metabólico queda `status='pending'` (todavía no hay pasarela conectada); Pérdida de Peso y Recomposición (marcados "Próximamente") quedan `status='waitlist'`.
- Esta llamada **nunca bloquea ni rompe el flujo de WhatsApp**: se hace sin esperar su resultado (fire-and-forget) y cualquier error se ignora silenciosamente (solo se loguea en la consola del navegador para depurar).
- `admin.html` es un panel protegido por login (Supabase Auth) donde Andrea ve la lista de clientes/órdenes con su estado, filtrable por estado (incluye "Lista de espera").

### "Próximamente" (Transformación Integral 45D y Vitalidad Constante 90D)

Estos 2 programas todavía no están lanzados. Sus tarjetas en `#programas` (`index.html`) muestran un badge "Próximamente" y su botón ("Avísame al Lanzamiento") abre el mismo modal de inscripción pero en **modo lista de espera** (`openWaitlistModal()` en `js/main.js`): cambia el título del modal, el mensaje de WhatsApp ("quiero que me avises cuando esté disponible") y la orden se guarda con `status='waitlist'` en vez de `pending`. Lo mismo aplica si el diagnóstico (`diagnostico.html`) recomienda uno de estos 2 planes — `resultado.html` también muestra el tratamiento de "Próximamente" (`js/resultado.js`, flag `comingSoon`). El Reset Metabólico 7 Días es, por ahora, el único programa con inscripción real.

### Setup (una sola vez, hace falta antes de que esto funcione de verdad)

1. **Crear el proyecto en Supabase.** Ir a [supabase.com](https://supabase.com), crear cuenta gratis, "New project". Guardar la contraseña de la base de datos en un lugar seguro.
2. **Correr el esquema.** En el panel de Supabase → SQL Editor → pegar todo el contenido de `supabase/schema.sql` → Run. Esto crea las 4 tablas, las políticas de seguridad (RLS), y los 4 planes conocidos (con precios en `null` — completar cuando Andrea los defina, con un `update plans set price_clp = ..., price_usd = ... where code = '...'`).
3. **Copiar las credenciales del proyecto.** Supabase → Project Settings → API: copiar el "Project URL" y la "anon public key". Pegarlos en `js/supabase-config.js` reemplazando los placeholders (`SUPABASE_URL`, `SUPABASE_ANON_KEY`). **Nunca** pegar ahí la "service_role key" (esa es secreta, solo la usa la Edge Function del lado del servidor).
4. **Instalar la Supabase CLI y desplegar la Edge Function** (requiere Node.js instalado):
   ```bash
   npm install -g supabase
   supabase login --token TU-ACCESS-TOKEN   # generado en supabase.com/dashboard/account/tokens
   supabase link --project-ref TU-PROJECT-REF   # el "ref" está en la URL del proyecto (la parte antes de .supabase.co)
   supabase functions deploy create-order
   ```
   **No hace falta** correr `supabase secrets set` para `SUPABASE_URL` ni `SUPABASE_SERVICE_ROLE_KEY` — Supabase los inyecta automáticamente en toda Edge Function del proyecto (esos nombres están reservados; la CLI rechaza configurarlos a mano).
5. **Crear el login de Andrea.** Supabase → Authentication → Users → "Add user" (email + contraseña). Con eso ya puede entrar a `admin.html`.
6. **Probar:** llenar el modal de inscripción en el sitio (local o desplegado), y confirmar en Supabase → Table Editor → `orders` que apareció la fila. Luego entrar a `admin.html` con el login de Andrea y confirmar que se ve en la tabla.

✅ **Confirmado funcionando end-to-end** (probado con `curl` directo contra la Edge Function desplegada): se crea el cliente y la orden correctamente en Supabase.

### Qué sigue (Fases 2 y 3, no incluidas todavía)

- **Fase 2 — PayPal (pagos en USD):** requiere que el usuario cree la cuenta PayPal Business (Chile) primero. Se extiende `create-order` para generar el link de pago (PayPal Orders API) y se agrega un webhook que marca la orden como `paid` cuando PayPal confirma.
- **Fase 3 — Flow.cl (pagos en CLP):** mismo patrón, requiere la cuenta Flow verificada (persona natural, sin necesidad de empresa formalizada para empezar). Ver `.claude/plans` de esta sesión para el detalle completo de ambas fases si se retoma más adelante.
- Antes de cualquiera de las dos fases, confirmar con un contador si aplica el requisito de "inicio de actividades" (SII, Ley 21.713) para la pasarela elegida.
