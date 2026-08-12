// Andrea Top Nutrition — navegación, modal de inscripción y FAQ
// Todo el flujo de conversión pasa por WhatsApp: no hay backend, no hay carrito.

const WHATSAPP_NUMBER = '56945925331'; // Teléfono real de Andrea (Chile)
const FREE_PROTOCOL_PLAN_NAME = 'Protocolo de Desinflamación Express 72h (GRATIS)';

// Nombre exacto (el que usan los onclick="openModal(...)") → code de la tabla `plans` en Supabase
const PLAN_CODES = {
  'Reset Metabólico 7 Días': 'reset-7d',
  'Transformación Integral (45 Días)': 'perdida-peso',
  'Vitalidad Constante (90 Días)': 'recomposicion',
  [FREE_PROTOCOL_PLAN_NAME]: 'protocolo-gratis',
};

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

// Menú móvil (algunas páginas, como diagnostico.html/resultado.html, no lo tienen)
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
}

function openModal(planName) {
  isWaitlistMode = false;
  showModalFormView();
  document.getElementById('modal-heading').textContent = 'Quiero Inscribirme';
  document.getElementById('modal-submit-btn').textContent = 'Confirmar y Continuar a WhatsApp';
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

  registerOrder({ plan, nombre: name, email, whatsapp, isWaitlist: wasWaitlist });
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
