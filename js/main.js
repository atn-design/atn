// Andrea Top Nutrition — navegación, modal de inscripción y FAQ
// Todo el flujo de conversión pasa por WhatsApp: no hay backend, no hay carrito.

const WHATSAPP_NUMBER = '56945925331'; // Teléfono real de Andrea (Chile)
const FREE_PROTOCOL_PLAN_NAME = 'Protocolo de Desinflamación Express 72h (GRATIS)';

// Nombre exacto (el que usan los onclick="openModal(...)") → code de la tabla `plans` en Supabase
const PLAN_CODES = {
  'Reset Metabólico 7 Días': 'reset-7d',
  'Transformación Integral (45 Días)': 'perdida-peso',
  'Vitalidad Constante (90 Días)': 'recomposicion',
  'Combo Transforma + Consolida (Reset 7D de regalo)': 'combo-t2-t3',
  'Evaluación Metabólica Estratégica': 'evaluacion-1a1',
  [FREE_PROTOCOL_PLAN_NAME]: 'protocolo-gratis',
};

// Planes con pago real vía PayPal (Fase 2, Sandbox). Todos los planes pagos van directo
// al pago; solo el Protocolo Gratis (correo) y los planes "Próximamente" (lista de espera,
// si volviera a haber alguno) quedan fuera de este flujo.
const PAYPAL_PLAN_CODES = new Set(['reset-7d', 'perdida-peso', 'recomposicion', 'combo-t2-t3', 'evaluacion-1a1']);

function buildWaLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// Registra el lead/orden en Supabase (Fase 1: sin pagos todavía).
// Nunca debe bloquear ni romper el flujo de WhatsApp — por eso no se espera (await) su resultado
// antes de continuar, y cualquier error se traga en silencio (solo se loguea para depurar).
function registerOrder({ plan, nombre, email, whatsapp, isWaitlist }) {
  if (typeof CREATE_ORDER_FUNCTION_URL === 'undefined' || SUPABASE_ANON_KEY === 'TU-ANON-KEY-AQUI') {
    return; // Supabase todavía no está configurado (ver js/supabase-config.js) — no hacer nada.
  }
  const planCode = PLAN_CODES[plan];
  if (!planCode) return;

  fetch(CREATE_ORDER_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      nombre,
      email,
      whatsapp,
      plan_code: planCode,
      is_waitlist: !!isWaitlist,
      first_source: planCode === 'protocolo-gratis' ? 'protocolo_gratis' : 'programas_cta',
    }),
  }).catch((err) => console.warn('No se pudo registrar el lead en Supabase:', err));
}

// Crea la orden en Supabase + PayPal (server-side) y devuelve el paypal_order_id
// que el botón de PayPal necesita para completar el pago.
async function createPaypalOrderRemote({ planCode, nombre, email, whatsapp }) {
  const res = await fetch(CREATE_PAYPAL_ORDER_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ nombre, email, whatsapp, plan_code: planCode }),
  });
  const data = await res.json();
  if (!res.ok || !data.paypal_order_id) {
    throw new Error(data.error || 'No se pudo crear la orden de PayPal');
  }
  return data.paypal_order_id;
}

// Confirma en el servidor que PayPal ya capturó el pago (nunca confiar en el navegador para esto).
async function capturePaypalOrderRemote(paypalOrderId) {
  const res = await fetch(CAPTURE_PAYPAL_ORDER_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ paypal_order_id: paypalOrderId }),
  });
  const data = await res.json();
  if (!res.ok || data.status !== 'paid') {
    throw new Error(data.error || 'PayPal no confirmó el pago');
  }
  return data;
}

// Menú móvil (algunas páginas, como ebook.html/admin.html, no lo tienen)
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
if (mobileMenuBtn && mobileMenu) {
  mobileMenuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => mobileMenu.classList.add('hidden'));
  });
}

// Modal de inscripción (reutilizado por los 4 programas y por el Protocolo Gratis 72h).
// También sirve, en "modo lista de espera", para los planes marcados "Próximamente".
let isWaitlistMode = false;

function showModalFormView() {
  document.getElementById('modal-form-view').classList.remove('hidden');
  document.getElementById('modal-success-view').classList.add('hidden');
  resetPaypalSection();
}

// Vuelve a mostrar el formulario y esconde el botón de PayPal (si había uno renderizado
// de un intento anterior) — evita que queden dos botones de PayPal apilados.
function resetPaypalSection() {
  document.getElementById('modal-paypal-section').classList.add('hidden');
  document.getElementById('modal-paypal-error').classList.add('hidden');
  document.getElementById('paypal-button-container').innerHTML = '';
  document.querySelector('#modal-form-view form').classList.remove('hidden');
}

function openModal(planName) {
  isWaitlistMode = false;
  showModalFormView();
  document.getElementById('modal-heading').textContent = 'Quiero Inscribirme';
  document.getElementById('modal-submit-btn').textContent = 'Confirmar y Continuar al Pago';
  document.getElementById('modal-plan-title').textContent = planName;
  document.getElementById('checkout-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function openWaitlistModal(planName) {
  isWaitlistMode = true;
  showModalFormView();
  document.getElementById('modal-heading').textContent = 'Avísame al Lanzamiento';
  document.getElementById('modal-submit-btn').textContent = 'Anotarme en la Lista';
  document.getElementById('modal-plan-title').textContent = planName;
  document.getElementById('checkout-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('checkout-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

function showModalSuccess({ icon, title, desc }) {
  document.getElementById('modal-success-icon').className = `fa-solid ${icon}`;
  document.getElementById('modal-success-title').textContent = title;
  document.getElementById('modal-success-desc').textContent = desc;
  document.getElementById('modal-form-view').classList.add('hidden');
  document.getElementById('modal-success-view').classList.remove('hidden');
}

function handleFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const plan = document.getElementById('modal-plan-title').textContent;
  const name = form.querySelector('[name="nombre"]').value.trim();
  const email = form.querySelector('[name="email"]').value.trim();
  const whatsapp = form.querySelector('[name="whatsapp"]').value.trim();
  const isFreeProtocol = plan === FREE_PROTOCOL_PLAN_NAME;
  const wasWaitlist = isWaitlistMode;
  const planCode = PLAN_CODES[plan];
  const isPaypalPlan = !wasWaitlist && !isFreeProtocol && planCode && PAYPAL_PLAN_CODES.has(planCode);

  // Para los planes de PayPal, la orden se crea del lado del servidor recién al mostrar
  // el botón (createPaypalOrderRemote) — no hay que duplicarla acá con registerOrder.
  if (!isPaypalPlan) {
    registerOrder({ plan, nombre: name, email, whatsapp, isWaitlist: wasWaitlist });
  }
  form.reset();

  if (wasWaitlist) {
    // Sin WhatsApp: solo queda registrada en la lista de espera (status='waitlist' en Supabase).
    showModalSuccess({
      icon: 'fa-bell',
      title: '¡Listo, ya quedaste anotada!',
      desc: 'Serás de las primeras en enterarte apenas esté disponible.',
    });
    return;
  }

  if (isFreeProtocol) {
    // Sin WhatsApp: el ebook se envía automático por correo (Edge Function `create-order`).
    showModalSuccess({
      icon: 'fa-envelope-circle-check',
      title: '¡Revisa tu correo!',
      desc: `Te enviamos tu Protocolo de Desinflamación Express (72h) a ${email}.`,
    });
    return;
  }

  if (isPaypalPlan) {
    // Pago real: se esconde el formulario y se muestra el botón de PayPal para completar el pago.
    document.querySelector('#modal-form-view form').classList.add('hidden');
    const section = document.getElementById('modal-paypal-section');
    const errorEl = document.getElementById('modal-paypal-error');
    section.classList.remove('hidden');
    errorEl.classList.add('hidden');

    let paypalOrderId = null;

    paypal.Buttons({
      style: { color: 'gold', shape: 'rect', label: 'paypal', height: 45 },
      createOrder: async () => {
        try {
          paypalOrderId = await createPaypalOrderRemote({ planCode, nombre: name, email, whatsapp });
          return paypalOrderId;
        } catch (err) {
          console.error('Error creando la orden de PayPal:', err);
          errorEl.classList.remove('hidden');
          throw err;
        }
      },
      onApprove: async () => {
        try {
          await capturePaypalOrderRemote(paypalOrderId);
          showModalSuccess({
            icon: 'fa-circle-check',
            title: '¡Pago confirmado!',
            desc: `Te enviamos la confirmación de ${plan} a ${email || 'tu correo'}. Andrea ya fue notificada y te va a escribir por WhatsApp para arrancar.`,
          });
        } catch (err) {
          console.error('Error capturando el pago de PayPal:', err);
          errorEl.classList.remove('hidden');
        }
      },
      onError: (err) => {
        console.error('Error del botón de PayPal:', err);
        errorEl.classList.remove('hidden');
      },
    }).render('#paypal-button-container');

    return;
  }

  closeModal();
  const message = `Hola Andrea, soy ${name}. Quiero información para inscribirme en: ${plan}`;
  window.open(buildWaLink(message), '_blank');
}

// FAQ acordeón
function toggleFaq(button) {
  const answer = button.nextElementSibling;
  const icon = button.querySelector('i');
  answer.classList.toggle('hidden');
  icon.classList.toggle('rotate-180');
}

// Enlaces WhatsApp fijos del sitio (botón flotante, footer, teaser de equipo)
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-wa-message]').forEach((el) => {
    el.href = buildWaLink(el.getAttribute('data-wa-message'));
  });
});
