/**
 * Cloudflare Pages Function - 문의 저장 API
 * D1 바인딩 이름: taejo-db
 */
export const onRequestPost = async ({ request, env }) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  const db = env["taejo-db"];
  if (!db) {
    return new Response(JSON.stringify({ error: "DB binding missing" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const contentType = request.headers.get("content-type") || "";
  let body;

  try {
    if (contentType.includes("application/json")) {
      body = await request.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData();
      body = Object.fromEntries(form.entries());
    } else {
      return new Response(JSON.stringify({ error: "Unsupported content-type" }), {
        status: 415,
        headers: { "content-type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid body", detail: `${err}` }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const name = (body.name || "").trim();
  const phone = (body.phone || "").trim();
  const inquiryType = (body.inquiryType || body["inquiry-type"] || "").trim();
  const subject = (body.subject || "").trim();
  const message = (body.message || "").trim();
  const privacy = body.privacy === true || body.privacy === "true" || body.privacy === "on";

  if (!privacy) {
    return new Response(JSON.stringify({ error: "개인정보 수집 동의가 필요합니다." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (!name || !inquiryType || !subject || !message) {
    return new Response(JSON.stringify({ error: "필수 항목을 모두 입력해주세요." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS contact_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT,
          inquiry_type TEXT NOT NULL,
          subject TEXT NOT NULL,
          message TEXT NOT NULL,
          privacy INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`
      )
      .run();

    await db
      .prepare(
        `INSERT INTO contact_messages (name, phone, inquiry_type, subject, message, privacy)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(name, phone, inquiryType, subject, message, privacy ? 1 : 0)
      .run();

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "DB 오류", detail: `${err}` }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};


