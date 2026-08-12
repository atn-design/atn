// Andrea Top Nutrition — Diagnóstico Vitalidad 360 (quiz nativo, sin Tally)
// Preguntas y puntajes reales provistos por Andrea. Rango de puntaje total: 2–10.
// Mapeo confirmado: <=4 recomposicion | 5-7 perdida-peso | >=8 reset-7d

const STEPS = [
  {
    id: 'especial',
    type: 'choice',
    question: 'Antes de empezar: ¿tienes alguna condición de salud que debamos conocer (embarazo, alergias, alguna enfermedad, etc.)?',
    options: [
      { label: 'No, ninguna', value: 'no' },
      { label: 'Sí, tengo algo que contarle a Andrea', value: 'si', special: true },
    ],
  },
  {
    id: 'rol',
    type: 'choice',
    question: '¿Cuál es tu rol principal hoy?',
    options: [
      { label: 'Mamá (multitasking y poco tiempo)', value: 'mama' },
      { label: 'Profesional / Ejecutiva (enfoque y alto rendimiento)', value: 'profesional' },
      { label: 'Emprendedora (estrés y horarios locos)', value: 'emprendedora' },
      { label: 'Deportista (busco optimizar resultados)', value: 'deportista' },
    ],
  },
  {
    id: 'sintoma',
    type: 'choice',
    question: 'Si pudieras eliminar una molestia HOY mismo, ¿cuál sería?',
    options: [
      { label: 'Esa pesadez abdominal que no me deja cerrar el pantalón.', points: 3 },
      { label: 'El cansancio que arrastro desde que me despierto.', points: 2 },
      { label: 'La ansiedad de comer algo dulce por la tarde.', points: 1 },
      { label: 'No descanso bien y mi piel se ve apagada.', points: 1 },
    ],
  },
  {
    id: 'actividad',
    type: 'choice',
    question: '¿Cómo describirías tu nivel de actividad física actual?',
    options: [
      { label: 'Sedentario (paso mucho tiempo sentada).', points: 3 },
      { label: 'Intermitente (hago algo cuando el tiempo me deja).', points: 2 },
      { label: 'Activa (entreno 3+ veces por semana).', points: 0 },
    ],
  },
  {
    id: 'alimentacion',
    type: 'choice',
    question: 'Sobre tu alimentación: ¿cuál es tu mayor desafío?',
    options: [
      { label: 'Como lo primero que encuentro por falta de tiempo.', points: 2 },
      { label: 'Cocino para mi familia, pero me descuido a mí misma.', points: 2 },
      { label: 'Picoteo mucho entre horas por estrés o aburrimiento.', points: 1 },
    ],
  },
  {
    id: 'compromiso',
    type: 'choice',
    question: '¿Cuánto tiempo REAL puedes dedicarle a tu bienestar cada día?',
    options: [
      { label: 'Máximo 5-10 minutos (necesito soluciones prácticas).', points: 2 },
      { label: '15 a 30 minutos (puedo organizarme).', points: 1 },
      { label: '¡Voy con todo! (tengo 1 hora o más).', points: 0 },
    ],
  },
  {
    id: 'email',
    type: 'email',
    question: '¿A dónde te enviamos tu diagnóstico?',
    subtext: 'Opcional — solo para tener un registro de contacto.',
  },
];

let currentStep = 0;
let score = 0;
const answers = {};

function scoreToPlan(total) {
  if (total >= 8) return 'reset-7d';
  if (total >= 5) return 'perdida-peso';
  return 'recomposicion';
}

function updateProgress() {
  const bar = document.getElementById('progress-bar');
  const pct = Math.round(((currentStep + 1) / STEPS.length) * 100);
  bar.style.width = `${pct}%`;
}

function renderStep() {
  const step = STEPS[currentStep];
  const container = document.getElementById('quiz-step');
  updateProgress();

  if (step.type === 'choice') {
    container.innerHTML = `
      <h2 class="font-title text-2xl sm:text-3xl uppercase leading-tight mb-6">${step.question}</h2>
      <div class="space-y-3" id="options-list"></div>
      ${currentStep > 0 ? '<button id="back-btn" class="mt-6 text-sm text-gray-400 hover:text-brand-yellow transition-colors"><i class="fa-solid fa-arrow-left mr-2"></i>Atrás</button>' : ''}
    `;
    const list = document.getElementById('options-list');
    step.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'w-full text-left bg-gray-900 border border-gray-700 hover:border-brand-yellow p-4 rounded-xl transition-all text-sm sm:text-base';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => handleAnswer(step, opt));
      list.appendChild(btn);
    });
  } else if (step.type === 'email') {
    container.innerHTML = `
      <h2 class="font-title text-2xl sm:text-3xl uppercase leading-tight mb-2">${step.question}</h2>
      <p class="text-gray-400 text-xs mb-6">${step.subtext}</p>
      <input type="email" id="email-input" placeholder="tu@email.com" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:border-brand-yellow focus:outline-none mb-4">
      <div class="flex items-center gap-4">
        <button id="submit-btn" class="flex-1 bg-brand-yellow text-black font-black uppercase text-sm py-4 rounded-xl hover:bg-brand-hoverYellow transition-all">Ver mi resultado</button>
      </div>
      <button id="back-btn" class="mt-6 text-sm text-gray-400 hover:text-brand-yellow transition-colors"><i class="fa-solid fa-arrow-left mr-2"></i>Atrás</button>
    `;
    document.getElementById('submit-btn').addEventListener('click', () => {
      answers.email = document.getElementById('email-input').value.trim();
      finish();
    });
  }

  const backBtn = document.getElementById('back-btn');
  if (backBtn) backBtn.addEventListener('click', goBack);
}

function handleAnswer(step, opt) {
  if (opt.special) {
    showSpecialCase();
    return;
  }
  answers[step.id] = opt.value ?? opt.label;
  if (typeof opt.points === 'number') score += opt.points;
  currentStep += 1;
  renderStep();
}

function goBack() {
  currentStep = Math.max(0, currentStep - 1);
  renderStep();
}

function showSpecialCase() {
  document.getElementById('quiz-card').classList.add('hidden');
  document.getElementById('special-case').classList.remove('hidden');
}

function finish() {
  const plan = scoreToPlan(score);
  const params = new URLSearchParams({ plan });
  if (answers.email) params.set('email', answers.email);
  window.location.href = `resultado.html?${params.toString()}`;
}

document.addEventListener('DOMContentLoaded', renderStep);
