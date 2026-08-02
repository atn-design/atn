// Team Top Nutrition — navegación, modal de inscripción y FAQ
// Todo el flujo de conversión pasa por WhatsApp: no hay backend, no hay carrito.

const WHATSAPP_NUMBER = '56945925331'; // Teléfono real de Andrea (Chile)
const FREE_PROTOCOL_PLAN_NAME = 'Protocolo de Desinflamación Express 72h (GRATIS)';
const EBOOK_RESET_72H_URL = 'ebook.html'; // página propia con el diseño de Canva incrustado

// Nombre exacto (el que usan los onclick="openModal(...)") → code de la tabla `plans` en Supabase
const PLAN_CODES = {
  'Reset Metabólico 7 Días': 'reset-7d',
  'Transformación Integral (45 Días)': 'perdida-peso',
  'Vitalidad Constante y Autonomía (90 Días)': 'recomposicion',
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

function openModal(planName) {
  isWaitlistMode = false;
  document.getElementById('modal-heading').textContent = 'Quiero Inscribirme';
  document.getElementById('modal-submit-btn').textContent = 'Confirmar y Continuar a WhatsApp';
  document.getElementById('modal-plan-title').textContent = planName;
  document.getElementById('checkout-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function openWaitlistModal(planName) {
  isWaitlistMode = true;
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

function handleFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const plan = document.getElementById('modal-plan-title').textContent;
  const name = form.querySelector('[name="nombre"]').value.trim();
  const email = form.querySelector('[name="email"]').value.trim();
  const whatsapp = form.querySelector('[name="whatsapp"]').value.trim();
  const isFreeProtocol = plan === FREE_PROTOCOL_PLAN_NAME;
  const wasWaitlist = isWaitlistMode;

  let message;
  if (wasWaitlist) {
    message = `Hola Andrea, soy ${name}. Quiero que me avises cuando esté disponible: ${plan}.`;
  } else if (isFreeProtocol) {
    message = `Hola Andrea, soy ${name}. Ya recibí mi Protocolo de Desinflamación Express (72h) desde la página, ¡gracias!`;
  } else {
    message = `Hola Andrea, soy ${name}. Quiero información para inscribirme en: ${plan}`;
  }

  registerOrder({ plan, nombre: name, email, whatsapp, isWaitlist: wasWaitlist });

  closeModal();
  form.reset();

  if (isFreeProtocol) {
    // Entrega instantánea del ebook (no hay backend/email automático: se abre directo)
    window.open(EBOOK_RESET_72H_URL, '_blank');
  }
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
