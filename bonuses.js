"use strict";

const TELEGRAM_BOT_USERNAME = "YOUR_BOT_USERNAME";
const TELEGRAM_CHANNEL_USERNAME = "YOUR_CHANNEL_USERNAME";

const STORAGE_KEY = "arbifyRewardsStateV2";
const VERIFICATION_DELAY = 1600;
const TOAST_DURATION = 2600;
const REWARD_TOAST_DURATION = 2800;
const WEEKLY_REWARD = 300;

/*
 * Навіть якщо база відповідає миттєво, індикатор завантаження
 * залишається видимим достатньо довго, щоб перехід виглядав плавно.
 */
const MIN_BALANCE_LOADING_DURATION = 800;
const BALANCE_REVEAL_DURATION = 380;

const VERIFIED_SUBID_KEY = "arbifyVerifiedSubId";
const LAST_SIGNAL_KEY = "arbifyLastSignal";
const VIEWED_LIVE_KEY = "arbifyViewedLiveSignals";
const FAVORITE_SLOTS_KEY = "arbifyFavoriteSlots";
const SIGNAL_COUNT_KEY = "arbifyCreatedSignalCount";

const PULSE_LEVEL_KEY = "arbifyPulseLevel";
const PULSE_UNLOCKS_KEY = "arbifyPulseUnlocks";

const PULSE_LEVELS = Object.freeze([
  {
    level: 1,
    minimum: 0,
    maximum: 250,
    name: "STARTER",
    unlockKey: "base-access",
    unlockTitle: "Базовий доступ",
  },
  {
    level: 2,
    minimum: 250,
    maximum: 600,
    name: "ACTIVE",
    unlockKey: "profile-frame",
    unlockTitle: "Нова рамка профілю",
  },
  {
    level: 3,
    minimum: 600,
    maximum: 1200,
    name: "PREMIUM",
    unlockKey: "premium-badge",
    unlockTitle: "Значок Premium",
  },
  {
    level: 4,
    minimum: 1200,
    maximum: null,
    name: "ELITE",
    unlockKey: "exclusive-theme",
    unlockTitle: "Ексклюзивна тема",
  },
]);

const pulseBalance =
  document.querySelector("#pulseBalance");

const levelBadge =
  document.querySelector("#levelBadge");

const levelProgressValue =
  document.querySelector("#levelProgressValue");

const levelProgressBar =
  document.querySelector("#levelProgressBar");

const levelProgressTrack =
  document.querySelector(".level-progress");

const taskList =
  document.querySelector("#taskList");

const taskCards = Array.from(
  document.querySelectorAll(".task-card")
);

const taskFilters = Array.from(
  document.querySelectorAll(".task-filter")
);

const allTasksCount =
  document.querySelector("#allTasksCount");

const taskRefreshTimer =
  document.querySelector("#taskRefreshTimer");

const weeklyProgressText =
  document.querySelector("#weeklyProgressText");

const weeklyNodes = Array.from(
  document.querySelectorAll(
    "#weeklyNodes > span"
  )
);

const weeklyProgressElement =
  document.querySelector("#weeklyNodes");

const notificationButton =
  document.querySelector(
    "#notificationButton"
  );

const notificationDot =
  document.querySelector(
    ".notification-dot"
  );

const verificationOverlay =
  document.querySelector(
    "#verificationOverlay"
  );

const verificationBackdrop =
  document.querySelector(
    "[data-close-verification]"
  );

const verificationClose =
  document.querySelector(
    "#verificationClose"
  );

const verificationIcon =
  document.querySelector(
    "#verificationIcon"
  );

const verificationLoader =
  document.querySelector(
    ".verification-loader"
  );

const verificationSuccess =
  document.querySelector(
    ".verification-success"
  );

const verificationSuccessPath =
  verificationSuccess?.querySelector(
    "path"
  );

const verificationTitle =
  document.querySelector(
    "#verificationTitle"
  );

const verificationDescription =
  document.querySelector(
    "#verificationDescription"
  );

const verificationActionButton =
  document.querySelector(
    "#verificationActionButton"
  );

const guideOverlay =
  document.querySelector("#guideOverlay");

const guideBackdrop =
  document.querySelector(
    "[data-close-guide]"
  );

const guideDialog =
  document.querySelector(".guide-dialog");

const guideClose =
  document.querySelector("#guideClose");

const guideConfirm =
  document.querySelector("#guideConfirm");

const toast =
  document.querySelector("#toast");

const toastText =
  document.querySelector("#toastText");

const rewardToast =
  document.querySelector("#rewardToast");

const rewardToastValue =
  document.querySelector(
    "#rewardToastValue"
  );

/*
 * Індикатор завантаження балансу.
 */
function setBalanceLoadingState(
  isLoading
) {
  const dynamicElements = [
    pulseBalance,
    levelBadge,
    levelProgressValue,
  ];

  dynamicElements.forEach((element) => {
    if (!element) {
      return;
    }

    element.setAttribute(
      "aria-busy",
      String(isLoading)
    );

    if (isLoading) {
      element.textContent = "";
    }
  });

  if (
    isLoading &&
    levelProgressBar &&
    levelProgressTrack
  ) {
    levelProgressBar.style.width = "0%";

    levelProgressTrack.setAttribute(
      "aria-valuenow",
      "0"
    );
  }
}

function waitForMinimumBalanceLoading(
  startedAt
) {
  const elapsed =
    performance.now() - startedAt;

  const remainingTime = Math.max(
    MIN_BALANCE_LOADING_DURATION - elapsed,
    0
  );

  if (remainingTime === 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    window.setTimeout(
      resolve,
      remainingTime
    );
  });
}

function revealLoadedBalance() {
  renderBalance();

  const prefersReducedMotion =
    window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches === true;

  if (prefersReducedMotion) {
    return;
  }

  const dynamicElements = [
    pulseBalance,
    levelBadge,
    levelProgressValue,
  ];

  dynamicElements.forEach((element) => {
    if (
      !element ||
      typeof element.animate !== "function"
    ) {
      return;
    }

    element.animate(
      [
        {
          opacity: 0,
          transform: "translateY(5px)",
          filter: "blur(3px)",
        },
        {
          opacity: 1,
          transform: "translateY(0)",
          filter: "blur(0)",
        },
      ],
      {
        duration: BALANCE_REVEAL_DURATION,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      }
    );
  });

  if (
    levelProgressBar &&
    typeof levelProgressBar.animate ===
      "function"
  ) {
    levelProgressBar.animate(
      [
        {
          opacity: 0.35,
          transform: "scaleX(0)",
          transformOrigin: "left center",
        },
        {
          opacity: 1,
          transform: "scaleX(1)",
          transformOrigin: "left center",
        },
      ],
      {
        duration:
          BALANCE_REVEAL_DURATION + 220,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      }
    );
  }
}

function showBalanceLoadingError() {
  setBalanceLoadingState(false);

  pulseBalance.textContent = "—";

  levelBadge.textContent =
    "НЕ ЗАВАНТАЖЕНО";

  levelProgressValue.textContent = "—";

  levelProgressBar.style.width =
    "0.01%";
}

const taskMeta = new Map();

taskCards.forEach((card) => {
  const button =
    card.querySelector(".task-action");

  taskMeta.set(card.dataset.taskId, {
    card,
    button,

    title:
      card
        .querySelector("h3")
        ?.textContent.trim() ||
      "Завдання",

    message:
      card.querySelector(
        ".task-message"
      ),

    reward:
      Number(card.dataset.reward) || 0,

    category:
      card.dataset.category ||
      "starter",

    originalAction:
      button?.dataset.taskAction ||
      "check",

    originalText:
      button?.textContent.trim() ||
      "ПЕРЕВІРИТИ",

    originalClasses:
      button?.className ||
      "task-action",
  });
});

function createDefaultState() {
  return {
    balance: 0,
    level: 1,
    highestLevel: 1,

    unlockedLevelRewards: [
      "base-access",
    ],

    weeklyProgress: 0,
    weeklyRewardClaimed: false,
    taskNoticeIds: [],

    tasks: {
      "telegram-bot": {
        status: "available",
      },

      "telegram-channel": {
        status: "available",
      },

      "complete-profile": {
        status: "checkable",
      },

      notifications: {
        status: "available",
      },

      "confirm-subid": {
        status: "checkable",
      },

      "favorite-slots": {
        status: "available",
      },

      "first-signal": {
        status: "available",
      },

      "view-live": {
        status: "available",
      },

      "responsible-guide": {
        status: "available",
      },

      "signal-master": {
        status: "progress",
      },
    },

    progress: {
      favoriteSlots: 0,
      favoriteSlotsMaximum: 3,
      signalMaster: 0,
      signalMasterMaximum: 10,
    },
  };
}

function loadRewardsState() {
  const defaultState =
    createDefaultState();

  try {
    const savedValue =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!savedValue) {
      return defaultState;
    }

    const savedState =
      JSON.parse(savedValue);

    const savedUnlocks =
      Array.isArray(
        savedState
          .unlockedLevelRewards
      )
        ? savedState
            .unlockedLevelRewards
        : defaultState
            .unlockedLevelRewards;

    return {
      ...defaultState,
      ...savedState,

      tasks: {
        ...defaultState.tasks,
        ...(savedState.tasks || {}),
      },

      progress: {
        ...defaultState.progress,
        ...(savedState.progress || {}),
      },

      unlockedLevelRewards:
        Array.from(
          new Set([
            "base-access",
            ...savedUnlocks,
          ])
        ),
    };
  } catch (error) {
    console.warn(
      "Не вдалося завантажити прогрес:",
      error
    );

    return defaultState;
  }
}

let rewardsState =
  loadRewardsState();

let rewardsDatabaseState = {};
let rewardsDatabaseReady = false;
let rewardsPageReady = false;
let rewardsInitializationPromise = null;

let rewardsSaveQueue =
  Promise.resolve({});

let rewardsSaveErrorWasShown = false;

function getArbifyApi() {
  if (!window.ARBIFY_API) {
    throw new Error(
      "ARBIFY API is not loaded"
    );
  }

  return window.ARBIFY_API;
}

function normalizeRewardsState(
  sourceState
) {
  const defaultState =
    createDefaultState();

  const source =
    sourceState &&
    typeof sourceState === "object"
      ? sourceState
      : {};

  const savedUnlocks =
    Array.isArray(
      source.unlockedLevelRewards
    )
      ? source.unlockedLevelRewards
      : defaultState
          .unlockedLevelRewards;

  return {
    ...defaultState,
    ...source,

    balance: Math.max(
      Number(source.balance) || 0,
      0
    ),

    level: Math.max(
      Number(source.level) || 1,
      1
    ),

    highestLevel: Math.max(
      Number(source.highestLevel) || 1,
      1
    ),

    weeklyProgress: Math.max(
      Number(source.weeklyProgress) || 0,
      0
    ),

    weeklyRewardClaimed:
      source.weeklyRewardClaimed ===
      true,

    tasks: {
      ...defaultState.tasks,
      ...(source.tasks || {}),
    },

    progress: {
      ...defaultState.progress,
      ...(source.progress || {}),
    },

    taskNoticeIds:
      Array.isArray(
        source.taskNoticeIds
      )
        ? source.taskNoticeIds
        : [],

    unlockedLevelRewards:
      Array.from(
        new Set([
          "base-access",
          ...savedUnlocks,
        ])
      ),
  };
}

function getDatabaseRewardsRecord(
  databaseState
) {
  const taskProgress =
    databaseState?.taskProgress;

  if (
    !taskProgress ||
    typeof taskProgress !== "object"
  ) {
    return {};
  }

  const rewardsRecord =
    taskProgress.rewards;

  return (
    rewardsRecord &&
    typeof rewardsRecord === "object"
      ? rewardsRecord
      : {}
  );
}

function hasDatabaseRewardsState(
  databaseState
) {
  if (
    !databaseState ||
    typeof databaseState !== "object"
  ) {
    return false;
  }

  return (
    Object.prototype.hasOwnProperty.call(
      databaseState,
      "pulseBalance"
    ) ||
    Object.prototype.hasOwnProperty.call(
      databaseState,
      "completedTasks"
    ) ||
    Object.keys(
      getDatabaseRewardsRecord(
        databaseState
      )
    ).length > 0
  );
}

function createRewardsStateFromDatabase(
  databaseState
) {
  const rewardsRecord =
    getDatabaseRewardsRecord(
      databaseState
    );

  return normalizeRewardsState({
    balance:
      databaseState.pulseBalance,

    level:
      databaseState.pulseLevel,

    highestLevel:
      rewardsRecord.highestLevel,

    unlockedLevelRewards:
      databaseState.pulseUnlocks,

    weeklyProgress:
      rewardsRecord.weeklyProgress,

    weeklyRewardClaimed:
      rewardsRecord
        .weeklyRewardClaimed,

    tasks:
      databaseState.completedTasks,

    progress:
      rewardsRecord.progress,

    taskNoticeIds:
      rewardsRecord.taskNoticeIds,
  });
}

function createRewardsDatabasePatch() {
  /*
   * Баланс, рівні, статуси завдань і нагороди
   * більше ніколи не надсилаються із клієнта.
   * Єдиним джерелом цих даних є сервер.
   */
  return {};
}

function persistRewardsState({
  required = false,
} = {}) {
  void required;
  void createRewardsDatabasePatch();

  return Promise.resolve(
    rewardsDatabaseState
  );
}

function saveRewardsState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(rewardsState)
    );
  } catch (error) {
    console.warn(
      "Не вдалося зберегти прогрес:",
      error
    );
  }

  void persistRewardsState();
}

function setCompatibilityStorage(
  storage,
  key,
  value
) {
  try {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return;
    }

    storage.setItem(
      key,
      typeof value === "string"
        ? value
        : JSON.stringify(value)
    );
  } catch {
    /*
     * PostgreSQL залишається
     * основним сховищем.
     */
  }
}

function restoreDatabaseCompatibilityState() {
  const taskProgress =
    rewardsDatabaseState
      .taskProgress &&
    typeof rewardsDatabaseState
      .taskProgress === "object"
      ? rewardsDatabaseState
          .taskProgress
      : {};

  setCompatibilityStorage(
    sessionStorage,
    VERIFIED_SUBID_KEY,
    rewardsDatabaseState.subid
  );

  if (
    rewardsDatabaseState.lastSignal
  ) {
    setCompatibilityStorage(
      sessionStorage,
      LAST_SIGNAL_KEY,
      rewardsDatabaseState
        .lastSignal
    );
  }

  if (
    Array.isArray(
      rewardsDatabaseState.favorites
    )
  ) {
    setCompatibilityStorage(
      localStorage,
      FAVORITE_SLOTS_KEY,
      rewardsDatabaseState.favorites
    );
  }

  const createdSignalCount =
    Number(
      taskProgress.createdSignalCount
    );

  if (
    Number.isSafeInteger(
      createdSignalCount
    ) &&
    createdSignalCount >= 0
  ) {
    setCompatibilityStorage(
      localStorage,
      SIGNAL_COUNT_KEY,
      String(createdSignalCount)
    );
  }

  if (
    taskProgress
      .viewedLiveSignals === true
  ) {
    setCompatibilityStorage(
      sessionStorage,
      VIEWED_LIVE_KEY,
      "true"
    );
  }

  if (
    rewardsDatabaseState.profile
      ?.completed === true
  ) {
    setCompatibilityStorage(
      sessionStorage,
      "arbifyProfileCompleted",
      "true"
    );
  }
}

function saveLocalRewardsSnapshot() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(rewardsState)
    );
  } catch {
    /*
     * PostgreSQL залишається
     * основним сховищем.
     */
  }
}

function readLegacyTaskNoticeIds() {
  try {
    const storedValue =
      localStorage.getItem(
        PULSE_TASK_NOTICE_KEY
      );

    const parsedValue =
      storedValue
        ? JSON.parse(storedValue)
        : [];

    return Array.isArray(parsedValue)
      ? parsedValue
      : [];
  } catch {
    return [];
  }
}

function applyServerRewardsSnapshot(
  serverRewards
) {
  const cachedNoticeIds =
    Array.from(
      new Set([
        ...(
          Array.isArray(
            rewardsState.taskNoticeIds
          )
            ? rewardsState
                .taskNoticeIds
            : []
        ),
        ...readLegacyTaskNoticeIds(),
      ])
    );

  rewardsState =
    normalizeRewardsState({
      ...(serverRewards || {}),
      taskNoticeIds:
        cachedNoticeIds,
    });

  const api = getArbifyApi();

  rewardsDatabaseState = {
    ...(api.getCurrentState() || {}),
  };

  restoreDatabaseCompatibilityState();
  saveLocalRewardsSnapshot();

  return rewardsState;
}

async function initializeRewardsDatabase() {
  const api = getArbifyApi();

  if (!api.isTelegramMiniApp()) {
    const browserAccess =
      sessionStorage.getItem(
        "arbifyAccess"
      ) === "granted";

    if (!browserAccess) {
      window.location.replace(
        "index.html"
      );

      return false;
    }

    rewardsState =
      normalizeRewardsState(
        rewardsState
      );

    rewardsState.taskNoticeIds =
      Array.from(
        new Set([
          ...rewardsState
            .taskNoticeIds,

          ...readLegacyTaskNoticeIds(),
        ])
      );

    return true;
  }

  await api.ready;

  const user =
    api.getCurrentUser() ||
    (await api.authenticate());

  if (!user?.accessGranted) {
    sessionStorage.removeItem(
      "arbifyAccess"
    );

    window.location.replace(
      "index.html"
    );

    return false;
  }

  sessionStorage.setItem(
    "arbifyAccess",
    "granted"
  );

  rewardsDatabaseState = {
    ...(user.state ||
      api.getCurrentState() ||
      {}),
  };

  rewardsDatabaseReady = true;

  const serverRewards =
    await api.getRewards();

  applyServerRewardsSnapshot(
    serverRewards
  );

  return true;
}

let activeFilter = "all";
let activeVerificationTaskId = null;

let toastTimer;
let rewardToastTimer;
let verificationTimer;
let overlayCloseTimer;
let guideCloseTimer;
let countdownTimer;
let balanceAnimationFrame;
let levelToastTimer;

let lockedScrollPosition = 0;

function getTaskRecord(taskId) {
  if (!rewardsState.tasks[taskId]) {
    rewardsState.tasks[taskId] = {
      status: "available",
    };
  }

  return rewardsState.tasks[taskId];
}

function formatNumber(value) {
  return new Intl.NumberFormat(
    "uk-UA"
  ).format(value);
}

function normalizeTelegramUsername(
  username
) {
  return String(username || "")
    .trim()
    .replace(/^@+/, "");
}

function isTelegramUsernameConfigured(
  username
) {
  const normalizedUsername =
    normalizeTelegramUsername(
      username
    );

  return (
    normalizedUsername.length > 0 &&
    !normalizedUsername.startsWith(
      "YOUR_"
    )
  );
}

function getLevelData(balance) {
  const normalizedBalance =
    Math.max(
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
      }) ||
    PULSE_LEVELS[0]
  );
}

function publishPulseLevelState(
  levelData
) {
  document.documentElement.dataset
    .pulseLevel =
    String(levelData.level);

  document.body.dataset.pulseLevel =
    String(levelData.level);

  try {
    localStorage.setItem(
      PULSE_LEVEL_KEY,
      String(levelData.level)
    );

    localStorage.setItem(
      PULSE_UNLOCKS_KEY,
      JSON.stringify(
        rewardsState
          .unlockedLevelRewards
      )
    );
  } catch {
    /*
     * Сторінка працюватиме і без
     * локального сховища.
     */
  }
}

function addPulseLevelNotification(
  levelData
) {
  const addNotification = (
    notificationsApi
  ) => {
    notificationsApi.add({
      type: "reward",
      category: "НОВИЙ РІВЕНЬ",

      title:
        `Відкрито рівень ` +
        `${levelData.level}`,

      message:
        `Нова можливість: ` +
        `${levelData.unlockTitle}.`,
    });
  };

  if (window.PulseNotifications) {
    addNotification(
      window.PulseNotifications
    );

    return;
  }

  document.addEventListener(
    "pulse:notifications-ready",
    () => {
      if (
        window.PulseNotifications
      ) {
        addNotification(
          window.PulseNotifications
        );
      }
    },
    {
      once: true,
    }
  );
}

function synchronizePulseLevelProgress({
  notify = false,
} = {}) {
  const currentLevelData =
    getLevelData(
      rewardsState.balance
    );

  const previousHighestLevel =
    Math.max(
      1,
      Number(
        rewardsState.highestLevel
      ) || 1
    );

  const unlockedRewards =
    new Set(
      Array.isArray(
        rewardsState
          .unlockedLevelRewards
      )
        ? rewardsState
            .unlockedLevelRewards
        : ["base-access"]
    );

  const newlyUnlockedLevels =
    PULSE_LEVELS.filter(
      (levelData) => {
        return (
          levelData.level >
            previousHighestLevel &&
          levelData.level <=
            currentLevelData.level
        );
      }
    );

  PULSE_LEVELS.forEach(
    (levelData) => {
      if (
        levelData.level <=
        currentLevelData.level
      ) {
        unlockedRewards.add(
          levelData.unlockKey
        );
      }
    }
  );

  rewardsState.level =
    currentLevelData.level;

  rewardsState.highestLevel =
    Math.max(
      previousHighestLevel,
      currentLevelData.level
    );

  rewardsState.unlockedLevelRewards =
    Array.from(unlockedRewards);

  publishPulseLevelState(
    currentLevelData
  );

  if (
    newlyUnlockedLevels.length > 0
  ) {
    saveRewardsState();

    if (notify) {
      newlyUnlockedLevels.forEach(
        addPulseLevelNotification
      );
    }
  }

  return newlyUnlockedLevels;
}

function renderBalance(
  displayedBalance =
    rewardsState.balance
) {
  const levelData =
    getLevelData(
      rewardsState.balance
    );

  pulseBalance.textContent =
    formatNumber(
      Math.round(
        displayedBalance
      )
    );

  levelBadge.textContent =
    `РІВЕНЬ ${levelData.level}`;

  const isMaximumLevel =
    levelData.maximum === null;

  levelProgressValue.textContent =
    isMaximumLevel
      ? `${formatNumber(
          rewardsState.balance
        )} PULSE · MAX`
      : `${formatNumber(
          rewardsState.balance
        )} / ${formatNumber(
          levelData.maximum
        )}`;

  const progressPercent =
    isMaximumLevel
      ? 100
      : Math.min(
          (
            rewardsState.balance /
            levelData.maximum
          ) * 100,
          100
        );

  levelProgressBar.style.width =
    `${progressPercent}%`;

  levelProgressTrack.setAttribute(
    "aria-valuemax",
    String(
      isMaximumLevel
        ? Math.max(
            levelData.minimum,
            rewardsState.balance
          )
        : levelData.maximum
    )
  );

  levelProgressTrack.setAttribute(
    "aria-valuenow",
    String(
      rewardsState.balance
    )
  );

  levelProgressTrack.setAttribute(
    "aria-label",
    `Рівень ${levelData.level}: ` +
      levelData.name
  );

  setBalanceLoadingState(false);
  publishPulseLevelState(levelData);
}

function animateBalance(
  previousBalance,
  newBalance
) {
  window.cancelAnimationFrame(
    balanceAnimationFrame
  );

  const duration = 700;
  const startedAt =
    performance.now();

  function updateBalance(
    currentTime
  ) {
    const elapsed =
      currentTime - startedAt;

    const progress =
      Math.min(
        elapsed / duration,
        1
      );

    const easedProgress =
      1 -
      Math.pow(
        1 - progress,
        3
      );

    const currentBalance =
      previousBalance +
      (
        newBalance -
        previousBalance
      ) *
        easedProgress;

    renderBalance(currentBalance);

    if (progress < 1) {
      balanceAnimationFrame =
        window.requestAnimationFrame(
          updateBalance
        );

      return;
    }

    renderBalance(newBalance);
  }

  balanceAnimationFrame =
    window.requestAnimationFrame(
      updateBalance
    );
}

function showToast(message) {
  window.clearTimeout(toastTimer);

  toastText.textContent = message;
  toast.classList.add("is-visible");

  toastTimer =
    window.setTimeout(() => {
      toast.classList.remove(
        "is-visible"
      );
    }, TOAST_DURATION);
}

function showRewardToast(reward) {
  window.clearTimeout(
    rewardToastTimer
  );

  rewardToastValue.textContent =
    `+${formatNumber(reward)} PULSE`;

  rewardToast.setAttribute(
    "aria-hidden",
    "false"
  );

  rewardToast.classList.add(
    "is-visible"
  );

  rewardToastTimer =
    window.setTimeout(() => {
      rewardToast.classList.remove(
        "is-visible"
      );

      rewardToast.setAttribute(
        "aria-hidden",
        "true"
      );
    }, REWARD_TOAST_DURATION);
}

function setTaskMessage(
  taskId,
  message,
  type = ""
) {
  const meta =
    taskMeta.get(taskId);

  if (!meta?.message) {
    return;
  }

  meta.message.textContent =
    message;

  meta.message.classList.remove(
    "is-error",
    "is-success"
  );

  if (type) {
    meta.message.classList.add(type);
  }
}

function clearTaskMessage(taskId) {
  setTaskMessage(taskId, "");
}

function setButtonAppearance(
  button,
  className,
  text,
  action
) {
  if (!button) {
    return;
  }

  button.className = className;
  button.textContent = text;
  button.dataset.taskAction =
    action;
  button.disabled = false;
}

function renderTask(taskId) {
  const meta =
    taskMeta.get(taskId);

  if (!meta) {
    return;
  }

  const record =
    getTaskRecord(taskId);

  const {
    card,
    button,
  } = meta;

  card.dataset.state =
    record.status;

  card.classList.toggle(
    "is-completed",
    record.status === "completed"
  );

  card.classList.remove(
    "is-verifying"
  );

  if (!button) {
    return;
  }

  if (
    record.status === "completed"
  ) {
    setButtonAppearance(
      button,
      "task-action task-action-completed",
      "ВИКОНАНО",
      "completed"
    );

    button.disabled = true;

    setTaskMessage(
      taskId,
      "Нагороду вже зараховано",
      "is-success"
    );

    return;
  }

  if (
    record.status === "claimable"
  ) {
    setButtonAppearance(
      button,
      "task-action task-action-claim",
      "ЗАБРАТИ",
      "claim"
    );

    setTaskMessage(
      taskId,
      "Завдання підтверджено",
      "is-success"
    );

    return;
  }

  if (
    record.status === "checkable" ||
    record.status === "progress"
  ) {
    setButtonAppearance(
      button,
      "task-action task-action-outline",
      "ПЕРЕВІРИТИ",
      "check"
    );

    return;
  }

  setButtonAppearance(
    button,
    meta.originalClasses,
    meta.originalText,
    meta.originalAction
  );
}

function renderTaskProgress() {
  const favoriteCard =
    taskMeta.get(
      "favorite-slots"
    )?.card;

  if (favoriteCard) {
    const value =
      rewardsState.progress
        .favoriteSlots;

    const maximum =
      rewardsState.progress
        .favoriteSlotsMaximum;

    const progressText =
      favoriteCard.querySelector(
        ".task-progress-copy > span"
      );

    const progressBar =
      favoriteCard.querySelector(
        ".task-mini-progress > span"
      );

    if (progressText) {
      progressText.textContent =
        `${value} / ${maximum}`;
    }

    if (progressBar) {
      progressBar.style.width =
        `${Math.min(
          (
            value /
            maximum
          ) * 100,
          100
        )}%`;
    }
  }

  const signalMasterCard =
    taskMeta.get(
      "signal-master"
    )?.card;

  if (signalMasterCard) {
    const value =
      rewardsState.progress
        .signalMaster;

    const maximum =
      rewardsState.progress
        .signalMasterMaximum;

    const progressText =
      signalMasterCard.querySelector(
        ".task-progress-copy > span"
      );

    const progressBar =
      signalMasterCard.querySelector(
        ".task-mini-progress > span"
      );

    if (progressText) {
      progressText.textContent =
        `${value} / ${maximum}`;
    }

    if (progressBar) {
      progressBar.style.width =
        `${Math.min(
          (
            value /
            maximum
          ) * 100,
          100
        )}%`;
    }
  }
}

function renderAllTasks() {
  taskMeta.forEach(
    (value, taskId) => {
      renderTask(taskId);
    }
  );

  renderTaskProgress();
  applyTaskFilter(activeFilter);
}

function applyTaskFilter(
  filterName
) {
  activeFilter = filterName;

  taskFilters.forEach(
    (button) => {
      const isActive =
        button.dataset.filter ===
        filterName;

      button.classList.toggle(
        "is-active",
        isActive
      );

      button.setAttribute(
        "aria-selected",
        String(isActive)
      );
    }
  );

  taskCards.forEach((card) => {
    const shouldShow =
      filterName === "all" ||
      card.dataset.category ===
        filterName;

    card.classList.toggle(
      "is-hidden",
      !shouldShow
    );
  });
}

function renderWeeklyProgress() {
  const progress = Math.min(
    rewardsState.weeklyProgress,
    weeklyNodes.length
  );

  weeklyProgressText.textContent =
    `${progress} / ${weeklyNodes.length}`;

  weeklyProgressElement.setAttribute(
    "aria-valuenow",
    String(progress)
  );

  weeklyNodes.forEach(
    (node, index) => {
      const isComplete =
        index < progress;

      node.classList.toggle(
        "is-complete",
        isComplete
      );

      node.textContent =
        isComplete ? "✓" : "";
    }
  );
}

function lockPageScroll() {
  if (
    document.body.classList.contains(
      "modal-open"
    )
  ) {
    return;
  }

  lockedScrollPosition =
    window.scrollY ||
    document.documentElement
      .scrollTop ||
    0;

  document.body.style.position =
    "fixed";

  document.body.style.top =
    `-${lockedScrollPosition}px`;

  document.body.style.right = "0";
  document.body.style.left = "0";
  document.body.style.width = "100%";

  document.body.classList.add(
    "modal-open"
  );
}

function unlockPageScroll() {
  if (
    !document.body.classList.contains(
      "modal-open"
    )
  ) {
    return;
  }

  document.body.classList.remove(
    "modal-open"
  );

  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.right = "";
  document.body.style.left = "";
  document.body.style.width = "";

  window.scrollTo(
    0,
    lockedScrollPosition
  );
}

function resetVerificationIcon() {
  verificationIcon.classList.remove(
    "is-success",
    "is-error"
  );

  verificationLoader.style.display =
    "";

  verificationSuccess.style.display =
    "";

  if (verificationSuccessPath) {
    verificationSuccessPath.setAttribute(
      "d",
      "m8.5 16.5 5 5 10-11"
    );
  }
}

function openVerificationOverlay(
  taskId
) {
  const meta =
    taskMeta.get(taskId);

  if (!meta) {
    return;
  }

  window.clearTimeout(
    overlayCloseTimer
  );

  activeVerificationTaskId =
    taskId;

  resetVerificationIcon();

  verificationTitle.textContent =
    "Перевіряємо завдання";

  verificationDescription.textContent =
    `Система перевіряє: «${meta.title}». ` +
    "Це займе декілька секунд.";

  verificationActionButton.hidden =
    true;

  verificationActionButton.dataset
    .taskId = taskId;

  verificationOverlay.hidden =
    false;

  verificationOverlay.setAttribute(
    "aria-hidden",
    "false"
  );

  lockPageScroll();

  window.requestAnimationFrame(
    () => {
      verificationOverlay.classList.add(
        "is-open"
      );
    }
  );
}

function showVerificationSuccess(
  taskId
) {
  const meta =
    taskMeta.get(taskId);

  verificationIcon.classList.add(
    "is-success"
  );

  verificationTitle.textContent =
    "Завдання виконано";

  verificationDescription.textContent =
    "Ми підтвердили виконання завдання. " +
    `Тобі доступна нагорода +${meta.reward} PULSE.`;

  verificationActionButton.textContent =
    `ЗАБРАТИ +${meta.reward} PULSE`;

  verificationActionButton.hidden =
    false;

  verificationActionButton.dataset
    .taskId = taskId;

  verificationActionButton.dataset
    .mode = "claim";
}

function showVerificationFailure(
  taskId,
  message
) {
  verificationIcon.classList.add(
    "is-error"
  );

  if (verificationSuccessPath) {
    verificationSuccessPath.setAttribute(
      "d",
      "m10 10 12 12M22 10 10 22"
    );
  }

  verificationTitle.textContent =
    "Завдання не виконано";

  verificationDescription.textContent =
    message;

  verificationActionButton.textContent =
    "ЗРОЗУМІЛО";

  verificationActionButton.hidden =
    false;

  verificationActionButton.dataset
    .taskId = taskId;

  verificationActionButton.dataset
    .mode = "close";
}

function closeVerificationOverlay() {
  window.clearTimeout(
    verificationTimer
  );

  if (activeVerificationTaskId) {
    renderTask(
      activeVerificationTaskId
    );
  }

  verificationOverlay.classList.remove(
    "is-open"
  );

  verificationOverlay.setAttribute(
    "aria-hidden",
    "true"
  );

  unlockPageScroll();

  overlayCloseTimer =
    window.setTimeout(() => {
      verificationOverlay.hidden =
        true;

      activeVerificationTaskId =
        null;

      resetVerificationIcon();
    }, 260);
}

function readFavoriteSlotsCount() {
  let databaseFavorites = [];

  if (
    Array.isArray(
      rewardsDatabaseState.favorites
    )
  ) {
    databaseFavorites =
      rewardsDatabaseState.favorites;
  }

  let localFavorites = [];

  try {
    const storedValue =
      localStorage.getItem(
        FAVORITE_SLOTS_KEY
      ) ||
      sessionStorage.getItem(
        FAVORITE_SLOTS_KEY
      );

    if (storedValue) {
      const parsedValue =
        JSON.parse(storedValue);

      if (Array.isArray(parsedValue)) {
        localFavorites = parsedValue;
      }
    }
  } catch {
    /*
     * Якщо локальне сховище недоступне,
     * продовжуємо з даними сервера.
     */
  }

  /*
   * Об'єднуємо обидва джерела.
   * Це прибирає короткий розрив між натисканням сердечка
   * на Home та завершенням синхронізації з PostgreSQL.
   */
  return new Set([
    ...databaseFavorites,
    ...localFavorites,
  ]).size;
}


function synchronizeFavoriteSlotsTask() {
  const favoriteCount =
    readFavoriteSlotsCount();

  const maximum =
    Math.max(
      1,
      Number(
        rewardsState.progress
          .favoriteSlotsMaximum
      ) || 3
    );

  rewardsState.progress.favoriteSlots =
    Math.min(
      favoriteCount,
      maximum
    );

  const record =
    getTaskRecord(
      "favorite-slots"
    );

  if (
    record.status !== "completed"
  ) {
    if (favoriteCount >= maximum) {
      record.status = "claimable";

      if (!record.verifiedAt) {
        record.verifiedAt = Date.now();
      }
    } else if (
      record.status === "claimable"
    ) {
      /*
       * Якщо до отримання нагороди користувач
       * прибрав слот з обраного — повертаємо прогрес.
       */
      record.status = "available";
      delete record.verifiedAt;
    }
  }

  saveRewardsState();
  renderTask("favorite-slots");
  renderTaskProgress();

  return favoriteCount;
}


function readCreatedSignalCount() {
  const databaseSignalCount =
    Number(
      rewardsDatabaseState
        .taskProgress
        ?.createdSignalCount
    );

  const databaseHistoryCount =
    Array.isArray(
      rewardsDatabaseState
        .signalHistory
    )
      ? rewardsDatabaseState
          .signalHistory.length
      : 0;

  const databaseLastSignalCount =
    rewardsDatabaseState.lastSignal
      ? 1
      : 0;

  if (
    Number.isSafeInteger(
      databaseSignalCount
    ) &&
    databaseSignalCount >= 0
  ) {
    return Math.max(
      databaseSignalCount,
      databaseHistoryCount,
      databaseLastSignalCount
    );
  }

  if (
    databaseHistoryCount > 0 ||
    databaseLastSignalCount > 0
  ) {
    return Math.max(
      databaseHistoryCount,
      databaseLastSignalCount
    );
  }

  const storedValue =
    localStorage.getItem(
      SIGNAL_COUNT_KEY
    ) ||
    sessionStorage.getItem(
      SIGNAL_COUNT_KEY
    );

  const parsedValue =
    Number(storedValue);

  if (
    Number.isFinite(parsedValue) &&
    parsedValue > 0
  ) {
    return Math.floor(parsedValue);
  }

  return sessionStorage.getItem(
    LAST_SIGNAL_KEY
  )
    ? 1
    : 0;
}

function getTaskVerificationResult(
  taskId
) {
  if (taskId === "telegram-bot") {
    return {
      valid: false,

      message:
        "Перевірку запуску Telegram-бота підключимо через Telegram Mini App. До цього моменту PULSE не нараховуються.",
    };
  }

  if (
    taskId ===
    "telegram-channel"
  ) {
    return {
      valid: false,

      message:
        "Підписку на Telegram-канал має підтвердити наш сервер. Зараз це завдання не нараховує PULSE.",
    };
  }

  if (
    taskId ===
    "complete-profile"
  ) {
    return {
      valid: false,

      message:
        "Сторінку профілю ще не підключено. Завдання стане доступним після її створення.",
    };
  }

  if (taskId === "notifications") {
    const notificationsEnabled =
      "Notification" in window &&
      Notification.permission ===
        "granted";

    return {
      valid: notificationsEnabled,

      message:
        notificationsEnabled
          ? ""
          : "Спочатку дозволь сповіщення для застосунку.",
    };
  }

  if (
    taskId === "confirm-subid"
  ) {
    const verifiedSubId =
      rewardsDatabaseState.subid ||
      sessionStorage.getItem(
        VERIFIED_SUBID_KEY
      );

    return {
      valid:
        Boolean(verifiedSubId),

      message:
        "Спочатку введи та підтвердь SUBID на головній сторінці.",
    };
  }

  if (
    taskId === "favorite-slots"
  ) {
    const favoriteCount =
      readFavoriteSlotsCount();

    rewardsState.progress
      .favoriteSlots =
      Math.min(
        favoriteCount,
        rewardsState.progress
          .favoriteSlotsMaximum
      );

    return {
      valid:
        favoriteCount >=
        rewardsState.progress
          .favoriteSlotsMaximum,

      message:
        `Зараз в обраному ${favoriteCount} із ` +
        `${rewardsState.progress.favoriteSlotsMaximum} слотів.`,
    };
  }

  if (
    taskId === "first-signal"
  ) {
    const hasSignal = Boolean(
      rewardsDatabaseState
        .lastSignal ||
      rewardsDatabaseState
        .signalHistory?.length ||
      sessionStorage.getItem(
        LAST_SIGNAL_KEY
      )
    );

    return {
      valid: hasSignal,

      message:
        "Спочатку створи свій перший сигнал на головній сторінці.",
    };
  }

  if (taskId === "view-live") {
    const viewedLive =
      rewardsDatabaseState
        .taskProgress
        ?.viewedLiveSignals ===
        true ||
      sessionStorage.getItem(
        VIEWED_LIVE_KEY
      ) === "true";

    return {
      valid: viewedLive,

      message:
        "Спочатку відкрий сторінку LIVE-сигналів.",
    };
  }

  if (
    taskId === "signal-master"
  ) {
    const signalCount =
      readCreatedSignalCount();

    rewardsState.progress
      .signalMaster =
      Math.min(
        signalCount,
        rewardsState.progress
          .signalMasterMaximum
      );

    return {
      valid:
        signalCount >=
        rewardsState.progress
          .signalMasterMaximum,

      message:
        `Створено ${signalCount} із ` +
        `${rewardsState.progress.signalMasterMaximum} сигналів.`,
    };
  }

  return {
    valid: false,

    message:
      "Для цього завдання ще не налаштована перевірка.",
  };
}

async function verifyTask(taskId) {
  const meta =
    taskMeta.get(taskId);

  if (!meta) {
    return;
  }

  clearTaskMessage(taskId);

  meta.card.classList.add(
    "is-verifying"
  );

  meta.button.disabled = true;

  meta.button.textContent =
    "ПЕРЕВІРКА...";

  openVerificationOverlay(taskId);

  const api = getArbifyApi();

  if (!api.isTelegramMiniApp()) {
    verificationTimer =
      window.setTimeout(() => {
        const record =
          getTaskRecord(taskId);

        const result =
          getTaskVerificationResult(
            taskId
          );

        if (!result.valid) {
          record.status =
            "checkable";

          saveRewardsState();
          renderTask(taskId);
          renderTaskProgress();

          setTaskMessage(
            taskId,
            result.message,
            "is-error"
          );

          showVerificationFailure(
            taskId,
            result.message
          );

          return;
        }

        record.status =
          "claimable";

        record.verifiedAt =
          Date.now();

        saveRewardsState();
        renderTask(taskId);
        renderTaskProgress();

        showVerificationSuccess(
          taskId
        );
      }, VERIFICATION_DELAY);

    return;
  }

  const animationDelay =
    new Promise((resolve) => {
      verificationTimer =
        window.setTimeout(
          resolve,
          VERIFICATION_DELAY
        );
    });

  try {
    const verificationRequest =
      api.verifyRewardTask(taskId);

    const [result] =
      await Promise.all([
        verificationRequest,
        animationDelay,
      ]);

    applyServerRewardsSnapshot(
      result.rewards
    );

    renderAllTasks();
    renderWeeklyProgress();
    renderTaskProgress();

    showVerificationSuccess(
      taskId
    );
  } catch (error) {
    await animationDelay;

    renderTask(taskId);
    renderTaskProgress();

    const message =
      error?.message ||
      "Завдання ще не виконано";

    setTaskMessage(
      taskId,
      message,
      "is-error"
    );

    showVerificationFailure(
      taskId,
      message
    );
  }
}

async function claimTaskReward(taskId) {
  const meta =
    taskMeta.get(taskId);

  const record =
    getTaskRecord(taskId);

  if (
    !meta ||
    record.status !== "claimable"
  ) {
    return;
  }

  const previousBalance =
    rewardsState.balance;

  const api = getArbifyApi();

  if (api.isTelegramMiniApp()) {
    meta.button.disabled = true;
    meta.button.textContent =
      "ЗАРАХУВАННЯ...";

    try {
      const weeklyRewardWasClaimed =
        rewardsState
          .weeklyRewardClaimed;

      const result =
        await api.claimRewardTask(
          taskId
        );

      applyServerRewardsSnapshot(
        result.rewards
      );

      renderAllTasks();
      renderWeeklyProgress();
      renderTaskProgress();

      animateBalance(
        previousBalance,
        rewardsState.balance
      );

      const receivedReward =
        Number(
          result.receivedReward
        ) || 0;

      const weeklyRewardReceived =
        Number(
          result.weeklyRewardReceived
        ) || 0;

      if (receivedReward > 0) {
        showRewardToast(
          receivedReward +
            weeklyRewardReceived
        );
      }

      closeVerificationOverlay();

      window.setTimeout(() => {
        if (weeklyRewardReceived > 0) {
          showToast(
            `Тижневу ціль виконано: +${weeklyRewardReceived} PULSE`
          );

          return;
        }

        if (result.newlyClaimed) {
          showToast(
            `Нагороду +${receivedReward} PULSE зараховано`
          );
        } else {
          showToast(
            "Цю нагороду вже було зараховано"
          );
        }
      }, 300);

      if (
        result.newlyClaimed &&
        receivedReward > 0
      ) {
        pulseUseNotifications(
          (notificationsApi) => {
            notificationsApi.addReward({
              title:
                "Нагороду зараховано",
              reward:
                receivedReward,
              message:
                `За виконання завдання «${meta.title}».`,
            });

            if (
              !weeklyRewardWasClaimed &&
              weeklyRewardReceived > 0
            ) {
              notificationsApi.addReward({
                title:
                  "Тижневу ціль виконано",
                reward:
                  weeklyRewardReceived,
                message:
                  "Виконано 7 завдань. Бонус уже додано до балансу.",
              });
            }
          }
        );
      }
    } catch (error) {
      renderTask(taskId);

      const message =
        error?.message ||
        "Не вдалося зарахувати нагороду";

      setTaskMessage(
        taskId,
        message,
        "is-error"
      );

      showToast(message);
    }

    return;
  }

  record.status = "completed";
  record.completedAt = Date.now();

  rewardsState.balance +=
    meta.reward;

  rewardsState.weeklyProgress =
    Math.min(
      rewardsState.weeklyProgress +
        1,
      weeklyNodes.length
    );

  let receivedReward =
    meta.reward;

  let weeklyGoalCompleted =
    false;

  if (
    rewardsState.weeklyProgress >=
      weeklyNodes.length &&
    !rewardsState
      .weeklyRewardClaimed
  ) {
    rewardsState.weeklyRewardClaimed =
      true;

    rewardsState.balance +=
      WEEKLY_REWARD;

    receivedReward +=
      WEEKLY_REWARD;

    weeklyGoalCompleted = true;
  }

  const newlyUnlockedLevels =
    synchronizePulseLevelProgress({
      notify: true,
    });

  saveRewardsState();
  renderTask(taskId);
  renderWeeklyProgress();

  animateBalance(
    previousBalance,
    rewardsState.balance
  );

  showRewardToast(receivedReward);

  window.setTimeout(() => {
    if (weeklyGoalCompleted) {
      showToast(
        `Тижневу ціль виконано: +${WEEKLY_REWARD} PULSE`
      );

      return;
    }

    showToast(
      `Нагороду +${meta.reward} PULSE зараховано`
    );
  }, 300);

  const newestUnlockedLevel =
    newlyUnlockedLevels[
      newlyUnlockedLevels.length -
        1
    ];

  if (newestUnlockedLevel) {
    window.clearTimeout(
      levelToastTimer
    );

    levelToastTimer =
      window.setTimeout(() => {
        showToast(
          `Новий рівень ${newestUnlockedLevel.level}: ` +
            newestUnlockedLevel
              .unlockTitle
        );
      }, 3200);
  }
}

function openTelegramLink(url) {
  const telegramWebApp =
    window.Telegram?.WebApp;

  if (
    telegramWebApp &&
    typeof telegramWebApp
      .openTelegramLink ===
      "function"
  ) {
    telegramWebApp.openTelegramLink(
      url
    );

    return;
  }

  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );
}

function prepareTaskForChecking(
  taskId
) {
  const record =
    getTaskRecord(taskId);

  if (
    record.status === "completed"
  ) {
    return;
  }

  record.status = "checkable";
  record.openedAt = Date.now();

  saveRewardsState();
  renderTask(taskId);
}

async function recordServerRewardActivity(
  activityType,
  payload = {}
) {
  const api = getArbifyApi();

  if (!api.isTelegramMiniApp()) {
    return null;
  }

  const result =
    await api.recordActivity(
      activityType,
      payload
    );

  applyServerRewardsSnapshot(
    result.rewards
  );

  renderAllTasks();
  renderWeeklyProgress();
  renderTaskProgress();

  return result;
}

function openTelegramTask(taskId) {
  let username = "";
  let url = "";

  if (taskId === "telegram-bot") {
    username =
      normalizeTelegramUsername(
        TELEGRAM_BOT_USERNAME
      );

    if (
      isTelegramUsernameConfigured(
        username
      )
    ) {
      url =
        `https://t.me/${username}` +
        "?start=pulse_rewards";
    }
  }

  if (
    taskId ===
    "telegram-channel"
  ) {
    username =
      normalizeTelegramUsername(
        TELEGRAM_CHANNEL_USERNAME
      );

    if (
      isTelegramUsernameConfigured(
        username
      )
    ) {
      url =
        `https://t.me/${username}`;
    }
  }

  if (url) {
    prepareTaskForChecking(
      taskId
    );

    openTelegramLink(url);

    showToast(
      "Після виконання повернися та натисни «Перевірити»"
    );

    return;
  }

  showToast(
    "Telegram-посилання і перевірку підключимо на фінальному етапі"
  );
}

async function enableNotificationsTask() {
  const taskId = "notifications";

  const record =
    getTaskRecord(taskId);

  clearTaskMessage(taskId);

  if (!("Notification" in window)) {
    setTaskMessage(
      taskId,
      "Цей браузер не підтримує перевірку сповіщень",
      "is-error"
    );

    showToast(
      "Не вдалося активувати сповіщення"
    );

    return;
  }

  try {
    if (
      Notification.permission ===
      "granted"
    ) {
      const api = getArbifyApi();

      if (api.isTelegramMiniApp()) {
        await recordServerRewardActivity(
          "notifications-enabled",
          {
            permission: "granted",
          }
        );
      } else {
        record.status = "claimable";
        record.verifiedAt =
          Date.now();

        saveRewardsState();
        renderTask(taskId);
      }

      showToast(
        "Сповіщення вже дозволені"
      );

      return;
    }

    if (
      Notification.permission ===
      "denied"
    ) {
      setTaskMessage(
        taskId,
        "Дозволь сповіщення у налаштуваннях браузера",
        "is-error"
      );

      showToast(
        "Доступ до сповіщень заблоковано"
      );

      return;
    }

    const permission =
      await Notification
        .requestPermission();

    if (permission === "granted") {
      const api = getArbifyApi();

      if (api.isTelegramMiniApp()) {
        await recordServerRewardActivity(
          "notifications-enabled",
          {
            permission: "granted",
          }
        );
      } else {
        record.status = "claimable";
        record.verifiedAt =
          Date.now();

        saveRewardsState();
        renderTask(taskId);
      }

      showToast(
        "Сповіщення успішно увімкнено"
      );

      return;
    }

    setTaskMessage(
      taskId,
      "Потрібно дозволити сповіщення",
      "is-error"
    );
  } catch (error) {
    setTaskMessage(
      taskId,
      "Перевірка сповіщень буде доступна у Telegram Mini App",
      "is-error"
    );

    showToast(
      "Сповіщення поки не підтверджено"
    );
  }
}

async function navigateToTaskPage(
  taskId,
  pageUrl
) {
  prepareTaskForChecking(taskId);

  if (taskId === "view-live") {
    const api = getArbifyApi();

    if (api.isTelegramMiniApp()) {
      try {
        await recordServerRewardActivity(
          "live-viewed"
        );
      } catch (error) {
        console.error(
          "LIVE activity save error:",
          error.message
        );
      }
    } else {
      sessionStorage.setItem(
        VIEWED_LIVE_KEY,
        "true"
      );

      rewardsDatabaseState = {
        ...rewardsDatabaseState,

        taskProgress: {
          ...(rewardsDatabaseState
            .taskProgress || {}),

          viewedLiveSignals: true,
        },
      };

      saveRewardsState();
    }
  }

  showToast(
    "Після виконання повернися та натисни «Перевірити»"
  );

  window.setTimeout(() => {
    window.location.href =
      pageUrl;
  }, 240);
}

function openGuideOverlay() {
  window.clearTimeout(
    guideCloseTimer
  );

  guideOverlay.hidden = false;

  guideOverlay.setAttribute(
    "aria-hidden",
    "false"
  );

  if (guideDialog) {
    guideDialog.style.touchAction =
      "pan-y";
  }

  lockPageScroll();

  window.requestAnimationFrame(
    () => {
      guideOverlay.classList.add(
        "is-open"
      );
    }
  );
}

function closeGuideOverlay() {
  guideOverlay.classList.remove(
    "is-open"
  );

  guideOverlay.setAttribute(
    "aria-hidden",
    "true"
  );

  unlockPageScroll();

  guideCloseTimer =
    window.setTimeout(() => {
      guideOverlay.hidden = true;
    }, 260);
}

async function confirmResponsibleGuide() {
  const taskId =
    "responsible-guide";

  const record =
    getTaskRecord(taskId);

  const api = getArbifyApi();

  if (api.isTelegramMiniApp()) {
    try {
      await recordServerRewardActivity(
        "responsible-guide-read"
      );
    } catch (error) {
      showToast(
        error?.message ||
          "Не вдалося зберегти виконання"
      );

      return;
    }
  } else if (
    record.status !== "completed"
  ) {
    record.status = "claimable";
    record.verifiedAt =
      Date.now();

    saveRewardsState();
    renderTask(taskId);
  }

  closeGuideOverlay();

  window.setTimeout(() => {
    showToast(
      "Правила прочитано — забери нагороду"
    );
  }, 280);
}

function handleTaskAction(button) {
  const card =
    button.closest(".task-card");

  if (!card) {
    return;
  }

  const taskId =
    card.dataset.taskId;

  const action =
    button.dataset.taskAction;

  if (
    action === "completed" ||
    button.disabled
  ) {
    return;
  }

  if (action === "open") {
    openTelegramTask(taskId);
    return;
  }

  if (action === "check") {
    verifyTask(taskId);
    return;
  }

  if (action === "claim") {
    claimTaskReward(taskId);
    return;
  }

  if (action === "enable") {
    enableNotificationsTask();
    return;
  }

  if (action === "navigate") {
    const pageUrl =
      button.dataset.targetPage ||
      "home.html";

    navigateToTaskPage(
      taskId,
      pageUrl
    );

    return;
  }

  if (action === "guide") {
    openGuideOverlay();
  }
}

function getTimeUntilNextDay() {
  const now = new Date();

  const nextDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0
  );

  return Math.max(
    nextDay.getTime() -
      now.getTime(),
    0
  );
}

function formatCountdown(
  milliseconds
) {
  const totalSeconds =
    Math.floor(
      milliseconds / 1000
    );

  const hours =
    Math.floor(
      totalSeconds / 3600
    );

  const minutes =
    Math.floor(
      (totalSeconds % 3600) /
        60
    );

  const seconds =
    totalSeconds % 60;

  return [
    hours,
    minutes,
    seconds,
  ]
    .map((value) => {
      return String(value).padStart(
        2,
        "0"
      );
    })
    .join(":");
}

function updateTaskCountdown() {
  taskRefreshTimer.textContent =
    formatCountdown(
      getTimeUntilNextDay()
    );
}

function synchronizeExistingActivity() {
  /*
   * У Telegram усі статуси вже прийшли із сервера.
   * Не дозволяємо локальному сховищу підмінити їх.
   */
  if (
    getArbifyApi()
      .isTelegramMiniApp()
  ) {
    return;
  }

  const lastSignal =
    rewardsDatabaseState
      .lastSignal ||
    rewardsDatabaseState
      .signalHistory?.[0] ||
    sessionStorage.getItem(
      LAST_SIGNAL_KEY
    );

  const firstSignalRecord =
    getTaskRecord(
      "first-signal"
    );

  if (
    lastSignal &&
    firstSignalRecord.status !==
      "completed"
  ) {
    firstSignalRecord.status =
      "claimable";

    firstSignalRecord.verifiedAt =
      Date.now();

    rewardsState.progress
      .signalMaster =
      Math.max(
        readCreatedSignalCount(),
        1
      );
  }

  const subIdRecord =
    getTaskRecord(
      "confirm-subid"
    );

  if (
    (
      rewardsDatabaseState.subid ||
      sessionStorage.getItem(
        VERIFIED_SUBID_KEY
      )
    ) &&
    subIdRecord.status !==
      "completed"
  ) {
    subIdRecord.status =
      "claimable";

    subIdRecord.verifiedAt =
      Date.now();
  }

  const liveRecord =
    getTaskRecord("view-live");

  if (
    (
      rewardsDatabaseState
        .taskProgress
        ?.viewedLiveSignals ===
        true ||
      sessionStorage.getItem(
        VIEWED_LIVE_KEY
      ) === "true"
    ) &&
    liveRecord.status !==
      "completed"
  ) {
    liveRecord.status =
      "claimable";

    liveRecord.verifiedAt =
      Date.now();
  }

  synchronizeFavoriteSlotsTask();

  const createdSignalCount =
    readCreatedSignalCount();

  rewardsState.progress
    .signalMaster =
    Math.min(
      createdSignalCount,
      rewardsState.progress
        .signalMasterMaximum
    );

  const signalMasterRecord =
    getTaskRecord(
      "signal-master"
    );

  if (
    createdSignalCount >=
      rewardsState.progress
        .signalMasterMaximum &&
    signalMasterRecord.status !==
      "completed"
  ) {
    signalMasterRecord.status =
      "claimable";

    signalMasterRecord.verifiedAt =
      Date.now();
  }

  if (
    "Notification" in window &&
    Notification.permission ===
      "granted"
  ) {
    const notificationRecord =
      getTaskRecord(
        "notifications"
      );

    if (
      notificationRecord.status !==
      "completed"
    ) {
      notificationRecord.status =
        "claimable";
    }
  }

  saveRewardsState();
}

taskList.addEventListener(
  "click",
  (event) => {
    if (!rewardsPageReady) {
      showToast(
        "Завантажуємо твій прогрес..."
      );

      return;
    }

    const button =
      event.target.closest(
        ".task-action"
      );

    if (!button) {
      return;
    }

    handleTaskAction(button);
  }
);

taskFilters.forEach((button) => {
  button.addEventListener(
    "click",
    () => {
      applyTaskFilter(
        button.dataset.filter
      );
    }
  );
});

verificationActionButton.addEventListener(
  "click",
  () => {
    if (
      verificationActionButton
        .dataset.mode === "close"
    ) {
      closeVerificationOverlay();
      return;
    }

    const taskId =
      verificationActionButton
        .dataset.taskId ||
      activeVerificationTaskId;

    if (!taskId) {
      return;
    }

    void claimTaskReward(taskId);
  }
);

verificationClose.addEventListener(
  "click",
  closeVerificationOverlay
);

verificationBackdrop.addEventListener(
  "click",
  closeVerificationOverlay
);

guideClose.addEventListener(
  "click",
  closeGuideOverlay
);

guideBackdrop.addEventListener(
  "click",
  closeGuideOverlay
);

guideConfirm.addEventListener(
  "click",
  confirmResponsibleGuide
);

notificationButton.addEventListener(
  "click",
  () => {
    if (notificationDot) {
      notificationDot.style.display =
        "none";
    }

    showToast(
      "Нових сповіщень поки немає"
    );
  }
);

document.addEventListener(
  "keydown",
  (event) => {
    if (event.key !== "Escape") {
      return;
    }

    if (
      !verificationOverlay.hidden
    ) {
      closeVerificationOverlay();
      return;
    }

    if (!guideOverlay.hidden) {
      closeGuideOverlay();
    }
  }
);


window.addEventListener(
  "pageshow",
  () => {
    if (!rewardsPageReady) {
      return;
    }

    synchronizeFavoriteSlotsTask();
  }
);

window.addEventListener(
  "storage",
  (event) => {
    if (
      event.key !==
      FAVORITE_SLOTS_KEY
    ) {
      return;
    }

    synchronizeFavoriteSlotsTask();
  }
);


function initializeRewardsPage() {
  if (
    rewardsInitializationPromise
  ) {
    return rewardsInitializationPromise;
  }

  rewardsInitializationPromise =
    (async () => {
      const loadingStartedAt =
        performance.now();

      document.documentElement
        .dataset.rewardsState =
        "loading";

      setBalanceLoadingState(true);

      try {
        const canOpenPage =
          await initializeRewardsDatabase();

        if (!canOpenPage) {
          return;
        }

        pulseSynchronizeTaskNoticeIds();

        allTasksCount.textContent =
          String(taskCards.length);

        synchronizeExistingActivity();
        pulseSynchronizeProfileTask();

        synchronizePulseLevelProgress({
          notify: true,
        });

        await waitForMinimumBalanceLoading(
          loadingStartedAt
        );

        revealLoadedBalance();
        renderAllTasks();
        renderWeeklyProgress();
        updateTaskCountdown();
        pulseNotifyClaimableTasks();

        window.clearInterval(
          countdownTimer
        );

        countdownTimer =
          window.setInterval(
            updateTaskCountdown,
            1000
          );

        rewardsPageReady = true;

        document.documentElement
          .dataset.rewardsState =
          "ready";
      } catch (error) {
        console.error(
          "Rewards initialization error:",
          error.message
        );

        document.documentElement
          .dataset.rewardsState =
          "error";

        showBalanceLoadingError();

        showToast(
          "Не вдалося завантажити прогрес. Спробуй відкрити застосунок ще раз"
        );
      }
    })();

  return rewardsInitializationPromise;
}

window.addEventListener(
  "beforeunload",
  () => {
    window.clearTimeout(
      toastTimer
    );

    window.clearTimeout(
      rewardToastTimer
    );

    window.clearTimeout(
      verificationTimer
    );

    window.clearTimeout(
      overlayCloseTimer
    );

    window.clearTimeout(
      guideCloseTimer
    );

    window.clearTimeout(
      levelToastTimer
    );

    window.clearInterval(
      countdownTimer
    );

    window.cancelAnimationFrame(
      balanceAnimationFrame
    );
  }
);

const PULSE_TASK_NOTICE_KEY =
  "arbifyRewardTaskNoticesV1";

function pulseLoadTaskNoticeIds() {
  if (
    Array.isArray(
      rewardsState.taskNoticeIds
    ) &&
    rewardsState.taskNoticeIds
      .length > 0
  ) {
    return new Set(
      rewardsState.taskNoticeIds
    );
  }

  try {
    const storedValue =
      localStorage.getItem(
        PULSE_TASK_NOTICE_KEY
      );

    if (!storedValue) {
      return new Set();
    }

    const parsedValue =
      JSON.parse(storedValue);

    return new Set(
      Array.isArray(parsedValue)
        ? parsedValue
        : []
    );
  } catch {
    return new Set();
  }
}

const pulseTaskNoticeIds =
  pulseLoadTaskNoticeIds();

function pulseSynchronizeTaskNoticeIds() {
  pulseTaskNoticeIds.clear();

  const storedNoticeIds =
    Array.isArray(
      rewardsState.taskNoticeIds
    )
      ? rewardsState.taskNoticeIds
      : [];

  storedNoticeIds.forEach(
    (taskId) => {
      pulseTaskNoticeIds.add(
        taskId
      );
    }
  );
}

function pulseSaveTaskNoticeIds() {
  rewardsState.taskNoticeIds =
    Array.from(
      pulseTaskNoticeIds
    );

  try {
    localStorage.setItem(
      PULSE_TASK_NOTICE_KEY,
      JSON.stringify(
        Array.from(
          pulseTaskNoticeIds
        )
      )
    );
  } catch {
    /*
     * PostgreSQL залишається
     * основним сховищем.
     */
  }

  saveRewardsState();
}

function pulseUseNotifications(
  action
) {
  if (window.PulseNotifications) {
    action(
      window.PulseNotifications
    );

    return;
  }

  document.addEventListener(
    "pulse:notifications-ready",
    () => {
      if (
        window.PulseNotifications
      ) {
        action(
          window.PulseNotifications
        );
      }
    },
    {
      once: true,
    }
  );
}

function pulseNotifyTaskOnce(
  taskId
) {
  const meta =
    taskMeta.get(taskId);

  if (
    !meta ||
    pulseTaskNoticeIds.has(taskId)
  ) {
    return;
  }

  pulseTaskNoticeIds.add(taskId);
  pulseSaveTaskNoticeIds();

  pulseUseNotifications(
    (notificationsApi) => {
      notificationsApi
        .addTaskCompleted({
          taskTitle: meta.title,
          reward: meta.reward,
        });
    }
  );
}

function pulseNotifyClaimableTasks() {
  taskMeta.forEach(
    (meta, taskId) => {
      const record =
        getTaskRecord(taskId);

      if (
        record.status ===
        "claimable"
      ) {
        pulseNotifyTaskOnce(
          taskId
        );
      }
    }
  );
}

const pulseOriginalVerificationSuccess =
  showVerificationSuccess;

showVerificationSuccess =
  function (taskId) {
    pulseOriginalVerificationSuccess(
      taskId
    );

    pulseNotifyTaskOnce(taskId);
  };

guideConfirm.addEventListener(
  "click",
  () => {
    const taskId =
      "responsible-guide";

    const record =
      getTaskRecord(taskId);

    if (
      record.status ===
      "claimable"
    ) {
      pulseNotifyTaskOnce(taskId);
    }
  }
);

const pulseOriginalEnableNotifications =
  enableNotificationsTask;

enableNotificationsTask =
  async function () {
    const taskId =
      "notifications";

    const record =
      getTaskRecord(taskId);

    const wasVerified =
      record.status ===
        "claimable" ||
      record.status ===
        "completed";

    await pulseOriginalEnableNotifications();

    if (
      !wasVerified &&
      record.status ===
        "claimable"
    ) {
      pulseNotifyTaskOnce(taskId);
    }
  };

const PULSE_PROFILE_COMPLETED_KEY =
  "arbifyProfileCompleted";

function pulseIsProfileCompleted() {
  return (
    rewardsDatabaseState.profile
      ?.completed === true ||
    sessionStorage.getItem(
      PULSE_PROFILE_COMPLETED_KEY
    ) === "true"
  );
}

const pulseOriginalProfileVerification =
  getTaskVerificationResult;

getTaskVerificationResult =
  function (taskId) {
    if (
      taskId ===
      "complete-profile"
    ) {
      const profileCompleted =
        pulseIsProfileCompleted();

      return {
        valid: profileCompleted,

        message:
          profileCompleted
            ? ""
            : "Спочатку відкрий сторінку профілю через нижнє меню.",
      };
    }

    return pulseOriginalProfileVerification(
      taskId
    );
  };

function pulseSynchronizeProfileTask() {
  if (
    getArbifyApi()
      .isTelegramMiniApp()
  ) {
    return;
  }

  const taskId =
    "complete-profile";

  const record =
    getTaskRecord(taskId);

  const profileCompleted =
    pulseIsProfileCompleted();

  if (
    !profileCompleted ||
    record.status === "completed"
  ) {
    return;
  }

  const shouldNotify =
    record.status !== "claimable";

  record.status = "claimable";
  record.verifiedAt = Date.now();

  saveRewardsState();
  renderTask(taskId);

  if (shouldNotify) {
    pulseNotifyTaskOnce(taskId);
  }
}

function beginRewardsPage() {
  void initializeRewardsPage();
}

if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    beginRewardsPage,
    {
      once: true,
    }
  );
} else {
  beginRewardsPage();
}
