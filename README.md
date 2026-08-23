# Andrea Top Nutrition — Landing Page

Landing page estática (HTML/CSS/JS, sin build) para la marca de Andrea. El flujo de conversión termina en un **pago real con PayPal** (Fase 2, activa en modo Sandbox) para todos los planes pagos; WhatsApp queda para onboarding post-pago y consultas generales. Cada lead/orden queda registrado en una base de datos real (Supabase), visible en un panel propio (`admin.html`).

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
├── index.html                              # landing principal (única página pública con flujo de venta)
├── ebook.html                               # página propia del Protocolo Gratis 72h (diseño de Canva incrustado)
├── admin.html                                # panel protegido para Andrea: clientes/órdenes
├── css/styles.css                            # estilos complementarios a Tailwind (CDN)
├── js/main.js                                # nav, modal de inscripción, botón de PayPal, FAQ
├── js/admin.js                                # login (Supabase Auth) + tabla del panel admin
├── js/supabase-config.js                      # URL/anon key de Supabase + URLs de las Edge Functions
├── supabase/schema.sql                        # esquema de base de datos + RLS, correr una vez en Supabase
├── supabase/functions/create-order/           # Edge Function: registra cliente + orden (Protocolo Gratis)
├── supabase/functions/paypal-create-order/    # Edge Function: crea la orden en Supabase + en PayPal
├── supabase/functions/paypal-capture-order/   # Edge Function: captura el pago y manda los correos
├── assets/img/                                # fotos reales de Andrea, testimonios, logos
└── assets/video/                              # video del hero y de la sección de Evaluación 1 a 1
```

El frontend sigue sin paso de build: Tailwind se carga vía CDN (`cdn.tailwindcss.com`), igual que Google Fonts y FontAwesome. Se puede hostear en cualquier estático (Netlify, GitHub Pages, Cloudflare Pages) — **evitar el plan gratuito de Vercel**, cuyos términos de servicio prohíben explícitamente procesar pagos de visitantes en el tier Hobby. El backend (Supabase) es la única pieza no estática, y vive fuera de este hosting.

## Pendientes antes de salir a producción real (Live)

1. **Correo de notificaciones — hoy apunta a una cuenta de prueba.** `GMAIL_ADDRESS` / `NOTIFICATION_EMAIL` en `supabase/functions/create-order/index.ts` y `supabase/functions/paypal-capture-order/index.ts` están hardcodeados a `soporte.wattaia@gmail.com` (cuenta usada mientras se probaba el flujo de pagos). **Cambiar a la cuenta real de Andrea antes de salir en vivo**, y volver a desplegar ambas funciones (`supabase functions deploy create-order` y `... paypal-capture-order`).
2. **PayPal — credenciales de Sandbox/cuenta de prueba.** Los secrets `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_MODE` (ver sección PayPal abajo) son de una cuenta de prueba usada para desarrollar el flujo, no de Andrea. **Antes de cobrar de verdad:** crear/usar la cuenta PayPal Business de Andrea, sacar las credenciales **Live** desde developer.paypal.com, y reemplazar los secrets (`supabase secrets set PAYPAL_CLIENT_ID=... PAYPAL_CLIENT_SECRET=... PAYPAL_MODE=live`). También actualizar el `client-id` del `<script>` del SDK de PayPal en `index.html` (es público, no secreto, pero tiene que ser el de Live).
3. **Dato médico sensible.** Por pedido explícito, la sección "Sobre Mí" solo menciona en términos generales "un reto de salud familiar difícil", sin especificar el diagnóstico del hijo de Andrea. No cambiar esto sin confirmación directa de Andrea.
4. **Testimonios.** 3 de los 4 ya tienen nombre/edad/país reales (Karina, Alexander, Pauli — tomados del propio material de Andrea en Canva). El 4to (captura de Instagram de 5 días) sigue sin atribución real; reemplazar en `index.html` (sección `#testimonios`) si Andrea la consigue.
5. **Dominio y SEO.** Antes de publicar con dominio propio, agregar `og:url` con la URL final y validar cómo se ve el link compartido (ej. vista previa de WhatsApp/Facebook).
6. **Video del hero — confirmar si es material real de Andrea.** `assets/video/hero-bg.mp4` se reemplazó por un archivo (`Persona_haciendo_sentadillas.mp4`) provisto directamente por el usuario. Queda pendiente confirmar si es Andrea o sigue siendo un placeholder genérico, para dejar la atribución correcta.
7. **Supabase en plan gratis, se pausa solo** (ver "Mantenimiento" más abajo). Subir a **Pro** antes de cobrar en serio, para que nunca se pause a mitad de una compra.

## Backend: clientes + pagos con PayPal

Arquitectura elegida: **Supabase** (Postgres + Auth + Edge Functions) como única pieza de backend. El frontend sigue siendo estático; Supabase vive aparte y se llama por HTTPS. Se descartó Firebase (su plan gratis bloquea llamadas salientes a APIs externas como PayPal) y un servidor propio (demasiado mantenimiento para alguien no técnico).

### Qué hace hoy

- **Protocolo Gratis 72h**: el modal llama a la Edge Function `create-order`, que hace upsert del cliente en `customers` y crea una fila en `orders` con `status='paid'` (es gratis) — y manda el ebook por correo automáticamente.
- **Los 5 planes pagos** (Reset Metabólico, Transformación Integral, Vitalidad Constante, el Combo Transforma+Consolida, y la Evaluación Metabólica Estratégica): el modal llama a `paypal-create-order`, que crea el cliente/orden en Supabase (`status='pending'`, `payment_provider='paypal'`) **y** la orden equivalente en PayPal (Orders API v2, precio tomado del servidor — nunca del navegador). El botón de PayPal se renderiza en el modal con ese `paypal_order_id`; cuando el comprador aprueba, el navegador llama a `paypal-capture-order`, que **captura el pago del lado del servidor**, marca la orden como `status='paid'`, guarda el evento crudo en `payment_events`, y manda **dos correos**: uno a Andrea (venta nueva, con los datos del cliente y el plan) y otro al cliente (confirmación de su pago).
- Ninguna de estas llamadas rompe la página si falla: se loguea en consola y se muestra un aviso de error dentro del modal.
- `admin.html` es un panel protegido por login (Supabase Auth) donde Andrea ve la lista de clientes/órdenes con su estado.
- Ya no existen planes "Próximamente" ni lista de espera — los 5 planes están a la venta.

### Precios actuales (USD, tabla `plans`)

| Plan | Code | Precio |
|---|---|---|
| Reset Metabólico 7 Días | `reset-7d` | $29 |
| Transformación Integral (45 Días) | `perdida-peso` | $59 |
| Vitalidad Constante (90 Días) | `recomposicion` | $39 |
| Combo Transforma + Consolida (+ Reset de regalo) | `combo-t2-t3` | $98 |
| Evaluación Metabólica Estratégica (asesoría 1 a 1) | `evaluacion-1a1` | $49 |
| Protocolo de Desinflamación Express 72h | `protocolo-gratis` | Gratis |

### PayPal (Fase 2 — activa en modo Sandbox)

1. Credenciales sacadas de developer.paypal.com → Apps & Credentials → una app por modo (Sandbox / Live).
2. Guardadas como secrets de las Edge Functions: `supabase secrets set PAYPAL_CLIENT_ID=... PAYPAL_CLIENT_SECRET=... PAYPAL_MODE=sandbox`.
3. El **Client ID** también está hardcodeado en el `<script src="https://www.paypal.com/sdk/js?client-id=...">` de `index.html` — es público por diseño (así funciona el SDK de PayPal en el navegador), pero hay que actualizarlo ahí también al pasar a Live.
4. Para probar: crear cuentas de prueba en developer.paypal.com → Sandbox → Accounts (viene una Business y una Personal por defecto), y usar la Personal como "comprador" al hacer clic en el botón de PayPal del sitio.
5. **Pendiente:** pasar de Sandbox a Live con la cuenta PayPal Business de Andrea (ver "Pendientes" arriba).

### Setup desde cero (si se migra a otro proyecto de Supabase)

1. Crear el proyecto en supabase.com, correr `supabase/schema.sql` completo en el SQL Editor.
2. Copiar `Project URL` / `anon public key` a `js/supabase-config.js`. **Nunca** pegar ahí la `service_role key` (esa es secreta, solo la usan las Edge Functions).
3. `supabase login`, `supabase link --project-ref ...`, y desplegar las 3 funciones:
   ```bash
   supabase functions deploy create-order
   supabase functions deploy paypal-create-order
   supabase functions deploy paypal-capture-order
   ```
4. Configurar los secrets: `GMAIL_APP_PASSWORD` (para los correos) y `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_MODE`.
5. Crear el login de Andrea en Supabase → Authentication → Users, para que pueda entrar a `admin.html`.

✅ **Confirmado funcionando end-to-end**: cliente + orden creados correctamente en Supabase, orden real generada en PayPal Sandbox, correos de notificación disparándose.

### Mantenimiento: el proyecto se pausa solo en el plan gratis

Supabase pausa automáticamente los proyectos del plan **Free** después de ~7 días sin actividad (queda en estado `INACTIVE`). Mientras está pausado, el sitio sigue andando pero **nada se guarda ni se cobra**: las Edge Functions fallan. Esto se soluciona con **Upgrade a Pro** (USD $25/mes, elimina la pausa) — recomendado antes de cobrar de verdad.

Mientras se siga en el plan gratis, evitar la pausa a mano:

1. Cada **6 días** (poner recordatorio recurrente en el calendario), entrar a supabase.com/dashboard → el proyecto → **SQL Editor**.
2. Escribir `select 1;` → **Run**. Cualquier consulta real a la base de datos cuenta como actividad y reinicia el contador de 7 días.

Si el proyecto ya está pausado, en la misma pantalla aparece el botón **"Resume project"** (no "Restore") para reactivarlo — tarda 1-2 minutos.

### Qué sigue (Fase 3, no incluida todavía)

- **Flow.cl (pagos en CLP):** mismo patrón que PayPal, requiere la cuenta Flow verificada (persona natural, sin necesidad de empresa formalizada para empezar).
- Antes de salir a Live con cualquier pasarela, confirmar con un contador si aplica el requisito de "inicio de actividades" (SII, Ley 21.713).

## Ebook Reset 72h y captura de leads (Protocolo Gratis)

- El botón "Quiero mi Protocolo Gratis" (al final de `index.html`) abre el mismo modal nativo de inscripción que usan los programas.
- Al enviarlo, `js/main.js` (`handleFormSubmit`) abre directamente el [ebook](ebook.html) (página propia con el diseño de Canva incrustado) en una pestaña nueva — entrega instantánea — y llama a `create-order` para dejar registrado el lead en Supabase.
