/**
 * 관리자 비밀번호 변경 (단순 비밀번호 비교, 토큰/세션 없음, 해시 없음)
 * D1 바인딩: taejo-db
 */

const TABLE_SQL = `
CREATE TABLE IF NOT EXISTS admin_password (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password TEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "content-type": "application/json",
};

const ensureTable = async (db) => {
  await db.prepare(TABLE_SQL).run();
};

const getStoredHash = async (db) => {
  const row = await db.prepare("SELECT password FROM admin_password WHERE id = 1").first();
  return row?.password || null;
};

const setHash = async (db, hash) => {
  await db.prepare(
    `INSERT INTO admin_password (id, password) VALUES (1, ?)
     ON CONFLICT(id) DO UPDATE SET password = excluded.password, updated_at = CURRENT_TIMESTAMP`
  ).bind(hash).run();
};

export const onRequest = async ({ request, env }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "POST") {
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

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid body" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const currentPassword = (body.currentPassword || "").trim();
  const newPassword = (body.newPassword || "").trim();

  if (!currentPassword || !newPassword) {
    return new Response(JSON.stringify({ error: "현재 비밀번호와 새 비밀번호를 입력하세요." }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    await ensureTable(db);
    const stored = await getStoredHash(db);

    if (!stored) {
      return new Response(
        JSON.stringify({ error: "관리자 비밀번호가 설정되지 않았습니다." }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (currentPassword !== stored) {
      return new Response(JSON.stringify({ error: "현재 비밀번호가 일치하지 않습니다." }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    await setHash(db, newPassword);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "서버 오류",
        detail: err.message || `${err}`,
      }),
      { status: 500, headers: corsHeaders }
    );
  }
};


