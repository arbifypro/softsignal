"use strict";

/*
 * =========================================================
 * ARBIFY PULSE — ПРОФІЛЬ
 * =========================================================
 */

const ACCESS_STORAGE_KEY = "arbifyAccess";
const REWARDS_STORAGE_KEY = "arbifyRewardsStateV2";
const SUBID_STORAGE_KEY = "arbifyVerifiedSubId";
const SIGNAL_COUNT_STORAGE_KEY = "arbifyCreatedSignalCount";
const LAST_SIGNAL_STORAGE_KEY = "arbifyLastSignal";
const PROFILE_COMPLETED_STORAGE_KEY = "arbifyProfileCompleted";
const PROFILE_NAME_STORAGE_KEY = "arbifyProfileName";
const PULSE_LEVEL_STORAGE_KEY = "arbifyPulseLevel";
const PULSE_UNLOCKS_STORAGE_KEY = "arbifyPulseUnlocks";

const PULSE_LEVELS = Object.freeze([
  {
    level: 1,
    minimum: 0,
    maximum: 250,
    name: "STARTER",
    unlockKey: "base-access",
  },
  {
    level: 2,
    minimum: 250,
    maximum: 600,
    name: "ACTIVE",
    unlockKey: "profile-frame",
  },
  {
    level: 3,
    minimum: 600,
    maximum: 1200,
    name: "PREMIUM",
    unlockKey: "premium-badge",
  },
  {
    level: 4,
    minimum: 1200,
    maximum: null,
    name: "ELITE",
    unlockKey: "exclusive-theme",
  },
]);

/*
 * Вкажи username менеджера БЕЗ символу @.
 */
const TELEGRAM_SUPPORT_USERNAME = "YOUR_USERNAME";

const TOAST_DURATION = 2600;
const LOGOUT_CONFIRM_DURATION = 3600;

/*
 * Захист сторінки.
 */
if (
  sessionStorage.getItem(ACCESS_STORAGE_KEY) !==
  "granted"
) {
  window.location.replace("index.html");
}

/*
 * =========================================================
 * ЕЛЕМЕНТИ СТОРІНКИ
 * =========================================================
 */

const profileMemberName = document.querySelector(
  "#profileMemberName"
);

const profileLevel = document.querySelector(
  "#profileLevel"
);

const profileLevelProgress = document.querySelector(
  "#profileLevelProgress"
);

const profileLevelTrack = document.querySelector(
  "#profileLevelTrack"
);

const profileLevelBar = document.querySelector(
  "#profileLevelBar"
);

const profileAccessKey = document.querySelector(
  "#profileAccessKey"
);

const profileSubId = document.querySelector(
  "#profileSubId"
);

const profilePulseBalance = document.querySelector(
  "#profilePulseBalance"
);

const profileSignalCount = document.querySelector(
  "#profileSignalCount"
);

const profileTaskCount = document.querySelector(
  "#profileTaskCount"
);

const profileNotificationsButton =
  document.querySelector(
    "#profileNotificationsButton"
  );

const profileNotificationStatus =
  document.querySelector(
    "#profileNotificationStatus"
  );

const profileLanguageButton = document.querySelector(
  "#profileLanguageButton"
);

const profileSupportButton = document.querySelector(
  "#profileSupportButton"
);

const logoutButton = document.querySelector(
  "#logoutButton"
);

const toast = document.querySelector("#toast");
const toastText = document.querySelector("#toastText");

let toastTimer;
let logoutConfirmTimer;
let logoutConfirmationActive = false;

/*
 * =========================================================
 * ДОПОМІЖНІ ФУНКЦІЇ
 * =========================================================
 */

function setAppHeight() {
  const height =
    window.visualViewport?.height ||
    window.innerHeight;

  document.documentElement.style.setProperty(
    "--app-height",
    `${height}px`
  );
}

function formatNumber(value) {
  return new Intl.NumberFormat("uk-UA").format(
    Math.max(
      0,
      Math.floor(Number(value) || 0)
    )
  );
}

function showToast(message) {
  window.clearTimeout(toastTimer);

  toastText.textContent = message;
  toast.classList.add("is-visible");

  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, TOAST_DURATION);
}

function readJsonStorage(
  storage,
  key,
  fallbackValue
) {
  try {
    const storedValue = storage.getItem(key);

    if (!storedValue) {
      return fallbackValue;
    }

    return JSON.parse(storedValue);
  } catch {
    return fallbackValue;
  }
}

function readRewardsState() {
  const storedState = readJsonStorage(
    localStorage,
    REWARDS_STORAGE_KEY,
    null
  );

  if (
    !storedState ||
    typeof storedState !== "object"
  ) {
    return {
      balance: 0,
      tasks: {},
      unlockedLevelRewards: ["base-access"],
    };
  }

  const savedUnlocks = Array.isArray(
    storedState.unlockedLevelRewards
  )
    ? storedState.unlockedLevelRewards
    : readJsonStorage(
        localStorage,
        PULSE_UNLOCKS_STORAGE_KEY,
        []
      );

  return {
    balance: Math.max(
      0,
      Number(storedState.balance) || 0
    ),

    tasks:
      storedState.tasks &&
      typeof storedState.tasks === "object"
        ? storedState.tasks
        : {},

    unlockedLevelRewards: Array.from(
      new Set([
        "base-access",
        ...(Array.isArray(savedUnlocks)
          ? savedUnlocks
          : []),
      ])
    ),
  };
}

function readCreatedSignalCount() {
  const storedValue =
    localStorage.getItem(
      SIGNAL_COUNT_STORAGE_KEY
    ) ||
    sessionStorage.getItem(
      SIGNAL_COUNT_STORAGE_KEY
    );

  const parsedValue = Number(storedValue);

  if (
    Number.isFinite(parsedValue) &&
    parsedValue > 0
  ) {
    return Math.floor(parsedValue);
  }

  return sessionStorage.getItem(
    LAST_SIGNAL_STORAGE_KEY
  )
    ? 1
    : 0;
}

function countCompletedTasks(tasks) {
  return Object.values(tasks).filter(
    (task) => {
      return (
        task &&
        typeof task === "object" &&
        task.status === "completed"
      );
    }
  ).length;
}

/*
 * =========================================================
 * РІВНІ PULSE
 * =========================================================
 */

function getLevelData(balance) {
  const normalizedBalance = Math.max(
    Number(balance) || 0,
    0
  );

  return (
    [...PULSE_LEVELS]
      .reverse()
      .find((levelData) => {
        return (
          normalizedBalance >=
          levelData.minimum
        );
      }) || PULSE_LEVELS[0]
  );
}

function getUnlockedLevelRewards(
  balance,
  savedUnlocks = []
) {
  const unlockedRewards = new Set([
    "base-access",
    ...(Array.isArray(savedUnlocks)
      ? savedUnlocks
      : []),
  ]);

  PULSE_LEVELS.forEach((levelData) => {
    if (balance >= levelData.minimum) {
      unlockedRewards.add(
        levelData.unlockKey
      );
    }
  });

  return Array.from(unlockedRewards);
}

function applyProfileLevelState(
  levelData,
  unlockedRewards
) {
  const levelValue = String(
    levelData.level
  );

  document.documentElement.dataset.pulseLevel =
    levelValue;

  document.body.dataset.pulseLevel =
    levelValue;

  document.body.classList.toggle(
    "has-profile-frame",
    unlockedRewards.includes(
      "profile-frame"
    )
  );

  document.body.classList.toggle(
    "has-premium-badge",
    unlockedRewards.includes(
      "premium-badge"
    )
  );

  document.body.classList.toggle(
    "has-exclusive-theme",
    unlockedRewards.includes(
      "exclusive-theme"
    )
  );

  try {
    localStorage.setItem(
      PULSE_LEVEL_STORAGE_KEY,
      levelValue
    );

    localStorage.setItem(
      PULSE_UNLOCKS_STORAGE_KEY,
      JSON.stringify(unlockedRewards)
    );
  } catch {
    /*
     * Профіль продовжить працювати,
     * навіть якщо localStorage недоступний.
     */
  }
}

function maskSubId(value) {
  const normalizedValue =
    String(value || "").trim();

  if (!normalizedValue) {
    return "Не підтверджено";
  }

  if (normalizedValue.length <= 2) {
    return "•".repeat(
      normalizedValue.length
    );
  }

  if (normalizedValue.length <= 4) {
    return (
      normalizedValue.slice(0, 1) +
      "•".repeat(
        normalizedValue.length - 2
      ) +
      normalizedValue.slice(-1)
    );
  }

  return (
    normalizedValue.slice(0, 2) +
    "•".repeat(
      Math.min(
        normalizedValue.length - 4,
        6
      )
    ) +
    normalizedValue.slice(-2)
  );
}

function getProfileName() {
  try {
    const storedName = String(
      localStorage.getItem(
        PROFILE_NAME_STORAGE_KEY
      ) || ""
    ).trim();

    return storedName || "Учасник Pulse";
  } catch {
    return "Учасник Pulse";
  }
}

function isTelegramSupportConfigured() {
  const normalizedUsername = String(
    TELEGRAM_SUPPORT_USERNAME || ""
  )
    .trim()
    .replace(/^@+/, "");

  return (
    normalizedUsername.length > 0 &&
    normalizedUsername !== "YOUR_USERNAME"
  );
}

/*
 * =========================================================
 * ВІДОБРАЖЕННЯ ПРОФІЛЮ
 * =========================================================
 */

function renderProfile() {
  const rewardsState = readRewardsState();

  const balance = rewardsState.balance;

  const levelData = getLevelData(balance);

  const unlockedRewards =
    getUnlockedLevelRewards(
      balance,
      rewardsState.unlockedLevelRewards
    );

  const completedTasks =
    countCompletedTasks(
      rewardsState.tasks
    );

  const signalCount =
    readCreatedSignalCount();

  const verifiedSubId =
    sessionStorage.getItem(
      SUBID_STORAGE_KEY
    );

  const isMaximumLevel =
    levelData.maximum === null;

  const progressPercent = isMaximumLevel
    ? 100
    : Math.min(
        (balance / levelData.maximum) * 100,
        100
      );

  applyProfileLevelState(
    levelData,
    unlockedRewards
  );

  profileMemberName.textContent =
    getProfileName();

  profileLevel.textContent =
    String(levelData.level);

  profileLevelProgress.textContent =
    isMaximumLevel
      ? `${formatNumber(
          balance
        )} PULSE · MAX`
      : `${formatNumber(balance)} / ` +
        `${formatNumber(
          levelData.maximum
        )} PULSE`;

  profileLevelBar.style.width =
    `${progressPercent}%`;

  profileLevelTrack.setAttribute(
    "aria-valuemax",
    String(
      isMaximumLevel
        ? Math.max(
            levelData.minimum,
            balance
          )
        : levelData.maximum
    )
  );

  profileLevelTrack.setAttribute(
    "aria-valuenow",
    String(balance)
  );

  profileLevelTrack.setAttribute(
    "aria-label",
    `Рівень ${levelData.level}: ${levelData.name}`
  );

  profileAccessKey.textContent =
    "K7••••";

  profileSubId.textContent =
    maskSubId(verifiedSubId);

  profilePulseBalance.textContent =
    formatNumber(balance);

  profileSignalCount.textContent =
    formatNumber(signalCount);

  profileTaskCount.textContent =
    formatNumber(completedTasks);
}

function renderNotificationStatus() {
  if (!("Notification" in window)) {
    profileNotificationStatus.textContent =
      "Внутрішні активні";

    return;
  }

  if (
    Notification.permission === "granted"
  ) {
    profileNotificationStatus.textContent =
      "Дозволені";

    return;
  }

  if (
    Notification.permission === "denied"
  ) {
    profileNotificationStatus.textContent =
      "Заблоковані";

    return;
  }

  profileNotificationStatus.textContent =
    "Потрібен дозвіл";
}

/*
 * =========================================================
 * НАЛАШТУВАННЯ
 * =========================================================
 */

async function configureNotifications() {
  if (!("Notification" in window)) {
    showToast(
      "Внутрішні сповіщення Pulse вже працюють"
    );

    return;
  }

  if (
    Notification.permission === "denied"
  ) {
    showToast(
      "Дозвіл заблоковано у налаштуваннях браузера"
    );

    return;
  }

  if (
    Notification.permission === "granted"
  ) {
    showToast(
      "Системні сповіщення вже увімкнені"
    );

    return;
  }

  try {
    const permission =
      await Notification.requestPermission();

    renderNotificationStatus();

    if (permission === "granted") {
      showToast(
        "Сповіщення успішно увімкнено"
      );

      window.PulseNotifications?.add({
        type: "success",
        category: "НАЛАШТУВАННЯ",
        title: "Сповіщення увімкнено",
        message:
          "Тепер важливі події Pulse не загубляться.",
      });

      return;
    }

    showToast(
      "Сповіщення не було дозволено"
    );
  } catch {
    showToast(
      "Не вдалося змінити дозвіл сповіщень"
    );
  }
}

function openLanguageSettings() {
  showToast(
    "Італійську версію додамо після завершення української"
  );
}

function openTelegramSupport() {
  if (
    !isTelegramSupportConfigured()
  ) {
    showToast(
      "Telegram підтримки підключимо наприкінці розробки"
    );

    return;
  }

  const normalizedUsername = String(
    TELEGRAM_SUPPORT_USERNAME
  )
    .trim()
    .replace(/^@+/, "");

  window.open(
    `https://t.me/${normalizedUsername}`,
    "_blank",
    "noopener,noreferrer"
  );
}

/*
 * =========================================================
 * ВИХІД З АКАУНТА
 * =========================================================
 */

function resetLogoutConfirmation() {
  window.clearTimeout(
    logoutConfirmTimer
  );

  logoutConfirmationActive = false;

  logoutButton.removeAttribute(
    "data-confirming"
  );

  logoutButton.innerHTML = `
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M10 5H5.5v14H10"></path>
      <path d="M13.5 8.5 17 12l-3.5 3.5M8 12h9"></path>
    </svg>

    ВИЙТИ З АКАУНТА
  `;
}

function logout() {
  if (!logoutConfirmationActive) {
    logoutConfirmationActive = true;

    logoutButton.setAttribute(
      "data-confirming",
      "true"
    );

    logoutButton.textContent =
      "НАТИСНИ ЩЕ РАЗ ДЛЯ ВИХОДУ";

    showToast(
      "Повторне натискання підтвердить вихід"
    );

    logoutConfirmTimer =
      window.setTimeout(
        resetLogoutConfirmation,
        LOGOUT_CONFIRM_DURATION
      );

    return;
  }

  window.clearTimeout(
    logoutConfirmTimer
  );

  /*
   * Видаляємо лише поточний доступ.
   * Баланс, завдання та сповіщення
   * залишаються збереженими.
   */
  sessionStorage.removeItem(
    ACCESS_STORAGE_KEY
  );

  window.location.replace("index.html");
}

/*
 * =========================================================
 * МОБІЛЬНА ПОВЕДІНКА
 * =========================================================
 */

function preventPageZoom() {
  document.addEventListener(
    "gesturestart",
    (event) => {
      event.preventDefault();
    },
    {
      passive: false,
    }
  );

  document.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    },
    {
      passive: false,
    }
  );

  window.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey) {
        event.preventDefault();
      }
    },
    {
      passive: false,
    }
  );
}

/*
 * =========================================================
 * ЗАПУСК
 * =========================================================
 */

function initializeProfile() {
  /*
   * Цей прапорець використовує
   * сторінка бонусів для перевірки
   * завдання «Заповнити профіль».
   */
  sessionStorage.setItem(
    PROFILE_COMPLETED_STORAGE_KEY,
    "true"
  );

  setAppHeight();
  renderProfile();
  renderNotificationStatus();
  preventPageZoom();

  profileNotificationsButton.addEventListener(
    "click",
    configureNotifications
  );

  profileLanguageButton.addEventListener(
    "click",
    openLanguageSettings
  );

  profileSupportButton.addEventListener(
    "click",
    openTelegramSupport
  );

  logoutButton.addEventListener(
    "click",
    logout
  );

  window.addEventListener(
    "resize",
    setAppHeight
  );

  window.visualViewport?.addEventListener(
    "resize",
    setAppHeight
  );

  window.addEventListener(
    "pageshow",
    () => {
      renderProfile();
      renderNotificationStatus();
    }
  );

  window.addEventListener(
    "storage",
    (event) => {
      if (
        event.key ===
          REWARDS_STORAGE_KEY ||
        event.key ===
          SIGNAL_COUNT_STORAGE_KEY ||
        event.key ===
          PROFILE_NAME_STORAGE_KEY ||
        event.key ===
          PULSE_LEVEL_STORAGE_KEY ||
        event.key ===
          PULSE_UNLOCKS_STORAGE_KEY
      ) {
        renderProfile();
      }
    }
  );

  window.addEventListener(
    "beforeunload",
    () => {
      window.clearTimeout(toastTimer);

      window.clearTimeout(
        logoutConfirmTimer
      );
    }
  );

  window.requestAnimationFrame(() => {
    document.body.classList.add(
      "page-ready"
    );
  });
}

initializeProfile();
