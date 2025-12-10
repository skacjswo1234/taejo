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
    // status 컬럼이 있는지 확인하고 없으면 추가 시도
    try {
      await db.prepare(`ALTER TABLE contact_messages ADD COLUMN status TEXT DEFAULT 'new'`).run();
    } catch (alterErr) {
      // 이미 컬럼이 있거나 다른 에러면 무시
      console.log("Status column check:", alterErr.message);
    }

    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "";

    // status 컬럼이 있는지 확인하기 위해 먼저 간단한 쿼리 시도
    let hasStatusColumn = true;
    try {
      await db.prepare(`SELECT status FROM contact_messages LIMIT 1`).first();
    } catch (checkErr) {
      hasStatusColumn = false;
    }

    let query;
    if (hasStatusColumn) {
      query = `SELECT id, name, phone, inquiry_type, subject, message, privacy, 
           COALESCE(status, 'new') as status, created_at
           FROM contact_messages WHERE 1=1`;
    } else {
      query = `SELECT id, name, phone, inquiry_type, subject, message, privacy, 
           'new' as status, created_at
           FROM contact_messages WHERE 1=1`;
    }
    
    const params = [];

    if (search) {
      query += ` AND (name LIKE ? OR phone LIKE ? OR subject LIKE ? OR message LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    if (status && hasStatusColumn) {
      query += ` AND COALESCE(status, 'new') = ?`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT 200`;

    const stmt = params.length > 0 ? db.prepare(query).bind(...params) : db.prepare(query);
    const rows = await stmt.all();
    
    // status 컬럼이 없으면 모든 항목에 'new' 추가
    const items = (rows?.results || []).map(item => ({
      ...item,
      status: item.status || 'new'
    }));
    
    return new Response(
      JSON.stringify({ ok: true, items }),
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


