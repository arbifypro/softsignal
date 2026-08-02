"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { Pool } = require("pg");

const PORT = Number(process.env.PORT) || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const WEBHOOK_SECRET =
  process.env.TELEGRAM_WEBHOOK_SECRET || "";
const DATABASE_URL =
  process.env.DATABASE_URL || "";

const ACCESS_KEY = normalizeAccessKey(
  process.env.ACCESS_KEY || ""
);

const MINI_APP_LINK =
  process.env.MINI_APP_LINK ||
  "https://t.me/ArbifyPulseAppBot?startapp";

const PUBLIC_ROOT = __dirname;
const TELEGRAM_AUTH_MAX_AGE_SECONDS = 86_400;
const MAX_STATE_SIZE = 100_000;

const BLOCKED_FILES = new Set([
  "server.js",
  "package.json",
  "package-lock.json",
]);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
};

const ALLOWED_STATE_KEYS = new Set([
  "subid",
  "pulseBalance",
  "pulseLevel",
  "pulseUnlocks",
  "completedTasks",
  "taskProgress",
  "notifications",
  "signalHistory",
  "favorites",
  "selectedSlot",
  "lastSignal",
  "profile",
  "preferences",
]);

if (!DATABASE_URL) {
  console.error(
    "DATABASE_URL is not configured"
  );

  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes(
    "railway.internal"
  )
    ? false
    : {
        rejectUnauthorized: false,
      },
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (error) => {
  console.error(
    "Unexpected PostgreSQL error:",
    error.message
  );
});

class ApiError extends Error {
  constructor(statusCode, message, data = {}) {
    super(message);

    this.statusCode = statusCode;
    this.data = data;
  }
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type":
      "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });

  response.end(
    JSON.stringify(data)
  );
}

function sendApiError(response, error) {
  if (error instanceof ApiError) {
    sendJson(response, error.statusCode, {
      ok: false,
      error: error.message,
      ...error.data,
    });

    return;
  }

  console.error(
    "API error:",
    error?.stack || error
  );

  sendJson(response, 500, {
    ok: false,
    error: "Internal server error",
  });
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1_000_000) {
        reject(
          new ApiError(
            413,
            "Request body is too large"
          )
        );

        request.destroy();
      }
    });

    request.on("end", () => {
      try {
        resolve(
          body
            ? JSON.parse(body)
            : {}
        );
      } catch {
        reject(
          new ApiError(
            400,
            "Invalid JSON"
          )
        );
      }
    });

    request.on("error", reject);
  });
}

function normalizeAccessKey(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function safeText(value, maxLength = 255) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized
    ? normalized.slice(0, maxLength)
    : null;
}

function safeBoolean(value) {
  return value === true;
}

function safeEqualText(
  firstValue,
  secondValue
) {
  const first = Buffer.from(
    String(firstValue),
    "utf8"
  );

  const second = Buffer.from(
    String(secondValue),
    "utf8"
  );

  if (first.length !== second.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    first,
    second
  );
}

function calculatePulseLevel(balance) {
  if (balance >= 1200) {
    return 4;
  }

  if (balance >= 600) {
    return 3;
  }

  if (balance >= 250) {
    return 2;
  }

  return 1;
}

function sanitizeStatePatch(input) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new ApiError(
      400,
      "State must be an object"
    );
  }

  const patch = {};

  for (
    const [key, value] of
    Object.entries(input)
  ) {
    if (!ALLOWED_STATE_KEYS.has(key)) {
      continue;
    }

    patch[key] = value;
  }

  if ("subid" in patch) {
    patch.subid = safeText(
      patch.subid,
      128
    );
  }

  if ("pulseBalance" in patch) {
    const balance = Number(
      patch.pulseBalance
    );

    if (
      !Number.isSafeInteger(balance) ||
      balance < 0 ||
      balance > 1_000_000_000
    ) {
      throw new ApiError(
        400,
        "Invalid PULSE balance"
      );
    }

    patch.pulseBalance = balance;
    patch.pulseLevel =
      calculatePulseLevel(balance);
  } else {
    delete patch.pulseLevel;
  }

  let serialized;

  try {
    serialized = JSON.stringify(patch);
  } catch {
    throw new ApiError(
      400,
      "State is not valid JSON"
    );
  }

  if (serialized.length > MAX_STATE_SIZE) {
    throw new ApiError(
      413,
      "State is too large"
    );
  }

  return JSON.parse(serialized);
}

function validateTelegramInitData(initData) {
  if (!BOT_TOKEN) {
    throw new ApiError(
      503,
      "Telegram authentication is unavailable"
    );
  }

  if (
    typeof initData !== "string" ||
    !initData ||
    initData.length > 20_000
  ) {
    throw new ApiError(
      401,
      "Telegram authentication is required"
    );
  }

  const parameters =
    new URLSearchParams(initData);

  const receivedHash =
    parameters.get("hash");

  if (
    !receivedHash ||
    !/^[a-f0-9]{64}$/i.test(receivedHash)
  ) {
    throw new ApiError(
      401,
      "Invalid Telegram authentication"
    );
  }

  parameters.delete("hash");

  const dataCheckString = [
    ...parameters.entries(),
  ]
    .sort(
      ([firstKey], [secondKey]) =>
        firstKey.localeCompare(secondKey)
    )
    .map(
      ([key, value]) =>
        `${key}=${value}`
    )
    .join("\n");

  const secretKey = crypto
    .createHmac(
      "sha256",
      "WebAppData"
    )
    .update(BOT_TOKEN)
    .digest();

  const expectedHash = crypto
    .createHmac(
      "sha256",
      secretKey
    )
    .update(dataCheckString)
    .digest("hex");

  if (
    !safeEqualText(
      receivedHash,
      expectedHash
    )
  ) {
    throw new ApiError(
      401,
      "Invalid Telegram authentication"
    );
  }

  const authDate = Number(
    parameters.get("auth_date")
  );

  const currentTime = Math.floor(
    Date.now() / 1000
  );

  if (
    !Number.isSafeInteger(authDate) ||
    authDate > currentTime + 300 ||
    currentTime - authDate >
      TELEGRAM_AUTH_MAX_AGE_SECONDS
  ) {
    throw new ApiError(
      401,
      "Telegram session has expired"
    );
  }

  let telegramUser;

  try {
    telegramUser = JSON.parse(
      parameters.get("user") || ""
    );
  } catch {
    throw new ApiError(
      401,
      "Telegram user data is missing"
    );
  }

  const telegramId = String(
    telegramUser?.id || ""
  );

  if (!/^\d{1,20}$/.test(telegramId)) {
    throw new ApiError(
      401,
      "Telegram user data is invalid"
    );
  }

  return {
    telegramId,

    username: safeText(
      telegramUser.username,
      64
    ),

    firstName: safeText(
      telegramUser.first_name,
      128
    ),

    lastName: safeText(
      telegramUser.last_name,
      128
    ),

    languageCode: safeText(
      telegramUser.language_code,
      16
    ),

    photoUrl: safeText(
      telegramUser.photo_url,
      1000
    ),

    isPremium: safeBoolean(
      telegramUser.is_premium
    ),
  };
}

async function initializeDatabase() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS arbify_users (
        telegram_id BIGINT PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        language_code TEXT,
        photo_url TEXT,
        is_premium BOOLEAN NOT NULL DEFAULT FALSE,
        access_granted BOOLEAN NOT NULL DEFAULT FALSE,
        access_activated_at TIMESTAMPTZ,
        access_failed_attempts INTEGER NOT NULL DEFAULT 0,
        access_locked_until TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS arbify_user_state (
        telegram_id BIGINT PRIMARY KEY
          REFERENCES arbify_users(telegram_id)
          ON DELETE CASCADE,
        state JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS
        arbify_users_last_seen_idx
      ON arbify_users(last_seen_at DESC)
    `);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");

    throw error;
  } finally {
    client.release();
  }
}

async function upsertTelegramUser(user) {
  const result = await pool.query(
    `
      INSERT INTO arbify_users (
        telegram_id,
        username,
        first_name,
        last_name,
        language_code,
        photo_url,
        is_premium,
        last_seen_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        NOW()
      )
      ON CONFLICT (telegram_id)
      DO UPDATE SET
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        language_code = EXCLUDED.language_code,
        photo_url = COALESCE(
          EXCLUDED.photo_url,
          arbify_users.photo_url
        ),
        is_premium = EXCLUDED.is_premium,
        last_seen_at = NOW()
      RETURNING *
    `,
    [
      user.telegramId,
      user.username,
      user.firstName,
      user.lastName,
      user.languageCode,
      user.photoUrl,
      user.isPremium,
    ]
  );

  await pool.query(
    `
      INSERT INTO arbify_user_state (
        telegram_id
      )
      VALUES ($1)
      ON CONFLICT (telegram_id)
      DO NOTHING
    `,
    [
      user.telegramId,
    ]
  );

  return result.rows[0];
}

async function upsertBotUser(from) {
  if (!from?.id) {
    return null;
  }

  return upsertTelegramUser({
    telegramId: String(from.id),

    username: safeText(
      from.username,
      64
    ),

    firstName: safeText(
      from.first_name,
      128
    ),

    lastName: safeText(
      from.last_name,
      128
    ),

    languageCode: safeText(
      from.language_code,
      16
    ),

    photoUrl: null,

    isPremium: safeBoolean(
      from.is_premium
    ),
  });
}

async function getUserState(telegramId) {
  const result = await pool.query(
    `
      SELECT state
      FROM arbify_user_state
      WHERE telegram_id = $1
    `,
    [
      telegramId,
    ]
  );

  return result.rows[0]?.state || {};
}

function serializeUser(user, state) {
  return {
    telegramId:
      String(user.telegram_id),

    username:
      user.username,

    firstName:
      user.first_name,

    lastName:
      user.last_name,

    languageCode:
      user.language_code,

    photoUrl:
      user.photo_url,

    isPremium:
      user.is_premium,

    accessGranted:
      user.access_granted,

    accessActivatedAt:
      user.access_activated_at,

    createdAt:
      user.created_at,

    lastSeenAt:
      user.last_seen_at,

    state,
  };
}

async function authenticateRequest(body) {
  const telegramUser =
    validateTelegramInitData(
      body.initData
    );

  return upsertTelegramUser(
    telegramUser
  );
}

async function handleTelegramAuth(
  request,
  response
) {
  try {
    const body =
      await readJsonBody(request);

    const user =
      await authenticateRequest(body);

    const state =
      await getUserState(
        user.telegram_id
      );

    sendJson(response, 200, {
      ok: true,

      user: serializeUser(
        user,
        state
      ),
    });
  } catch (error) {
    sendApiError(
      response,
      error
    );
  }
}

async function handleAccessVerification(
  request,
  response
) {
  try {
    const body =
      await readJsonBody(request);

    const user =
      await authenticateRequest(body);

    if (user.access_granted) {
      const state =
        await getUserState(
          user.telegram_id
        );

      sendJson(response, 200, {
        ok: true,
        accessGranted: true,

        user: serializeUser(
          user,
          state
        ),
      });

      return;
    }

    if (!ACCESS_KEY) {
      throw new ApiError(
        503,
        "Access key is not configured"
      );
    }

    if (
      user.access_locked_until &&
      new Date(
        user.access_locked_until
      ).getTime() > Date.now()
    ) {
      const retryAfterSeconds =
        Math.max(
          1,
          Math.ceil(
            (
              new Date(
                user.access_locked_until
              ).getTime() -
              Date.now()
            ) / 1000
          )
        );

      throw new ApiError(
        429,
        "Too many attempts",
        {
          retryAfterSeconds,
        }
      );
    }

    const submittedKey =
      normalizeAccessKey(
        body.key
      );

    const keyIsValid =
      submittedKey &&
      safeEqualText(
        submittedKey,
        ACCESS_KEY
      );

    if (!keyIsValid) {
      const failedResult =
        await pool.query(
          `
            UPDATE arbify_users
            SET
              access_failed_attempts =
                CASE
                  WHEN access_failed_attempts + 1 >= 5
                  THEN 0
                  ELSE access_failed_attempts + 1
                END,
              access_locked_until =
                CASE
                  WHEN access_failed_attempts + 1 >= 5
                  THEN NOW() + INTERVAL '15 minutes'
                  ELSE NULL
                END
            WHERE telegram_id = $1
            RETURNING access_locked_until
          `,
          [
            user.telegram_id,
          ]
        );

      const lockedUntil =
        failedResult.rows[0]
          ?.access_locked_until;

      throw new ApiError(
        lockedUntil ? 429 : 401,

        lockedUntil
          ? "Too many attempts"
          : "Invalid access key",

        lockedUntil
          ? {
              retryAfterSeconds: 900,
            }
          : {}
      );
    }

    const activatedResult =
      await pool.query(
        `
          UPDATE arbify_users
          SET
            access_granted = TRUE,
            access_activated_at = COALESCE(
              access_activated_at,
              NOW()
            ),
            access_failed_attempts = 0,
            access_locked_until = NULL,
            last_seen_at = NOW()
          WHERE telegram_id = $1
          RETURNING *
        `,
        [
          user.telegram_id,
        ]
      );

    const activatedUser =
      activatedResult.rows[0];

    const state =
      await getUserState(
        activatedUser.telegram_id
      );

    sendJson(response, 200, {
      ok: true,
      accessGranted: true,

      user: serializeUser(
        activatedUser,
        state
      ),
    });
  } catch (error) {
    sendApiError(
      response,
      error
    );
  }
}

async function handleStateSave(
  request,
  response
) {
  try {
    const body =
      await readJsonBody(request);

    const user =
      await authenticateRequest(body);

    if (!user.access_granted) {
      throw new ApiError(
        403,
        "Access has not been activated"
      );
    }

    const statePatch =
      sanitizeStatePatch(
        body.state
      );

    const result =
      await pool.query(
        `
          UPDATE arbify_user_state
          SET
            state = state || $2::jsonb,
            updated_at = NOW()
          WHERE telegram_id = $1
          RETURNING state, updated_at
        `,
        [
          user.telegram_id,
          JSON.stringify(statePatch),
        ]
      );

    sendJson(response, 200, {
      ok: true,

      state:
        result.rows[0]?.state || {},

      updatedAt:
        result.rows[0]?.updated_at ||
        null,
    });
  } catch (error) {
    sendApiError(
      response,
      error
    );
  }
}

async function telegramRequest(
  method,
  payload
) {
  if (!BOT_TOKEN) {
    throw new Error(
      "BOT_TOKEN is not configured"
    );
  }

  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body:
        JSON.stringify(payload),
    }
  );

  const result =
    await response.json();

  if (!result.ok) {
    throw new Error(
      result.description ||
      "Telegram API request failed"
    );
  }

  return result.result;
}

async function sendLaunchMessage(chatId) {
  return telegramRequest(
    "sendMessage",
    {
      chat_id: chatId,

      text: [
        "<b>🚀 ARBIFY PULSE</b>",
        "",
        "Accedi alla piattaforma ufficiale, ai segnali personalizzati, all’analisi LIVE e ai bonus.",
        "",
        "18+ · Gioca responsabilmente",
      ].join("\n"),

      parse_mode: "HTML",

      disable_web_page_preview:
        true,

      reply_markup: {
        inline_keyboard: [
          [
            {
              text:
                "🚀 APRI ARBIFY PULSE",

              url:
                MINI_APP_LINK,
            },
          ],
        ],
      },
    }
  );
}

async function processTelegramUpdate(update) {
  const message = update.message;

  if (!message || !message.chat) {
    return;
  }

  if (message.from) {
    await upsertBotUser(
      message.from
    );
  }

  const chatId =
    message.chat.id;

  const text =
    typeof message.text === "string"
      ? message.text.trim()
      : "";

  const command = text
    .split(/\s+/)[0]
    .split("@")[0]
    .toLowerCase();

  const launchCommands = new Set([
    "/start",
    "/app",
    "/pulse",
  ]);

  if (
    launchCommands.has(command)
  ) {
    await sendLaunchMessage(
      chatId
    );
  }
}

function serveStaticFile(
  request,
  response
) {
  let pathname;

  try {
    pathname = decodeURIComponent(
      new URL(
        request.url,
        "http://localhost"
      ).pathname
    );
  } catch {
    response.writeHead(400);
    response.end("Bad request");

    return;
  }

  if (pathname === "/") {
    pathname = "/index.html";
  }

  const requestedFile =
    path.basename(pathname);

  if (
    BLOCKED_FILES.has(
      requestedFile
    )
  ) {
    response.writeHead(404);
    response.end("Not found");

    return;
  }

  const filePath = path.resolve(
    PUBLIC_ROOT,
    `.${pathname}`
  );

  const safeRoot =
    `${path.resolve(
      PUBLIC_ROOT
    )}${path.sep}`;

  if (
    filePath !==
      path.resolve(PUBLIC_ROOT) &&
    !filePath.startsWith(safeRoot)
  ) {
    response.writeHead(403);
    response.end("Forbidden");

    return;
  }

  fs.stat(
    filePath,
    (error, stats) => {
      if (
        error ||
        !stats.isFile()
      ) {
        response.writeHead(
          404,
          {
            "Content-Type":
              "text/plain; charset=utf-8",
          }
        );

        response.end(
          "Not found"
        );

        return;
      }

      const extension =
        path
          .extname(filePath)
          .toLowerCase();

      const contentType =
        MIME_TYPES[extension] ||
        "application/octet-stream";

      response.writeHead(200, {
        "Content-Type":
          contentType,

        "X-Content-Type-Options":
          "nosniff",

        "Referrer-Policy":
          "strict-origin-when-cross-origin",
      });

      if (
        request.method === "HEAD"
      ) {
        response.end();
        return;
      }

      const stream =
        fs.createReadStream(
          filePath
        );

      stream.pipe(response);

      stream.on(
        "error",
        () => {
          if (
            !response.headersSent
          ) {
            response.writeHead(
              500
            );
          }

          response.end();
        }
      );
    }
  );
}

const server = http.createServer(
  async (request, response) => {
    const requestUrl = new URL(
      request.url,
      "http://localhost"
    );

    if (
      request.method === "GET" &&
      requestUrl.pathname ===
        "/health"
    ) {
      try {
        await pool.query(
          "SELECT 1"
        );

        sendJson(
          response,
          200,
          {
            ok: true,
            service:
              "arbify-pulse",
            database:
              "connected",
          }
        );
      } catch {
        sendJson(
          response,
          503,
          {
            ok: false,
            service:
              "arbify-pulse",
            database:
              "disconnected",
          }
        );
      }

      return;
    }

    if (
      request.method === "POST" &&
      requestUrl.pathname ===
        "/api/telegram/auth"
    ) {
      await handleTelegramAuth(
        request,
        response
      );

      return;
    }

    if (
      request.method === "POST" &&
      requestUrl.pathname ===
        "/api/access/verify"
    ) {
      await handleAccessVerification(
        request,
        response
      );

      return;
    }

    if (
      request.method === "POST" &&
      requestUrl.pathname ===
        "/api/state/save"
    ) {
      await handleStateSave(
        request,
        response
      );

      return;
    }

    if (
      request.method === "POST" &&
      requestUrl.pathname ===
        "/telegram/webhook"
    ) {
      if (WEBHOOK_SECRET) {
        const receivedSecret =
          request.headers[
            "x-telegram-bot-api-secret-token"
          ];

        if (
          receivedSecret !==
          WEBHOOK_SECRET
        ) {
          sendJson(
            response,
            403,
            {
              ok: false,
            }
          );

          return;
        }
      }

      try {
        const update =
          await readJsonBody(
            request
          );

        sendJson(
          response,
          200,
          {
            ok: true,
          }
        );

        processTelegramUpdate(
          update
        ).catch((error) => {
          console.error(
            "Telegram update error:",
            error.message
          );
        });
      } catch {
        sendJson(
          response,
          400,
          {
            ok: false,
          }
        );
      }

      return;
    }

    if (
      request.method === "GET" ||
      request.method === "HEAD"
    ) {
      serveStaticFile(
        request,
        response
      );

      return;
    }

    response.writeHead(405, {
      Allow:
        "GET, HEAD, POST",
    });

    response.end(
      "Method not allowed"
    );
  }
);

async function startServer() {
  try {
    await initializeDatabase();

    server.listen(
      PORT,
      () => {
        console.log(
          `ARBIFY PULSE is running on port ${PORT}`
        );

        console.log(
          "PostgreSQL database is connected"
        );
      }
    );
  } catch (error) {
    console.error(
      "Unable to initialize PostgreSQL:",
      error.message
    );

    process.exit(1);
  }
}

async function shutdown() {
  server.close(async () => {
    await pool.end();

    process.exit(0);
  });
}

process.on(
  "SIGTERM",
  shutdown
);

process.on(
  "SIGINT",
  shutdown
);

startServer();
