// Team Top Nutrition — configuración de Supabase (Fase 1)
// TODO: reemplazar con los valores reales de tu proyecto (Supabase → Project Settings → API).
// SUPABASE_ANON_KEY es pública por diseño (se usa en el navegador); NUNCA pongas aquí la service_role key.

// `var` a propósito (no `const`): así queda colgado de `window`, visible tanto para scripts
// clásicos (js/main.js) como para el script type="module" de admin.html (vía window.SUPABASE_URL).
var SUPABASE_URL = 'https://meumjrbzobtsmcqegdzu.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldW1qcmJ6b2J0c21jcWVnZHp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1OTU3NjcsImV4cCI6MjEwMTE3MTc2N30.H9WP50rlhxhZV7gYHDbJfmxskQ1z2DXpd9H-rdy6AuA';

// URL de la Edge Function create-order (mismo proyecto, se arma sola a partir de SUPABASE_URL).
var CREATE_ORDER_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/create-order`;
