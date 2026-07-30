"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT) || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const WEBHOOK_SECRET =
  process.env.TELEGRAM_WEBHOOK_SECRET || "";

const MINI_APP_LINK =
  process.env.MINI_APP_LINK ||
  "https://t.me/ArbifyPulseAppBot?startapp";

const PUBLIC_ROOT = __dirname;

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

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });

  response.end(JSON.stringify(data));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1_000_000) {
        reject(
          new Error("Request body is too large")
        );

        request.destroy();
      }
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(
          new Error("Invalid JSON")
        );
      }
    });

    request.on("error", reject);
  });
}

async function telegramRequest(method, payload) {
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
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const result = await response.json();

  if (!result.ok) {
    throw new Error(
      result.description ||
        "Telegram API request failed"
    );
  }

  return result.result;
}

async function sendLaunchMessage(chatId) {
  return telegramRequest("sendMessage", {
    chat_id: chatId,
    text: [
      "<b>🚀 ARBIFY PULSE</b>",
      "",
      "Accedi alla piattaforma ufficiale, ai segnali personalizzati, all’analisi LIVE e ai bonus.",
      "",
      "18+ · Gioca responsabilmente",
    ].join("\n"),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🚀 APRI ARBIFY PULSE",
            url: MINI_APP_LINK,
          },
        ],
      ],
    },
  });
}

async function processTelegramUpdate(update) {
  const message = update.message;

  if (!message || !message.chat) {
    return;
  }

  const chatId = message.chat.id;
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

  if (launchCommands.has(command)) {
    await sendLaunchMessage(chatId);
  }
}

function serveStaticFile(request, response) {
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

  const requestedFile = path.basename(pathname);

  if (BLOCKED_FILES.has(requestedFile)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const filePath = path.resolve(
    PUBLIC_ROOT,
    `.${pathname}`
  );

  const safeRoot = `${path.resolve(
    PUBLIC_ROOT
  )}${path.sep}`;

  if (
    filePath !== path.resolve(PUBLIC_ROOT) &&
    !filePath.startsWith(safeRoot)
  ) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (
      error ||
      !stats.isFile()
    ) {
      response.writeHead(404, {
        "Content-Type":
          "text/plain; charset=utf-8",
      });

      response.end("Not found");
      return;
    }

    const extension =
      path.extname(filePath).toLowerCase();

    const contentType =
      MIME_TYPES[extension] ||
      "application/octet-stream";

    response.writeHead(200, {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy":
        "strict-origin-when-cross-origin",
    });

    const stream =
      fs.createReadStream(filePath);

    stream.pipe(response);

    stream.on("error", () => {
      if (!response.headersSent) {
        response.writeHead(500);
      }

      response.end();
    });
  });
}

const server = http.createServer(
  async (request, response) => {
    const requestUrl = new URL(
      request.url,
      "http://localhost"
    );

    if (
      request.method === "GET" &&
      requestUrl.pathname === "/health"
    ) {
      sendJson(response, 200, {
        ok: true,
        service: "arbify-pulse",
      });

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
          receivedSecret !== WEBHOOK_SECRET
        ) {
          sendJson(response, 403, {
            ok: false,
          });

          return;
        }
      }

      try {
        const update =
          await readJsonBody(request);

        sendJson(response, 200, {
          ok: true,
        });

        processTelegramUpdate(
          update
        ).catch((error) => {
          console.error(
            "Telegram update error:",
            error.message
          );
        });
      } catch {
        sendJson(response, 400, {
          ok: false,
        });
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
      Allow: "GET, HEAD, POST",
    });

    response.end("Method not allowed");
  }
);

server.listen(PORT, () => {
  console.log(
    `ARBIFY PULSE is running on port ${PORT}`
  );
});
