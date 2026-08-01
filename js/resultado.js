// Team Top Nutrition — página de resultado del Diagnóstico Vitalidad 360
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
    badge: 'Tu punto de partida recomendado',
    title: 'Pérdida de Peso Acelerada',
    desc: 'Tu diagnóstico muestra que ya tienes cierto margen de actividad, pero el objetivo ahora es bajar grasa de verdad sin pasar hambre ni perder masa muscular. Este programa está diseñado exactamente para eso.',
    img: 'assets/img/andrea-cutout.jpg',
    modalPlan: 'Pérdida de Peso Acelerada',
  },
  recomposicion: {
    badge: 'Tu punto de partida recomendado',
    title: 'Recomposición Corporal',
    desc: 'Tu diagnóstico muestra que ya tienes una base activa y buenos hábitos. Ahora toca tonificar, ganar firmeza y consolidar resultados sin efecto rebote.',
    img: 'assets/img/abdomen.jpg',
    modalPlan: 'Recomposición Corporal',
  },
};

function renderResultado() {
  const params = new URLSearchParams(window.location.search);
  const planKey = params.get('plan');
  const plan = RESULT_PLANS[planKey];

  const genericBlock = document.getElementById('resultado-generico');
  const planBlock = document.getElementById('resultado-plan');

  if (!plan) {
    genericBlock.classList.remove('hidden');
    planBlock.classList.add('hidden');
    return;
  }

  document.getElementById('resultado-badge').textContent = plan.badge;
  document.getElementById('resultado-title').textContent = plan.title;
  document.getElementById('resultado-desc').textContent = plan.desc;
  document.getElementById('resultado-img').src = plan.img;
  document.getElementById('resultado-img').alt = plan.title;
  document.getElementById('resultado-cta').setAttribute('onclick', `openModal('${plan.modalPlan}')`);

  planBlock.classList.remove('hidden');
  genericBlock.classList.add('hidden');

  const email = params.get('email');
  if (email) {
    const emailInput = document.querySelector('#checkout-modal input[name="email"]');
    if (emailInput) emailInput.value = email;
  }
}

document.addEventListener('DOMContentLoaded', renderResultado);
