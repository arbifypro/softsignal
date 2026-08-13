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

const TELEGRAM_CHANNEL_CHAT_ID =
  process.env.TELEGRAM_CHANNEL_CHAT_ID || "";

const ACCESS_KEY = normalizeAccessKey(
  process.env.ACCESS_KEY || ""
);

const MINI_APP_LINK =
  process.env.MINI_APP_LINK ||
  "https://t.me/ArbifyPulseAppBot?startapp";

const PUBLIC_ROOT = __dirname;
const TELEGRAM_AUTH_MAX_AGE_SECONDS = 86_400;
const MAX_STATE_SIZE = 100_000;
const WEEKLY_REWARD = 300;
const SIGNAL_ACTIVITY_COOLDOWN_SECONDS = 4;

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
  "notifications",
  "signalHistory",
  "favorites",
  "selectedSlot",
  "lastSignal",
  "profile",
  "preferences",
]);

const REWARD_TASKS = Object.freeze({
  "telegram-bot": {
    reward: 100,
    defaultStatus: "available",
  },

  "telegram-channel": {
    reward: 80,
    defaultStatus: "available",
  },

  "complete-profile": {
    reward: 50,
    defaultStatus: "checkable",
  },

  notifications: {
    reward: 30,
    defaultStatus: "available",
  },

  "confirm-subid": {
    reward: 150,
    defaultStatus: "checkable",
  },

  "favorite-slots": {
    reward: 40,
    defaultStatus: "progress",
  },

  "first-signal": {
    reward: 30,
    defaultStatus: "available",
  },

  "view-live": {
    reward: 10,
    defaultStatus: "available",
  },

  "responsible-guide": {
    reward: 30,
    defaultStatus: "available",
  },

  "signal-master": {
    reward: 100,
    defaultStatus: "progress",
  },
});

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
    error: "Errore interno del server",
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
            "Il contenuto della richiesta è troppo grande"
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
            "JSON non valido"
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
      "Lo stato deve essere un oggetto"
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

  let serialized;

  try {
    serialized = JSON.stringify(patch);
  } catch {
    throw new ApiError(
      400,
      "Lo stato non è un JSON valido"
    );
  }

  if (serialized.length > MAX_STATE_SIZE) {
    throw new ApiError(
      413,
      "Lo stato è troppo grande"
    );
  }

  return JSON.parse(serialized);
}

function validateTelegramInitData(initData) {
  if (!BOT_TOKEN) {
    throw new ApiError(
      503,
      "Autenticazione Telegram non disponibile"
    );
  }

  if (
    typeof initData !== "string" ||
    !initData ||
    initData.length > 20_000
  ) {
    throw new ApiError(
      401,
      "È richiesta l’autenticazione tramite Telegram"
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
      "Autenticazione Telegram non valida"
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
      "Autenticazione Telegram non valida"
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
      "La sessione Telegram è scaduta"
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
      "Dati utente Telegram mancanti"
    );
  }

  const telegramId = String(
    telegramUser?.id || ""
  );

  if (!/^\d{1,20}$/.test(telegramId)) {
    throw new ApiError(
      401,
      "Dati utente Telegram non validi"
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
      ALTER TABLE arbify_users
      ADD COLUMN IF NOT EXISTS
        pulse_balance INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS
        pulse_level INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS
        weekly_reward_claimed BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS
        rewards_migrated_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS
        bot_started_at TIMESTAMPTZ
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS arbify_user_activity (
        telegram_id BIGINT PRIMARY KEY
          REFERENCES arbify_users(telegram_id)
          ON DELETE CASCADE,
        profile_completed_at TIMESTAMPTZ,
        notifications_enabled_at TIMESTAMPTZ,
        live_viewed_at TIMESTAMPTZ,
        responsible_guide_read_at TIMESTAMPTZ,
        signals_created INTEGER NOT NULL DEFAULT 0,
        last_signal_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS arbify_reward_claims (
        telegram_id BIGINT NOT NULL
          REFERENCES arbify_users(telegram_id)
          ON DELETE CASCADE,
        task_id TEXT NOT NULL,
        reward INTEGER NOT NULL,
        claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (telegram_id, task_id)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS
        arbify_users_last_seen_idx
      ON arbify_users(last_seen_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS
        arbify_reward_claims_user_idx
      ON arbify_reward_claims(
        telegram_id,
        claimed_at DESC
      )
    `);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");

    throw error;
  } finally {
    client.release();
  }
}

function toSafeNonNegativeInteger(
  value,
  maximum = 1_000_000_000
) {
  const number = Number(value);

  if (
    !Number.isSafeInteger(number) ||
    number < 0
  ) {
    return 0;
  }

  return Math.min(number, maximum);
}

function getPulseUnlocks(level) {
  const unlocks = [
    "base-access",
  ];

  if (level >= 2) {
    unlocks.push("profile-frame");
  }

  if (level >= 3) {
    unlocks.push("premium-badge");
  }

  if (level >= 4) {
    unlocks.push("exclusive-theme");
  }

  return unlocks;
}

async function migrateLegacyRewardsForUser(
  telegramId
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        SELECT
          u.rewards_migrated_at,
          s.state
        FROM arbify_users AS u
        JOIN arbify_user_state AS s
          ON s.telegram_id = u.telegram_id
        WHERE u.telegram_id = $1
        FOR UPDATE OF u, s
      `,
      [
        telegramId,
      ]
    );

    const row = result.rows[0];

    if (
      !row ||
      row.rewards_migrated_at
    ) {
      await client.query("COMMIT");
      return;
    }

    const state =
      row.state &&
      typeof row.state === "object"
        ? row.state
        : {};

    const balance =
      toSafeNonNegativeInteger(
        state.pulseBalance
      );

    const level =
      calculatePulseLevel(balance);

    const completedTasks =
      state.completedTasks &&
      typeof state.completedTasks ===
        "object"
        ? state.completedTasks
        : {};

    for (
      const [taskId, definition] of
      Object.entries(REWARD_TASKS)
    ) {
      const taskRecord =
        completedTasks[taskId];

      if (
        taskRecord?.status !==
        "completed"
      ) {
        continue;
      }

      const completedAt =
        Number(taskRecord.completedAt);

      const claimedAt =
        Number.isFinite(completedAt) &&
        completedAt > 0
          ? new Date(completedAt)
          : new Date();

      await client.query(
        `
          INSERT INTO arbify_reward_claims (
            telegram_id,
            task_id,
            reward,
            claimed_at
          )
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (telegram_id, task_id)
          DO NOTHING
        `,
        [
          telegramId,
          taskId,
          definition.reward,
          claimedAt,
        ]
      );
    }

    const rewardsRecord =
      state.taskProgress?.rewards &&
      typeof state.taskProgress
        .rewards === "object"
        ? state.taskProgress.rewards
        : {};

    const signalHistoryCount =
      Array.isArray(state.signalHistory)
        ? state.signalHistory.length
        : 0;

    const signalsCreated = Math.max(
      toSafeNonNegativeInteger(
        state.taskProgress
          ?.createdSignalCount,
        100_000
      ),

      toSafeNonNegativeInteger(
        rewardsRecord.progress
          ?.signalMaster,
        100_000
      ),

      signalHistoryCount,
      state.lastSignal ? 1 : 0
    );

    await client.query(
      `
        INSERT INTO arbify_user_activity (
          telegram_id,
          profile_completed_at,
          notifications_enabled_at,
          live_viewed_at,
          signals_created,
          updated_at
        )
        VALUES (
          $1,
          CASE WHEN $2 THEN NOW() ELSE NULL END,
          CASE WHEN $3 THEN NOW() ELSE NULL END,
          CASE WHEN $4 THEN NOW() ELSE NULL END,
          $5,
          NOW()
        )
        ON CONFLICT (telegram_id)
        DO UPDATE SET
          profile_completed_at = COALESCE(
            arbify_user_activity.profile_completed_at,
            EXCLUDED.profile_completed_at
          ),
          notifications_enabled_at = COALESCE(
            arbify_user_activity.notifications_enabled_at,
            EXCLUDED.notifications_enabled_at
          ),
          live_viewed_at = COALESCE(
            arbify_user_activity.live_viewed_at,
            EXCLUDED.live_viewed_at
          ),
          signals_created = GREATEST(
            arbify_user_activity.signals_created,
            EXCLUDED.signals_created
          ),
          updated_at = NOW()
      `,
      [
        telegramId,
        state.profile?.completed === true,
        state.notifications?.enabled === true,
        state.taskProgress
          ?.viewedLiveSignals === true,
        signalsCreated,
      ]
    );

    await client.query(
      `
        UPDATE arbify_users
        SET
          pulse_balance = $2,
          pulse_level = $3,
          weekly_reward_claimed = $4,
          rewards_migrated_at = NOW()
        WHERE telegram_id = $1
      `,
      [
        telegramId,
        balance,
        level,
        rewardsRecord
          .weeklyRewardClaimed === true,
      ]
    );

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

  await pool.query(
    `
      INSERT INTO arbify_user_activity (
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

  await migrateLegacyRewardsForUser(
    user.telegramId
  );

  const updatedResult = await pool.query(
    `
      SELECT *
      FROM arbify_users
      WHERE telegram_id = $1
    `,
    [
      user.telegramId,
    ]
  );

  return updatedResult.rows[0] ||
    result.rows[0];
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

async function getRawUserState(telegramId) {
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

function getTaskProgressFromContext(
  context
) {
  const favorites =
    Array.isArray(context.state.favorites)
      ? Array.from(
          new Set(
            context.state.favorites
              .map((value) => {
                return safeText(
                  String(value || ""),
                  128
                );
              })
              .filter(Boolean)
          )
        )
      : [];

  return {
    favoriteSlots: Math.min(
      favorites.length,
      3
    ),
    favoriteSlotsMaximum: 3,
    createdSignalCount:
      toSafeNonNegativeInteger(
        context.activity
          .signals_created,
        100_000
      ),
    signalMaster: Math.min(
      toSafeNonNegativeInteger(
        context.activity
          .signals_created,
        100_000
      ),
      10
    ),
    signalMasterMaximum: 10,
  };
}

async function getRewardContext(
  telegramId,
  queryable = pool
) {
  const result = await queryable.query(
    `
      SELECT
        u.*,
        s.state,
        a.profile_completed_at,
        a.notifications_enabled_at,
        a.live_viewed_at,
        a.responsible_guide_read_at,
        a.signals_created,
        a.last_signal_at
      FROM arbify_users AS u
      JOIN arbify_user_state AS s
        ON s.telegram_id = u.telegram_id
      LEFT JOIN arbify_user_activity AS a
        ON a.telegram_id = u.telegram_id
      WHERE u.telegram_id = $1
    `,
    [
      telegramId,
    ]
  );

  const row = result.rows[0];

  if (!row) {
    throw new ApiError(
      404,
      "Utente non trovato"
    );
  }

  const claimsResult =
    await queryable.query(
      `
        SELECT
          task_id,
          reward,
          claimed_at
        FROM arbify_reward_claims
        WHERE telegram_id = $1
        ORDER BY claimed_at ASC
      `,
      [
        telegramId,
      ]
    );

  return {
    user: row,
    state:
      row.state &&
      typeof row.state === "object"
        ? row.state
        : {},
    activity: row,
    claims: claimsResult.rows,
  };
}

async function isTelegramChannelMember(
  telegramId
) {
  if (!TELEGRAM_CHANNEL_CHAT_ID) {
    throw new ApiError(
      503,
      "La verifica del canale Telegram non è configurata",
      {
        code:
          "CHANNEL_VERIFICATION_NOT_CONFIGURED",
      }
    );
  }

  const member = await telegramRequest(
    "getChatMember",
    {
      chat_id:
        TELEGRAM_CHANNEL_CHAT_ID,
      user_id:
        Number(telegramId),
    }
  );

  if (
    [
      "creator",
      "administrator",
      "member",
    ].includes(member.status)
  ) {
    return true;
  }

  return (
    member.status === "restricted" &&
    member.is_member === true
  );
}

async function evaluateRewardTask(
  taskId,
  context,
  {
    checkExternal = false,
  } = {}
) {
  const progress =
    getTaskProgressFromContext(
      context
    );

  if (taskId === "telegram-bot") {
    return {
      eligible: Boolean(
        context.user.bot_started_at
      ),
      message:
        "Avvia prima il bot Telegram ufficiale.",
    };
  }

  if (
    taskId === "telegram-channel"
  ) {
    if (!checkExternal) {
      return {
        eligible: false,
        message:
          "L’iscrizione verrà verificata dopo aver premuto il pulsante.",
      };
    }

    return {
      eligible:
        await isTelegramChannelMember(
          context.user.telegram_id
        ),
      message:
        "Iscrizione al canale Telegram non trovata.",
    };
  }

  if (
    taskId === "complete-profile"
  ) {
    return {
      eligible: Boolean(
        context.activity
          .profile_completed_at ||
          context.state.profile
            ?.completed === true
      ),
      message:
        "Apri e completa prima la pagina del profilo.",
    };
  }

  if (taskId === "notifications") {
    return {
      eligible: Boolean(
        context.activity
          .notifications_enabled_at
      ),
      message:
        "Abilita prima le notifiche.",
    };
  }

  if (taskId === "confirm-subid") {
    return {
      eligible: Boolean(
        safeText(
          context.state.subid,
          128
        )
      ),
      message:
        "Verifica prima il tuo SUBID.",
    };
  }

  if (taskId === "favorite-slots") {
    return {
      eligible:
        progress.favoriteSlots >=
        progress.favoriteSlotsMaximum,
      message:
        `Aggiunti ${progress.favoriteSlots} su ` +
        `${progress.favoriteSlotsMaximum} slot.`,
    };
  }

  if (taskId === "first-signal") {
    return {
      eligible:
        context.activity
          .signals_created >= 1,
      message:
        "Crea prima il tuo primo segnale.",
    };
  }

  if (taskId === "view-live") {
    return {
      eligible: Boolean(
        context.activity.live_viewed_at
      ),
      message:
        "Apri prima la pagina dei segnali LIVE.",
    };
  }

  if (
    taskId === "responsible-guide"
  ) {
    return {
      eligible: Boolean(
        context.activity
          .responsible_guide_read_at
      ),
      message:
        "Leggi prima le regole sul gioco responsabile.",
    };
  }

  if (taskId === "signal-master") {
    return {
      eligible:
        progress.signalMaster >=
        progress.signalMasterMaximum,
      message:
        `Creati ${progress.signalMaster} su ` +
        `${progress.signalMasterMaximum} segnali.`,
    };
  }

  return {
    eligible: false,
    message:
      "Attività non trovata.",
  };
}

async function createRewardsSnapshot(
  telegramId,
  {
    externallyVerifiedTaskId = null,
  } = {}
) {
  const context =
    await getRewardContext(
      telegramId
    );

  const claimedTasks = new Map(
    context.claims.map((claim) => {
      return [
        claim.task_id,
        claim,
      ];
    })
  );

  const tasks = {};

  for (
    const [taskId, definition] of
    Object.entries(REWARD_TASKS)
  ) {
    const claim =
      claimedTasks.get(taskId);

    if (claim) {
      tasks[taskId] = {
        status: "completed",
        completedAt:
          new Date(
            claim.claimed_at
          ).getTime(),
      };

      continue;
    }

    const verification =
      await evaluateRewardTask(
        taskId,
        context,
        {
          checkExternal:
            taskId ===
              externallyVerifiedTaskId,
        }
      );

    tasks[taskId] = {
      status:
        verification.eligible
          ? "claimable"
          : definition.defaultStatus,
    };
  }

  const balance =
    toSafeNonNegativeInteger(
      context.user.pulse_balance
    );

  const level =
    calculatePulseLevel(balance);

  return {
    balance,
    level,
    highestLevel: level,
    unlockedLevelRewards:
      getPulseUnlocks(level),
    weeklyProgress: Math.min(
      context.claims.length,
      7
    ),
    weeklyRewardClaimed:
      context.user
        .weekly_reward_claimed === true,
    tasks,
    progress:
      getTaskProgressFromContext(
        context
      ),
    taskNoticeIds: [],
  };
}

function createLegacyRewardsState(
  rewards
) {
  return {
    pulseBalance: rewards.balance,
    pulseLevel: rewards.level,
    pulseUnlocks:
      rewards.unlockedLevelRewards,
    completedTasks: rewards.tasks,
    taskProgress: {
      rewards: {
        highestLevel:
          rewards.highestLevel,
        weeklyProgress:
          rewards.weeklyProgress,
        weeklyRewardClaimed:
          rewards.weeklyRewardClaimed,
        progress: rewards.progress,
        taskNoticeIds:
          rewards.taskNoticeIds,
      },
      createdSignalCount:
        rewards.progress
          .createdSignalCount,
      viewedLiveSignals:
        rewards.tasks["view-live"]
          ?.status !== "available",
    },
  };
}

async function getUserState(telegramId) {
  const rawState =
    await getRawUserState(
      telegramId
    );

  const rewards =
    await createRewardsSnapshot(
      telegramId
    );

  return {
    ...rawState,
    ...createLegacyRewardsState(
      rewards
    ),
  };
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
        "La chiave di accesso non è configurata"
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
        "Troppi tentativi",
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
          ? "Troppi tentativi"
          : "Chiave di accesso non valida",

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
        "L’accesso non è stato attivato"
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

    const state =
      await getUserState(
        user.telegram_id
      );

    sendJson(response, 200, {
      ok: true,

      state,

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

async function requireActivatedUser(
  body
) {
  const user =
    await authenticateRequest(body);

  if (!user.access_granted) {
    throw new ApiError(
      403,
      "L’accesso non è stato attivato"
    );
  }

  return user;
}

async function handleRewardsStatus(
  request,
  response
) {
  try {
    const body =
      await readJsonBody(request);

    const user =
      await requireActivatedUser(body);

    const rewards =
      await createRewardsSnapshot(
        user.telegram_id
      );

    sendJson(response, 200, {
      ok: true,
      rewards,
    });
  } catch (error) {
    sendApiError(response, error);
  }
}

async function handleRewardVerification(
  request,
  response
) {
  try {
    const body =
      await readJsonBody(request);

    const user =
      await requireActivatedUser(body);

    const taskId = safeText(
      body.taskId,
      64
    );

    if (
      !taskId ||
      !REWARD_TASKS[taskId]
    ) {
      throw new ApiError(
        404,
        "Attività premio non trovata"
      );
    }

    const context =
      await getRewardContext(
        user.telegram_id
      );

    const alreadyClaimed =
      context.claims.some((claim) => {
        return claim.task_id === taskId;
      });

    if (!alreadyClaimed) {
      const verification =
        await evaluateRewardTask(
          taskId,
          context,
          {
            checkExternal: true,
          }
        );

      if (!verification.eligible) {
        throw new ApiError(
          409,
          verification.message,
          {
            code:
              "TASK_NOT_COMPLETED",
            taskId,
          }
        );
      }
    }

    const rewards =
      await createRewardsSnapshot(
        user.telegram_id,
        {
          externallyVerifiedTaskId:
            taskId,
        }
      );

    sendJson(response, 200, {
      ok: true,
      eligible: true,
      taskId,
      rewards,
    });
  } catch (error) {
    sendApiError(response, error);
  }
}

async function handleRewardClaim(
  request,
  response
) {
  let client;

  try {
    const body =
      await readJsonBody(request);

    const user =
      await requireActivatedUser(body);

    const taskId = safeText(
      body.taskId,
      64
    );

    const definition =
      REWARD_TASKS[taskId];

    if (!taskId || !definition) {
      throw new ApiError(
        404,
        "Attività premio non trovata"
      );
    }

    const context =
      await getRewardContext(
        user.telegram_id
      );

    const alreadyClaimed =
      context.claims.some((claim) => {
        return claim.task_id === taskId;
      });

    if (!alreadyClaimed) {
      const verification =
        await evaluateRewardTask(
          taskId,
          context,
          {
            checkExternal: true,
          }
        );

      if (!verification.eligible) {
        throw new ApiError(
          409,
          verification.message,
          {
            code:
              "TASK_NOT_COMPLETED",
            taskId,
          }
        );
      }
    }

    client = await pool.connect();
    await client.query("BEGIN");

    const lockedResult =
      await client.query(
        `
          SELECT
            pulse_balance,
            weekly_reward_claimed
          FROM arbify_users
          WHERE telegram_id = $1
          FOR UPDATE
        `,
        [
          user.telegram_id,
        ]
      );

    const lockedUser =
      lockedResult.rows[0];

    if (!lockedUser) {
      throw new ApiError(
        404,
        "Utente non trovato"
      );
    }

    const claimResult =
      await client.query(
        `
          INSERT INTO arbify_reward_claims (
            telegram_id,
            task_id,
            reward
          )
          VALUES ($1, $2, $3)
          ON CONFLICT (telegram_id, task_id)
          DO NOTHING
          RETURNING task_id
        `,
        [
          user.telegram_id,
          taskId,
          definition.reward,
        ]
      );

    const newlyClaimed =
      claimResult.rowCount === 1;

    let receivedReward = 0;
    let weeklyRewardReceived = 0;

    if (newlyClaimed) {
      receivedReward =
        definition.reward;

      const countResult =
        await client.query(
          `
            SELECT COUNT(*)::INTEGER AS count
            FROM arbify_reward_claims
            WHERE telegram_id = $1
          `,
          [
            user.telegram_id,
          ]
        );

      const completedCount =
        Number(
          countResult.rows[0]?.count
        ) || 0;

      if (
        completedCount >= 7 &&
        !lockedUser
          .weekly_reward_claimed
      ) {
        weeklyRewardReceived =
          WEEKLY_REWARD;
      }

      const newBalance =
        toSafeNonNegativeInteger(
          lockedUser.pulse_balance
        ) +
        receivedReward +
        weeklyRewardReceived;

      await client.query(
        `
          UPDATE arbify_users
          SET
            pulse_balance = $2,
            pulse_level = $3,
            weekly_reward_claimed =
              CASE
                WHEN $4 > 0 THEN TRUE
                ELSE weekly_reward_claimed
              END,
            last_seen_at = NOW()
          WHERE telegram_id = $1
        `,
        [
          user.telegram_id,
          newBalance,
          calculatePulseLevel(
            newBalance
          ),
          weeklyRewardReceived,
        ]
      );
    }

    await client.query("COMMIT");
    client.release();
    client = null;

    const rewards =
      await createRewardsSnapshot(
        user.telegram_id
      );

    sendJson(response, 200, {
      ok: true,
      taskId,
      newlyClaimed,
      receivedReward,
      weeklyRewardReceived,
      rewards,
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK")
        .catch(() => {});
    }

    sendApiError(response, error);
  } finally {
    client?.release();
  }
}

async function handleActivityRecord(
  request,
  response
) {
  try {
    const body =
      await readJsonBody(request);

    const user =
      await requireActivatedUser(body);

    const activityType = safeText(
      body.type,
      64
    );

    let activityRecorded = true;

    if (
      activityType ===
      "profile-completed"
    ) {
      await pool.query(
        `
          UPDATE arbify_user_activity
          SET
            profile_completed_at = COALESCE(
              profile_completed_at,
              NOW()
            ),
            updated_at = NOW()
          WHERE telegram_id = $1
        `,
        [
          user.telegram_id,
        ]
      );
    } else if (
      activityType ===
      "notifications-enabled"
    ) {
      if (
        body.payload?.permission !==
        "granted"
      ) {
        throw new ApiError(
          400,
          "L’autorizzazione alle notifiche non è stata concessa"
        );
      }

      await pool.query(
        `
          UPDATE arbify_user_activity
          SET
            notifications_enabled_at = COALESCE(
              notifications_enabled_at,
              NOW()
            ),
            updated_at = NOW()
          WHERE telegram_id = $1
        `,
        [
          user.telegram_id,
        ]
      );
    } else if (
      activityType === "live-viewed"
    ) {
      await pool.query(
        `
          UPDATE arbify_user_activity
          SET
            live_viewed_at = COALESCE(
              live_viewed_at,
              NOW()
            ),
            updated_at = NOW()
          WHERE telegram_id = $1
        `,
        [
          user.telegram_id,
        ]
      );
    } else if (
      activityType ===
      "responsible-guide-read"
    ) {
      await pool.query(
        `
          UPDATE arbify_user_activity
          SET
            responsible_guide_read_at = COALESCE(
              responsible_guide_read_at,
              NOW()
            ),
            updated_at = NOW()
          WHERE telegram_id = $1
        `,
        [
          user.telegram_id,
        ]
      );
    } else if (
      activityType ===
      "signal-created"
    ) {
      const result = await pool.query(
        `
          UPDATE arbify_user_activity
          SET
            signals_created =
              signals_created + 1,
            last_signal_at = NOW(),
            updated_at = NOW()
          WHERE telegram_id = $1
            AND (
              last_signal_at IS NULL OR
              last_signal_at <=
                NOW() -
                ($2 * INTERVAL '1 second')
            )
          RETURNING signals_created
        `,
        [
          user.telegram_id,
          SIGNAL_ACTIVITY_COOLDOWN_SECONDS,
        ]
      );

      activityRecorded =
        result.rowCount === 1;
    } else {
      throw new ApiError(
        400,
        "Tipo di attività non supportato"
      );
    }

    const rewards =
      await createRewardsSnapshot(
        user.telegram_id
      );

    sendJson(response, 200, {
      ok: true,
      activityRecorded,
      rewards,
    });
  } catch (error) {
    sendApiError(response, error);
  }
}

async function telegramRequest(
  method,
  payload
) {
  if (!BOT_TOKEN) {
    throw new Error(
      "BOT_TOKEN non è configurato"
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
      "Richiesta API Telegram non riuscita"
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
    if (message.from?.id) {
      await pool.query(
        `
          UPDATE arbify_users
          SET
            bot_started_at = COALESCE(
              bot_started_at,
              NOW()
            ),
            last_seen_at = NOW()
          WHERE telegram_id = $1
        `,
        [
          String(message.from.id),
        ]
      );
    }

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
    response.end("Richiesta non valida");

    return;
  }

  if (pathname === "/") {
    pathname = "/index.html";
  } else if (pathname.endsWith("/")) {
    pathname += "index.html";
  }

  const requestedFile =
    path.basename(pathname);

  if (
    BLOCKED_FILES.has(
      requestedFile
    )
  ) {
    response.writeHead(404);
    response.end("Non trovato");

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
    response.end("Accesso negato");

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
          "Non trovato"
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
        "/api/rewards/status"
    ) {
      await handleRewardsStatus(
        request,
        response
      );

      return;
    }

    if (
      request.method === "POST" &&
      requestUrl.pathname ===
        "/api/rewards/verify"
    ) {
      await handleRewardVerification(
        request,
        response
      );

      return;
    }

    if (
      request.method === "POST" &&
      requestUrl.pathname ===
        "/api/rewards/claim"
    ) {
      await handleRewardClaim(
        request,
        response
      );

      return;
    }

    if (
      request.method === "POST" &&
      requestUrl.pathname ===
        "/api/activity/record"
    ) {
      await handleActivityRecord(
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
      "Metodo non consentito"
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
