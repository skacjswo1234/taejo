/**
 * 문의 리스트 조회 (단순 보호: 별도 인증 없음, 프런트에서 세션 플래그로 제한)
 * D1 바인딩: taejo-db
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "content-type": "application/json",
};

export const onRequest = async ({ request, env }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  const db = env["taejo-db"];
  if (!db) {
    return new Response(JSON.stringify({ error: "DB binding missing" }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  try {
    const stmt = db.prepare(
      `SELECT id, name, phone, inquiry_type, subject, message, privacy, created_at
         FROM contact_messages
         ORDER BY created_at DESC
         LIMIT 200`
    );
    const rows = await stmt.all();
    return new Response(
      JSON.stringify({ ok: true, items: rows?.results || [] }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "DB 조회 실패",
        detail: err.message || `${err}`,
      }),
      { status: 500, headers: corsHeaders }
    );
  }
};


