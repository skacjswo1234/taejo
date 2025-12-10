/**
 * Cloudflare Pages Function - 문의 저장 API
 * D1 바인딩 이름: taejo-db
 */

export const onRequest = async ({ request, env }) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "content-type": "application/json",
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // GET 요청은 테스트용
  if (request.method === "GET") {
    const db = env["taejo-db"];
    return new Response(
      JSON.stringify({
        message: "Contact API is working",
        method: request.method,
        hasDb: !!db,
        dbType: db ? typeof db : "undefined",
        envKeys: Object.keys(env),
      }),
      { status: 200, headers: corsHeaders }
    );
  }

  // POST 요청 처리
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed", method: request.method }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    // D1 바인딩 확인
    const db = env["taejo-db"];
    
    if (!db) {
      return new Response(
        JSON.stringify({
          error: "DB binding missing",
          message: "D1 바인딩 'taejo-db'를 찾을 수 없습니다.",
          availableBindings: Object.keys(env),
          hint: "Cloudflare 대시보드에서 D1 바인딩을 확인해주세요.",
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 요청 본문 파싱
    const contentType = request.headers.get("content-type") || "";
    let body;

    try {
      if (contentType.includes("application/json")) {
        body = await request.json();
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const form = await request.formData();
        body = Object.fromEntries(form.entries());
      } else {
        return new Response(
          JSON.stringify({
            error: "Unsupported content-type",
            contentType: contentType,
          }),
          { status: 415, headers: corsHeaders }
        );
      }
    } catch (parseErr) {
      return new Response(
        JSON.stringify({
          error: "Invalid body",
          detail: parseErr.message || `${parseErr}`,
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 데이터 추출
    const name = (body.name || "").trim();
    const phone = (body.phone || "").trim();
    const inquiryType = (body.inquiryType || body["inquiry-type"] || "").trim();
    const subject = (body.subject || "").trim();
    const message = (body.message || "").trim();
    const privacy =
      body.privacy === true ||
      body.privacy === "true" ||
      body.privacy === "on";

    // 유효성 검사
    if (!privacy) {
      return new Response(
        JSON.stringify({ error: "개인정보 수집 동의가 필요합니다." }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!name || !inquiryType || !subject || !message) {
      return new Response(
        JSON.stringify({
          error: "필수 항목을 모두 입력해주세요.",
          missing: {
            name: !name,
            inquiryType: !inquiryType,
            subject: !subject,
            message: !message,
          },
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 테이블 생성
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
    } catch (tableErr) {
      return new Response(
        JSON.stringify({
          error: "테이블 생성 실패",
          detail: tableErr.message || `${tableErr}`,
          type: tableErr.name || "TableCreationError",
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 데이터 삽입
    try {
      const result = await db
        .prepare(
          `INSERT INTO contact_messages (name, phone, inquiry_type, subject, message, privacy)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(name, phone || null, inquiryType, subject, message, privacy ? 1 : 0)
        .run();

      return new Response(
        JSON.stringify({
          ok: true,
          message: "문의가 접수되었습니다.",
          id: result.meta?.last_row_id,
        }),
        { status: 200, headers: corsHeaders }
      );
    } catch (insertErr) {
      return new Response(
        JSON.stringify({
          error: "데이터 삽입 실패",
          detail: insertErr.message || `${insertErr}`,
          type: insertErr.name || "InsertError",
        }),
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (err) {
    // 예상치 못한 모든 에러
    return new Response(
      JSON.stringify({
        error: "서버 오류",
        detail: err.message || `${err}`,
        type: err.name || "UnknownError",
        stack: err.stack || "No stack trace",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
};
