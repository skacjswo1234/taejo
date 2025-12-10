/**
 * Cloudflare Pages Function - 문의 저장 API
 * D1 바인딩 이름: taejo-db
 */
export const onRequestPost = async ({ request, env }) => {
  // CORS 헤더 설정
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "content-type": "application/json",
  };

  // 전체 함수를 try-catch로 감싸서 모든 에러를 잡아냄
  try {
    // OPTIONS 요청 처리 (CORS preflight)
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: corsHeaders,
      });
    }

    // D1 바인딩 확인 (여러 가능한 이름 시도)
    let db = env["taejo-db"] || env.TAEJO_DB || env.taejo_db;
    
    if (!db) {
      const allBindings = Object.keys(env);
      console.error("D1 바인딩을 찾을 수 없습니다. 사용 가능한 바인딩:", allBindings);
      return new Response(
        JSON.stringify({ 
          error: "DB binding missing", 
          message: "D1 바인딩 'taejo-db'를 찾을 수 없습니다.",
          availableBindings: allBindings,
          envKeys: allBindings
        }), 
        {
          status: 500,
          headers: corsHeaders,
        }
      );
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
          headers: corsHeaders,
        });
      }
    } catch (err) {
      console.error("요청 본문 파싱 오류:", err);
      return new Response(JSON.stringify({ error: "Invalid body", detail: `${err}` }), {
        status: 400,
        headers: corsHeaders,
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
        headers: corsHeaders,
      });
    }

    if (!name || !inquiryType || !subject || !message) {
      return new Response(JSON.stringify({ error: "필수 항목을 모두 입력해주세요." }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 테이블 생성
    try {
      const createTableResult = await db
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
      
      console.log("테이블 생성 결과:", createTableResult);
    } catch (tableErr) {
      console.error("테이블 생성 오류:", tableErr);
      return new Response(
        JSON.stringify({ 
          error: "테이블 생성 실패", 
          detail: tableErr.message || `${tableErr}`,
          type: tableErr.name || "TableCreationError"
        }), 
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }

    // 데이터 삽입
    try {
      const insertResult = await db
        .prepare(
          `INSERT INTO contact_messages (name, phone, inquiry_type, subject, message, privacy)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(name, phone || null, inquiryType, subject, message, privacy ? 1 : 0)
        .run();

      console.log("데이터 삽입 결과:", insertResult);

      return new Response(JSON.stringify({ ok: true, message: "문의가 접수되었습니다." }), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (insertErr) {
      console.error("데이터 삽입 오류:", {
        message: insertErr.message,
        stack: insertErr.stack,
        name: insertErr.name,
        cause: insertErr.cause
      });
      return new Response(
        JSON.stringify({ 
          error: "데이터 삽입 실패", 
          detail: insertErr.message || `${insertErr}`,
          type: insertErr.name || "InsertError"
        }), 
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }
  } catch (err) {
    // 예상치 못한 모든 에러를 잡아냄
    console.error("예상치 못한 오류:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
      cause: err.cause,
      toString: err.toString()
    });
    return new Response(
      JSON.stringify({ 
        error: "서버 오류", 
        detail: err.message || `${err}`,
        type: err.name || "UnknownError",
        stack: err.stack || "No stack trace"
      }), 
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
};


