import { supabaseConfig } from "./config.js";

function headersBase() {
  return {
    apikey: supabaseConfig.apiKey,
    Authorization: `Bearer ${supabaseConfig.apiKey}`
  };
}

export async function existeEnSupabase(uuid) {
  const uuidMayus = uuid.toUpperCase();
  const url =
    `${supabaseConfig.url}/rest/v1/${supabaseConfig.table}` +
    `?select=uuid_cfdi&uuid_cfdi=eq.${encodeURIComponent(uuidMayus)}`;

  const response = await fetch(url, { headers: headersBase() });

  if (!response.ok) {
    throw new Error(`Supabase consulta: ${response.status} ${await response.text()}`);
  }

  const datos = await response.json();
  return Array.isArray(datos) && datos.length > 0;
}

export async function guardarEnSupabase(uuid, datos) {
  const response = await fetch(
    `${supabaseConfig.url}/rest/v1/${supabaseConfig.table}`,
    {
      method: "POST",
      headers: {
        ...headersBase(),
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        ...datos,
        uuid_cfdi: uuid.toUpperCase()
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Supabase inserción: ${response.status} ${await response.text()}`);
  }
}
