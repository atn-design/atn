// Andrea Top Nutrition — página de resultado del Diagnóstico Vitalidad 360
// Lee ?plan= (calculado por js/diagnostico.js) y muestra el bloque correspondiente.
// Reutiliza openModal()/buildWaLink() de main.js. Si viene ?email=, precarga el campo del modal.

const RESULT_PLANS = {
  'reset-7d': {
    badge: 'Tu punto de partida recomendado',
    title: 'Reset Metabólico (7 Días)',
    desc: 'Tu diagnóstico muestra síntomas de inflamación, poca energía y agenda muy saturada. Antes de cualquier otra cosa, tu cuerpo necesita un respiro real: 7 días para desinflamarte, recuperar energía y preparar el terreno para lo que sigue.',
    img: 'assets/img/reset-7d.jpg',
    modalPlan: 'Reset Metabólico 7 Días',
  },
  'perdida-peso': {
    badge: 'Tu punto de partida recomendado · Próximamente',
    title: 'Transformación Integral (45 Días)',
    desc: 'Tu diagnóstico muestra que ya tienes cierto margen de actividad, pero el objetivo ahora es integrar hábitos que se sostengan: quemar grasa sin pasar hambre ni perder masa muscular. Este programa está diseñado exactamente para eso — y está por lanzarse. Anótate y te avisamos apenas esté disponible.',
    img: 'assets/img/andrea-squat.jpg',
    modalPlan: 'Transformación Integral (45 Días)',
    comingSoon: true,
  },
  recomposicion: {
    badge: 'Tu punto de partida recomendado · Próximamente',
    title: 'Vitalidad Constante (90 Días)',
    desc: 'Tu diagnóstico muestra que ya tienes una base activa y buenos hábitos. Ahora toca consolidar tu vitalidad a largo plazo, eliminar el efecto rebote para siempre y abrir la puerta a tu independencia — este programa está por lanzarse. Anótate y te avisamos apenas esté disponible.',
    img: 'assets/img/abdomen.jpg',
    modalPlan: 'Vitalidad Constante (90 Días)',
    comingSoon: true,
  },
};

function renderResultado() {
  const params = new URLSearchParams(window.location.search);
  const planKey = params.get('plan');
  const plan = RESULT_PLANS[planKey];

  const genericBlock = document.getElementById('resultado-generico');
  const planBlock = document.getElementById('resultado-plan');
  const reset7dBlock = document.getElementById('resultado-reset7d');
  const fuxionBox = document.getElementById('resultado-fuxion-box');

  const email = params.get('email');
  if (email) {
    const emailInput = document.querySelector('#checkout-modal input[name="email"]');
    if (emailInput) emailInput.value = email;
  }

  // Reset 7D tiene su propia página de ventas completa (calculadora, testimonios, FuXion, FAQ)
  // en vez del bloque genérico usado por los otros 2 planes.
  if (planKey === 'reset-7d') {
    reset7dBlock.classList.remove('hidden');
    planBlock.classList.add('hidden');
    genericBlock.classList.add('hidden');
    fuxionBox.classList.remove('hidden');
    return;
  }

  reset7dBlock.classList.add('hidden');

  if (!plan) {
    genericBlock.classList.remove('hidden');
    planBlock.classList.add('hidden');
    fuxionBox.classList.add('hidden');
    return;
  }

  document.getElementById('resultado-badge').textContent = plan.badge;
  document.getElementById('resultado-title').textContent = plan.title;
  document.getElementById('resultado-desc').textContent = plan.desc;
  document.getElementById('resultado-img').src = plan.img;
  document.getElementById('resultado-img').alt = plan.title;

  if (plan.comingSoon) {
    document.getElementById('resultado-cta-label').textContent = 'Avísame al Lanzamiento';
    document.getElementById('resultado-cta').setAttribute('onclick', `openWaitlistModal('${plan.modalPlan}')`);
  } else {
    document.getElementById('resultado-cta-label').textContent = 'Quiero Inscribirme';
    document.getElementById('resultado-cta').setAttribute('onclick', `openModal('${plan.modalPlan}')`);
  }

  planBlock.classList.remove('hidden');
  genericBlock.classList.add('hidden');
  fuxionBox.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', renderResultado);
