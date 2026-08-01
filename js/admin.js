// Team Top Nutrition — Panel de administración (Fase 1)
// Login con Supabase Auth + tabla de clientes/órdenes, protegida por Row Level Security.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const statusFilter = document.getElementById('status-filter');
const loadingMsg = document.getElementById('loading-msg');
const emptyMsg = document.getElementById('empty-msg');
const table = document.getElementById('orders-table');
const tbody = document.getElementById('orders-tbody');

const STATUS_LABELS = {
  pending: 'Pendiente',
  link_generated: 'Link generado',
  paid: 'Pagado',
  failed: 'Fallido',
  expired: 'Expirado',
  canceled: 'Cancelado',
  refunded: 'Reembolsado',
};

function showDashboard() {
  loginView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');
  loadOrders();
}

function showLogin() {
  dashboardView.classList.add('hidden');
  loginView.classList.remove('hidden');
  logoutBtn.classList.add('hidden');
}

async function loadOrders() {
  loadingMsg.classList.remove('hidden');
  table.classList.add('hidden');
  emptyMsg.classList.add('hidden');

  let query = supabase
    .from('orders')
    .select('id, status, created_at, plan_code, customers(full_name, whatsapp_phone, email)')
    .order('created_at', { ascending: false });

  const status = statusFilter.value;
  if (status) query = query.eq('status', status);

  const { data, error } = await query;

  loadingMsg.classList.add('hidden');

  if (error) {
    loadingMsg.textContent = `Error al cargar: ${error.message}`;
    loadingMsg.classList.remove('hidden');
    return;
  }

  if (!data || data.length === 0) {
    emptyMsg.classList.remove('hidden');
    return;
  }

  tbody.innerHTML = '';
  for (const row of data) {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-gray-800/60';
    tr.innerHTML = `
      <td class="py-3 pr-4">${row.customers?.full_name ?? '—'}</td>
      <td class="py-3 pr-4">${row.customers?.whatsapp_phone ?? '—'}</td>
      <td class="py-3 pr-4">${row.customers?.email ?? '—'}</td>
      <td class="py-3 pr-4">${row.plan_code}</td>
      <td class="py-3 pr-4"><span class="text-xs uppercase font-bold text-brand-yellow">${STATUS_LABELS[row.status] ?? row.status}</span></td>
      <td class="py-3 pr-4 text-gray-400">${new Date(row.created_at).toLocaleDateString('es-CL')}</td>
    `;
    tbody.appendChild(tr);
  }
  table.classList.remove('hidden');
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    loginError.textContent = 'Correo o contraseña incorrectos.';
    loginError.classList.remove('hidden');
  }
});

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

statusFilter.addEventListener('change', loadOrders);

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) showDashboard();
  else showLogin();
});

supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) showDashboard();
  else showLogin();
});
