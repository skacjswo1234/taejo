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
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "";

    let query = `SELECT id, name, phone, inquiry_type, subject, message, privacy, 
         COALESCE(status, 'new') as status, created_at
         FROM contact_messages WHERE 1=1`;
    const params = [];

    if (search) {
      query += ` AND (name LIKE ? OR phone LIKE ? OR subject LIKE ? OR message LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT 200`;

    const stmt = params.length > 0 ? db.prepare(query).bind(...params) : db.prepare(query);
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


