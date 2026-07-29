"use strict";

/*
 * =========================================================
 * ARBIFY PULSE — БОНУСИ ТА ЗАВДАННЯ
 * =========================================================
 *
 * Зараз прогрес зберігається у localStorage.
 * Після підключення сервера, Telegram і Keitaro
 * перевірка виконуватиметься через API.
 */

/*
 * Вкажемо справжні username наприкінці розробки.
 * Писати потрібно БЕЗ символу @.
 */
const TELEGRAM_BOT_USERNAME = "YOUR_BOT_USERNAME";
const TELEGRAM_CHANNEL_USERNAME = "YOUR_CHANNEL_USERNAME";

/*
 * V2 починає чесний прогрес із нуля.
 * Старі демонстраційні нагороди з V1 більше не підтягуються.
 */
const STORAGE_KEY = "arbifyRewardsStateV2";
const VERIFICATION_DELAY = 1600;
const TOAST_DURATION = 2600;
const REWARD_TOAST_DURATION = 2800;
const WEEKLY_REWARD = 300;

const VERIFIED_SUBID_KEY = "arbifyVerifiedSubId";
const LAST_SIGNAL_KEY = "arbifyLastSignal";
const VIEWED_LIVE_KEY = "arbifyViewedLiveSignals";
const FAVORITE_SLOTS_KEY = "arbifyFavoriteSlots";
const SIGNAL_COUNT_KEY = "arbifyCreatedSignalCount";

/*
 * Захист сторінки.
 */
if (sessionStorage.getItem("arbifyAccess") !== "granted") {
  window.location.replace("index.html");
}

/*
 * =========================================================
 * ЕЛЕМЕНТИ СТОРІНКИ
 * =========================================================
 */

const pulseBalance = document.querySelector("#pulseBalance");
const levelBadge = document.querySelector("#levelBadge");
const levelProgressValue = document.querySelector("#levelProgressValue");
const levelProgressBar = document.querySelector("#levelProgressBar");
const levelProgressTrack = document.querySelector(".level-progress");

const taskList = document.querySelector("#taskList");
const taskCards = Array.from(document.querySelectorAll(".task-card"));
const taskFilters = Array.from(document.querySelectorAll(".task-filter"));
const allTasksCount = document.querySelector("#allTasksCount");
const taskRefreshTimer = document.querySelector("#taskRefreshTimer");

const weeklyProgressText = document.querySelector("#weeklyProgressText");
const weeklyNodes = Array.from(
  document.querySelectorAll("#weeklyNodes > span")
);
const weeklyProgressElement = document.querySelector("#weeklyNodes");

const notificationButton = document.querySelector("#notificationButton");
const notificationDot = document.querySelector(".notification-dot");

const verificationOverlay = document.querySelector(
  "#verificationOverlay"
);
const verificationBackdrop = document.querySelector(
  "[data-close-verification]"
);
const verificationClose = document.querySelector("#verificationClose");
const verificationIcon = document.querySelector("#verificationIcon");
const verificationLoader = document.querySelector(
  ".verification-loader"
);
const verificationSuccess = document.querySelector(
  ".verification-success"
);
const verificationSuccessPath = verificationSuccess?.querySelector("path");
const verificationTitle = document.querySelector("#verificationTitle");
const verificationDescription = document.querySelector(
  "#verificationDescription"
);
const verificationActionButton = document.querySelector(
  "#verificationActionButton"
);

const guideOverlay = document.querySelector("#guideOverlay");
const guideBackdrop = document.querySelector("[data-close-guide]");
const guideDialog = document.querySelector(".guide-dialog");
const guideClose = document.querySelector("#guideClose");
const guideConfirm = document.querySelector("#guideConfirm");

const toast = document.querySelector("#toast");
const toastText = document.querySelector("#toastText");

const rewardToast = document.querySelector("#rewardToast");
const rewardToastValue = document.querySelector("#rewardToastValue");

const profileNavigation = document.querySelector(
  '.nav-item[data-section="Профіль"]'
);

/*
 * =========================================================
 * ПОЧАТКОВІ ДАНІ
 * =========================================================
 */

const taskMeta = new Map();

taskCards.forEach((card) => {
  const button = card.querySelector(".task-action");

  taskMeta.set(card.dataset.taskId, {
    card,
    button,
    title: card.querySelector("h3")?.textContent.trim() || "Завдання",
    message: card.querySelector(".task-message"),
    reward: Number(card.dataset.reward) || 0,
    category: card.dataset.category || "starter",
    originalAction: button?.dataset.taskAction || "check",
    originalText: button?.textContent.trim() || "ПЕРЕВІРИТИ",
    originalClasses: button?.className || "task-action",
  });
});

function createDefaultState() {
  return {
    balance: 0,
    weeklyProgress: 0,
    weeklyRewardClaimed: false,
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
  const defaultState = createDefaultState();

  try {
    const savedValue = localStorage.getItem(STORAGE_KEY);

    if (!savedValue) {
      return defaultState;
    }

    const savedState = JSON.parse(savedValue);

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
    };
  } catch (error) {
    console.warn("Не вдалося завантажити прогрес:", error);
    return defaultState;
  }
}

let rewardsState = loadRewardsState();

function saveRewardsState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(rewardsState)
    );
  } catch (error) {
    console.warn("Не вдалося зберегти прогрес:", error);
  }
}

/*
 * =========================================================
 * СЛУЖБОВІ ЗМІННІ
 * =========================================================
 */

let activeFilter = "all";
let activeVerificationTaskId = null;

let toastTimer;
let rewardToastTimer;
let verificationTimer;
let overlayCloseTimer;
let guideCloseTimer;
let countdownTimer;
let balanceAnimationFrame;

let lockedScrollPosition = 0;

/*
 * =========================================================
 * ДОПОМІЖНІ ФУНКЦІЇ
 * =========================================================
 */

function getTaskRecord(taskId) {
  if (!rewardsState.tasks[taskId]) {
    rewardsState.tasks[taskId] = {
      status: "available",
    };
  }

  return rewardsState.tasks[taskId];
}

function formatNumber(value) {
  return new Intl.NumberFormat("uk-UA").format(value);
}

function normalizeTelegramUsername(username) {
  return String(username || "")
    .trim()
    .replace(/^@+/, "");
}

function isTelegramUsernameConfigured(username) {
  const normalizedUsername = normalizeTelegramUsername(username);

  return (
    normalizedUsername.length > 0 &&
    !normalizedUsername.startsWith("YOUR_")
  );
}

/*
 * =========================================================
 * РІВНІ КОРИСТУВАЧА
 * =========================================================
 */

function getLevelData(balance) {
  if (balance < 250) {
    return {
      level: 1,
      maximum: 250,
    };
  }

  if (balance < 600) {
    return {
      level: 2,
      maximum: 600,
    };
  }

  if (balance < 1200) {
    return {
      level: 3,
      maximum: 1200,
    };
  }

  if (balance < 2000) {
    return {
      level: 4,
      maximum: 2000,
    };
  }

  return {
    level: 5,
    maximum: 3000,
  };
}

function renderBalance(displayedBalance = rewardsState.balance) {
  const levelData = getLevelData(rewardsState.balance);

  pulseBalance.textContent = formatNumber(
    Math.round(displayedBalance)
  );

  levelBadge.textContent = `РІВЕНЬ ${levelData.level}`;

  levelProgressValue.textContent =
    `${formatNumber(rewardsState.balance)} / ` +
    `${formatNumber(levelData.maximum)}`;

  const progressPercent = Math.min(
    (rewardsState.balance / levelData.maximum) * 100,
    100
  );

  levelProgressBar.style.width = `${progressPercent}%`;

  levelProgressTrack.setAttribute(
    "aria-valuemax",
    String(levelData.maximum)
  );

  levelProgressTrack.setAttribute(
    "aria-valuenow",
    String(rewardsState.balance)
  );
}

function animateBalance(previousBalance, newBalance) {
  window.cancelAnimationFrame(balanceAnimationFrame);

  const duration = 700;
  const startedAt = performance.now();

  function updateBalance(currentTime) {
    const elapsed = currentTime - startedAt;
    const progress = Math.min(elapsed / duration, 1);

    const easedProgress =
      1 - Math.pow(1 - progress, 3);

    const currentBalance =
      previousBalance +
      (newBalance - previousBalance) * easedProgress;

    renderBalance(currentBalance);

    if (progress < 1) {
      balanceAnimationFrame =
        window.requestAnimationFrame(updateBalance);

      return;
    }

    renderBalance(newBalance);
  }

  balanceAnimationFrame =
    window.requestAnimationFrame(updateBalance);
}

/*
 * =========================================================
 * ПОВІДОМЛЕННЯ
 * =========================================================
 */

function showToast(message) {
  window.clearTimeout(toastTimer);

  toastText.textContent = message;
  toast.classList.add("is-visible");

  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, TOAST_DURATION);
}

function showRewardToast(reward) {
  window.clearTimeout(rewardToastTimer);

  rewardToastValue.textContent =
    `+${formatNumber(reward)} PULSE`;

  rewardToast.setAttribute("aria-hidden", "false");
  rewardToast.classList.add("is-visible");

  rewardToastTimer = window.setTimeout(() => {
    rewardToast.classList.remove("is-visible");
    rewardToast.setAttribute("aria-hidden", "true");
  }, REWARD_TOAST_DURATION);
}

/*
 * =========================================================
 * ВІДОБРАЖЕННЯ ЗАВДАНЬ
 * =========================================================
 */

function setTaskMessage(taskId, message, type = "") {
  const meta = taskMeta.get(taskId);

  if (!meta?.message) {
    return;
  }

  meta.message.textContent = message;

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

function setButtonAppearance(button, className, text, action) {
  button.className = className;
  button.textContent = text;
  button.dataset.taskAction = action;
  button.disabled = false;
}

function renderTask(taskId) {
  const meta = taskMeta.get(taskId);

  if (!meta) {
    return;
  }

  const record = getTaskRecord(taskId);
  const { card, button } = meta;

  card.dataset.state = record.status;

  card.classList.toggle(
    "is-completed",
    record.status === "completed"
  );

  card.classList.remove("is-verifying");

  if (record.status === "completed") {
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

  if (record.status === "claimable") {
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
  const favoriteCard = taskMeta.get("favorite-slots")?.card;

  if (favoriteCard) {
    const value =
      rewardsState.progress.favoriteSlots;

    const maximum =
      rewardsState.progress.favoriteSlotsMaximum;

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
        `${Math.min((value / maximum) * 100, 100)}%`;
    }
  }

  const signalMasterCard =
    taskMeta.get("signal-master")?.card;

  if (signalMasterCard) {
    const value =
      rewardsState.progress.signalMaster;

    const maximum =
      rewardsState.progress.signalMasterMaximum;

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
        `${Math.min((value / maximum) * 100, 100)}%`;
    }
  }
}

function renderAllTasks() {
  taskMeta.forEach((value, taskId) => {
    renderTask(taskId);
  });

  renderTaskProgress();
  applyTaskFilter(activeFilter);
}

function applyTaskFilter(filterName) {
  activeFilter = filterName;

  taskFilters.forEach((button) => {
    const isActive =
      button.dataset.filter === filterName;

    button.classList.toggle(
      "is-active",
      isActive
    );

    button.setAttribute(
      "aria-selected",
      String(isActive)
    );
  });

  taskCards.forEach((card) => {
    const shouldShow =
      filterName === "all" ||
      card.dataset.category === filterName;

    card.classList.toggle(
      "is-hidden",
      !shouldShow
    );
  });
}

/*
 * =========================================================
 * ТИЖНЕВИЙ ПРОГРЕС
 * =========================================================
 */

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

  weeklyNodes.forEach((node, index) => {
    const isComplete = index < progress;

    node.classList.toggle(
      "is-complete",
      isComplete
    );

    node.textContent = isComplete ? "✓" : "";
  });
}

/*
 * =========================================================
 * БЛОКУВАННЯ ФОНУ ПІД МОДАЛЬНИМ ВІКНОМ
 * =========================================================
 */

function lockPageScroll() {
  if (document.body.classList.contains("modal-open")) {
    return;
  }

  lockedScrollPosition =
    window.scrollY ||
    document.documentElement.scrollTop ||
    0;

  document.body.style.position = "fixed";
  document.body.style.top = `-${lockedScrollPosition}px`;
  document.body.style.right = "0";
  document.body.style.left = "0";
  document.body.style.width = "100%";

  document.body.classList.add("modal-open");
}

function unlockPageScroll() {
  if (!document.body.classList.contains("modal-open")) {
    return;
  }

  document.body.classList.remove("modal-open");

  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.right = "";
  document.body.style.left = "";
  document.body.style.width = "";

  window.scrollTo(0, lockedScrollPosition);
}

/*
 * =========================================================
 * ВІКНО ПЕРЕВІРКИ
 * =========================================================
 */

function resetVerificationIcon() {
  verificationIcon.classList.remove(
    "is-success",
    "is-error"
  );

  verificationLoader.style.display = "";
  verificationSuccess.style.display = "";

  if (verificationSuccessPath) {
    verificationSuccessPath.setAttribute(
      "d",
      "m8.5 16.5 5 5 10-11"
    );
  }
}

function openVerificationOverlay(taskId) {
  const meta = taskMeta.get(taskId);

  if (!meta) {
    return;
  }

  window.clearTimeout(overlayCloseTimer);

  activeVerificationTaskId = taskId;

  resetVerificationIcon();

  verificationTitle.textContent =
    "Перевіряємо завдання";

  verificationDescription.textContent =
    `Система перевіряє: «${meta.title}». ` +
    "Це займе декілька секунд.";

  verificationActionButton.hidden = true;
  verificationActionButton.dataset.taskId = taskId;

  verificationOverlay.hidden = false;
  verificationOverlay.setAttribute(
    "aria-hidden",
    "false"
  );

  lockPageScroll();

  window.requestAnimationFrame(() => {
    verificationOverlay.classList.add("is-open");
  });
}

function showVerificationSuccess(taskId) {
  const meta = taskMeta.get(taskId);

  verificationIcon.classList.add("is-success");

  verificationTitle.textContent =
    "Завдання виконано";

  verificationDescription.textContent =
    `Ми підтвердили виконання завдання. ` +
    `Тобі доступна нагорода +${meta.reward} PULSE.`;

  verificationActionButton.textContent =
    `ЗАБРАТИ +${meta.reward} PULSE`;

  verificationActionButton.hidden = false;
  verificationActionButton.dataset.taskId = taskId;
  verificationActionButton.dataset.mode = "claim";
}

function showVerificationFailure(taskId, message) {
  verificationIcon.classList.add("is-error");

  if (verificationSuccessPath) {
    verificationSuccessPath.setAttribute(
      "d",
      "m10 10 12 12M22 10 10 22"
    );
  }

  verificationTitle.textContent =
    "Завдання не виконано";

  verificationDescription.textContent = message;

  verificationActionButton.textContent =
    "ЗРОЗУМІЛО";

  verificationActionButton.hidden = false;
  verificationActionButton.dataset.taskId = taskId;
  verificationActionButton.dataset.mode = "close";
}

function closeVerificationOverlay() {
  window.clearTimeout(verificationTimer);

  if (activeVerificationTaskId) {
    renderTask(activeVerificationTaskId);
  }

  verificationOverlay.classList.remove("is-open");
  verificationOverlay.setAttribute(
    "aria-hidden",
    "true"
  );

  unlockPageScroll();

  overlayCloseTimer = window.setTimeout(() => {
    verificationOverlay.hidden = true;
    activeVerificationTaskId = null;
    resetVerificationIcon();
  }, 260);
}

function readFavoriteSlotsCount() {
  try {
    const storedValue =
      localStorage.getItem(FAVORITE_SLOTS_KEY) ||
      sessionStorage.getItem(FAVORITE_SLOTS_KEY);

    if (!storedValue) {
      return 0;
    }

    const parsedValue = JSON.parse(storedValue);

    return Array.isArray(parsedValue)
      ? parsedValue.length
      : 0;
  } catch {
    return 0;
  }
}

function readCreatedSignalCount() {
  const storedValue =
    localStorage.getItem(SIGNAL_COUNT_KEY) ||
    sessionStorage.getItem(SIGNAL_COUNT_KEY);

  const parsedValue = Number(storedValue);

  if (Number.isFinite(parsedValue) && parsedValue > 0) {
    return Math.floor(parsedValue);
  }

  return sessionStorage.getItem(LAST_SIGNAL_KEY)
    ? 1
    : 0;
}

function getTaskVerificationResult(taskId) {
  if (taskId === "telegram-bot") {
    return {
      valid: false,
      message:
        "Перевірку запуску Telegram-бота підключимо через Telegram Mini App. До цього моменту PULSE не нараховуються.",
    };
  }

  if (taskId === "telegram-channel") {
    return {
      valid: false,
      message:
        "Підписку на Telegram-канал має підтвердити наш сервер. Зараз це завдання не нараховує PULSE.",
    };
  }

  if (taskId === "complete-profile") {
    return {
      valid: false,
      message:
        "Сторінку профілю ще не підключено. Завдання стане доступним після її створення.",
    };
  }

  if (taskId === "notifications") {
    const notificationsEnabled =
      "Notification" in window &&
      Notification.permission === "granted";

    return {
      valid: notificationsEnabled,
      message: notificationsEnabled
        ? ""
        : "Спочатку дозволь сповіщення для застосунку.",
    };
  }

  if (taskId === "confirm-subid") {
    const verifiedSubId =
      sessionStorage.getItem(VERIFIED_SUBID_KEY);

    return {
      valid: Boolean(verifiedSubId),
      message:
        "Спочатку введи та підтвердь SUBID на головній сторінці.",
    };
  }

  if (taskId === "favorite-slots") {
    const favoriteCount = readFavoriteSlotsCount();

    rewardsState.progress.favoriteSlots =
      Math.min(
        favoriteCount,
        rewardsState.progress.favoriteSlotsMaximum
      );

    return {
      valid:
        favoriteCount >=
        rewardsState.progress.favoriteSlotsMaximum,
      message:
        `Зараз в обраному ${favoriteCount} із ` +
        `${rewardsState.progress.favoriteSlotsMaximum} слотів.`,
    };
  }

  if (taskId === "first-signal") {
    const hasSignal =
      Boolean(sessionStorage.getItem(LAST_SIGNAL_KEY));

    return {
      valid: hasSignal,
      message:
        "Спочатку створи свій перший сигнал на головній сторінці.",
    };
  }

  if (taskId === "view-live") {
    const viewedLive =
      sessionStorage.getItem(VIEWED_LIVE_KEY) === "true";

    return {
      valid: viewedLive,
      message:
        "Спочатку відкрий сторінку LIVE-сигналів.",
    };
  }

  if (taskId === "signal-master") {
    const signalCount = readCreatedSignalCount();

    rewardsState.progress.signalMaster =
      Math.min(
        signalCount,
        rewardsState.progress.signalMasterMaximum
      );

    return {
      valid:
        signalCount >=
        rewardsState.progress.signalMasterMaximum,
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

function verifyTask(taskId) {
  const meta = taskMeta.get(taskId);

  if (!meta) {
    return;
  }

  clearTaskMessage(taskId);

  meta.card.classList.add("is-verifying");
  meta.button.disabled = true;
  meta.button.textContent = "ПЕРЕВІРКА...";

  openVerificationOverlay(taskId);

  verificationTimer = window.setTimeout(() => {
    const record = getTaskRecord(taskId);
    const result =
      getTaskVerificationResult(taskId);

    if (!result.valid) {
      record.status = "checkable";

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

    record.status = "claimable";
    record.verifiedAt = Date.now();

    saveRewardsState();
    renderTask(taskId);
    renderTaskProgress();
    showVerificationSuccess(taskId);
  }, VERIFICATION_DELAY);
}

/*
 * =========================================================
 * ОТРИМАННЯ НАГОРОДИ
 * =========================================================
 */

function claimTaskReward(taskId) {
  const meta = taskMeta.get(taskId);
  const record = getTaskRecord(taskId);

  if (!meta || record.status !== "claimable") {
    return;
  }

  const previousBalance = rewardsState.balance;

  record.status = "completed";
  record.completedAt = Date.now();

  rewardsState.balance += meta.reward;

  rewardsState.weeklyProgress = Math.min(
    rewardsState.weeklyProgress + 1,
    weeklyNodes.length
  );

  let receivedReward = meta.reward;
  let weeklyGoalCompleted = false;

  if (
    rewardsState.weeklyProgress >= weeklyNodes.length &&
    !rewardsState.weeklyRewardClaimed
  ) {
    rewardsState.weeklyRewardClaimed = true;
    rewardsState.balance += WEEKLY_REWARD;
    receivedReward += WEEKLY_REWARD;
    weeklyGoalCompleted = true;
  }

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
}

/*
 * =========================================================
 * TELEGRAM-ЗАВДАННЯ
 * =========================================================
 */

function openTelegramLink(url) {
  const telegramWebApp =
    window.Telegram?.WebApp;

  if (
    telegramWebApp &&
    typeof telegramWebApp.openTelegramLink === "function"
  ) {
    telegramWebApp.openTelegramLink(url);
    return;
  }

  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );
}

function prepareTaskForChecking(taskId) {
  const record = getTaskRecord(taskId);

  if (record.status === "completed") {
    return;
  }

  record.status = "checkable";
  record.openedAt = Date.now();

  saveRewardsState();
  renderTask(taskId);
}

function openTelegramTask(taskId) {
  let username = "";
  let url = "";

  if (taskId === "telegram-bot") {
    username = normalizeTelegramUsername(
      TELEGRAM_BOT_USERNAME
    );

    if (isTelegramUsernameConfigured(username)) {
      url =
        `https://t.me/${username}` +
        "?start=pulse_rewards";
    }
  }

  if (taskId === "telegram-channel") {
    username = normalizeTelegramUsername(
      TELEGRAM_CHANNEL_USERNAME
    );

    if (isTelegramUsernameConfigured(username)) {
      url = `https://t.me/${username}`;
    }
  }

  if (url) {
    prepareTaskForChecking(taskId);
    openTelegramLink(url);

    showToast(
      "Після виконання повернися та натисни «Перевірити»"
    );

    return;
  }

  /*
   * Поки username і серверна перевірка не підключені,
   * завдання не зараховується.
   */
  showToast(
    "Telegram-посилання і перевірку підключимо на фінальному етапі"
  );
}

/*
 * =========================================================
 * СПОВІЩЕННЯ
 * =========================================================
 */

async function enableNotificationsTask() {
  const taskId = "notifications";
  const record = getTaskRecord(taskId);

  clearTaskMessage(taskId);

  if (!("Notification" in window)) {
    setTaskMessage(
      taskId,
      "Цей браузер не підтримує перевірку сповіщень",
      "is-error"
    );

    showToast("Не вдалося активувати сповіщення");
    return;
  }

  try {
    if (Notification.permission === "granted") {
      record.status = "claimable";
      record.verifiedAt = Date.now();

      saveRewardsState();
      renderTask(taskId);

      showToast("Сповіщення вже дозволені");
      return;
    }

    if (Notification.permission === "denied") {
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
      await Notification.requestPermission();

    if (permission === "granted") {
      record.status = "claimable";
      record.verifiedAt = Date.now();

      saveRewardsState();
      renderTask(taskId);

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

    showToast("Сповіщення поки не підтверджено");
  }
}

/*
 * =========================================================
 * ПЕРЕХОДИ ДО РОЗДІЛІВ
 * =========================================================
 */

function navigateToTaskPage(taskId, pageUrl) {
  prepareTaskForChecking(taskId);

  if (taskId === "view-live") {
    sessionStorage.setItem(
      VIEWED_LIVE_KEY,
      "true"
    );
  }

  showToast(
    "Після виконання повернися та натисни «Перевірити»"
  );

  window.setTimeout(() => {
    window.location.href = pageUrl;
  }, 240);
}

/*
 * =========================================================
 * ПРАВИЛА ВІДПОВІДАЛЬНОЇ ГРИ
 * =========================================================
 */

function openGuideOverlay() {
  window.clearTimeout(guideCloseTimer);

  guideOverlay.hidden = false;
  guideOverlay.setAttribute(
    "aria-hidden",
    "false"
  );

  if (guideDialog) {
    guideDialog.style.touchAction = "pan-y";
  }

  lockPageScroll();

  window.requestAnimationFrame(() => {
    guideOverlay.classList.add("is-open");
  });
}

function closeGuideOverlay() {
  guideOverlay.classList.remove("is-open");
  guideOverlay.setAttribute(
    "aria-hidden",
    "true"
  );

  unlockPageScroll();

  guideCloseTimer = window.setTimeout(() => {
    guideOverlay.hidden = true;
  }, 260);
}

function confirmResponsibleGuide() {
  const taskId = "responsible-guide";
  const record = getTaskRecord(taskId);

  if (record.status !== "completed") {
    record.status = "claimable";
    record.verifiedAt = Date.now();

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

/*
 * =========================================================
 * ОБРОБКА ДІЙ ЗАВДАНЬ
 * =========================================================
 */

function handleTaskAction(button) {
  const card = button.closest(".task-card");

  if (!card) {
    return;
  }

  const taskId = card.dataset.taskId;
  const action = button.dataset.taskAction;

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
      button.dataset.targetPage || "home.html";

    navigateToTaskPage(taskId, pageUrl);
    return;
  }

  if (action === "guide") {
    openGuideOverlay();
  }
}

/*
 * =========================================================
 * ТАЙМЕР ОНОВЛЕННЯ
 * =========================================================
 */

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
    nextDay.getTime() - now.getTime(),
    0
  );
}

function formatCountdown(milliseconds) {
  const totalSeconds = Math.floor(
    milliseconds / 1000
  );

  const hours = Math.floor(
    totalSeconds / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const seconds =
    totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => {
      return String(value).padStart(2, "0");
    })
    .join(":");
}

function updateTaskCountdown() {
  taskRefreshTimer.textContent =
    formatCountdown(getTimeUntilNextDay());
}

/*
 * =========================================================
 * СИНХРОНІЗАЦІЯ З ІНШИМИ СТОРІНКАМИ
 * =========================================================
 */

function synchronizeExistingActivity() {
  /*
   * Якщо користувач уже створював сигнал
   * на головній сторінці.
   */
  const lastSignal =
    sessionStorage.getItem(LAST_SIGNAL_KEY);

  const firstSignalRecord =
    getTaskRecord("first-signal");

  if (
    lastSignal &&
    firstSignalRecord.status !== "completed"
  ) {
    firstSignalRecord.status = "claimable";
    firstSignalRecord.verifiedAt = Date.now();

    rewardsState.progress.signalMaster =
      Math.max(
        readCreatedSignalCount(),
        1
      );
  }

  const subIdRecord =
    getTaskRecord("confirm-subid");

  if (
    sessionStorage.getItem(VERIFIED_SUBID_KEY) &&
    subIdRecord.status !== "completed"
  ) {
    subIdRecord.status = "claimable";
    subIdRecord.verifiedAt = Date.now();
  }

  const liveRecord =
    getTaskRecord("view-live");

  if (
    sessionStorage.getItem(VIEWED_LIVE_KEY) === "true" &&
    liveRecord.status !== "completed"
  ) {
    liveRecord.status = "claimable";
    liveRecord.verifiedAt = Date.now();
  }

  const favoriteCount = readFavoriteSlotsCount();

  rewardsState.progress.favoriteSlots =
    Math.min(
      favoriteCount,
      rewardsState.progress.favoriteSlotsMaximum
    );

  const favoriteRecord =
    getTaskRecord("favorite-slots");

  if (
    favoriteCount >=
      rewardsState.progress.favoriteSlotsMaximum &&
    favoriteRecord.status !== "completed"
  ) {
    favoriteRecord.status = "claimable";
    favoriteRecord.verifiedAt = Date.now();
  }

  const createdSignalCount =
    readCreatedSignalCount();

  rewardsState.progress.signalMaster =
    Math.min(
      createdSignalCount,
      rewardsState.progress.signalMasterMaximum
    );

  const signalMasterRecord =
    getTaskRecord("signal-master");

  if (
    createdSignalCount >=
      rewardsState.progress.signalMasterMaximum &&
    signalMasterRecord.status !== "completed"
  ) {
    signalMasterRecord.status = "claimable";
    signalMasterRecord.verifiedAt = Date.now();
  }

  /*
   * Якщо сповіщення вже дозволені.
   */
  if (
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    const notificationRecord =
      getTaskRecord("notifications");

    if (
      notificationRecord.status !== "completed"
    ) {
      notificationRecord.status = "claimable";
    }
  }

  saveRewardsState();
}

/*
 * =========================================================
 * ОБРОБНИКИ ПОДІЙ
 * =========================================================
 */

taskList.addEventListener("click", (event) => {
  const button =
    event.target.closest(".task-action");

  if (!button) {
    return;
  }

  handleTaskAction(button);
});

taskFilters.forEach((button) => {
  button.addEventListener("click", () => {
    applyTaskFilter(button.dataset.filter);
  });
});

verificationActionButton.addEventListener(
  "click",
  () => {
    if (
      verificationActionButton.dataset.mode ===
      "close"
    ) {
      closeVerificationOverlay();
      return;
    }

    const taskId =
      verificationActionButton.dataset.taskId ||
      activeVerificationTaskId;

    if (!taskId) {
      return;
    }

    claimTaskReward(taskId);
    closeVerificationOverlay();
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
      notificationDot.style.display = "none";
    }

    showToast(
      "Нових сповіщень поки немає"
    );
  }
);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (!verificationOverlay.hidden) {
    closeVerificationOverlay();
    return;
  }

  if (!guideOverlay.hidden) {
    closeGuideOverlay();
  }
});

/*
 * =========================================================
 * ЗАПУСК СТОРІНКИ
 * =========================================================
 */

function initializeRewardsPage() {
  allTasksCount.textContent =
    String(taskCards.length);

  synchronizeExistingActivity();

  renderBalance();
  renderAllTasks();
  renderWeeklyProgress();

  updateTaskCountdown();

  countdownTimer = window.setInterval(
    updateTaskCountdown,
    1000
  );
}

initializeRewardsPage();

/*
 * =========================================================
 * ОЧИЩЕННЯ ТАЙМЕРІВ
 * =========================================================
 */

window.addEventListener("beforeunload", () => {
  window.clearTimeout(toastTimer);
  window.clearTimeout(rewardToastTimer);
  window.clearTimeout(verificationTimer);
  window.clearTimeout(overlayCloseTimer);
  window.clearTimeout(guideCloseTimer);
  window.clearInterval(countdownTimer);
  window.cancelAnimationFrame(balanceAnimationFrame);
});

/*
 * =========================================================
 * PULSE — СПОВІЩЕННЯ ПРО ВИКОНАНІ ЗАВДАННЯ
 * Цей блок має бути в самому кінці bonuses.js.
 * =========================================================
 */

const PULSE_TASK_NOTICE_KEY =
  "arbifyRewardTaskNoticesV1";

function pulseLoadTaskNoticeIds() {
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

function pulseSaveTaskNoticeIds() {
  try {
    localStorage.setItem(
      PULSE_TASK_NOTICE_KEY,
      JSON.stringify(
        Array.from(pulseTaskNoticeIds)
      )
    );
  } catch {
    /*
     * Якщо localStorage недоступний,
     * сторінка продовжить працювати.
     */
  }
}

function pulseUseNotifications(action) {
  if (window.PulseNotifications) {
    action(window.PulseNotifications);
    return;
  }

  document.addEventListener(
    "pulse:notifications-ready",
    () => {
      if (window.PulseNotifications) {
        action(window.PulseNotifications);
      }
    },
    {
      once: true,
    }
  );
}

function pulseNotifyTaskOnce(taskId) {
  const meta = taskMeta.get(taskId);

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
      notificationsApi.addTaskCompleted({
        taskTitle: meta.title,
        reward: meta.reward,
      });
    }
  );
}

function pulseNotifyClaimableTasks() {
  taskMeta.forEach((meta, taskId) => {
    const record =
      getTaskRecord(taskId);

    if (record.status === "claimable") {
      pulseNotifyTaskOnce(taskId);
    }
  });
}

const pulseOriginalVerificationSuccess =
  showVerificationSuccess;

showVerificationSuccess = function (taskId) {
  pulseOriginalVerificationSuccess(taskId);
  pulseNotifyTaskOnce(taskId);
};

const pulseOriginalClaimTaskReward =
  claimTaskReward;

claimTaskReward = function (taskId) {
  const meta = taskMeta.get(taskId);
  const record = getTaskRecord(taskId);

  const wasClaimable =
    record.status === "claimable";

  const weeklyRewardWasClaimed =
    rewardsState.weeklyRewardClaimed;

  pulseOriginalClaimTaskReward(taskId);

  if (
    !meta ||
    !wasClaimable ||
    record.status !== "completed"
  ) {
    return;
  }

  pulseUseNotifications(
    (notificationsApi) => {
      notificationsApi.addReward({
        title: "Нагороду зараховано",
        reward: meta.reward,
        message:
          `За виконання завдання «${meta.title}».`,
      });

      if (
        !weeklyRewardWasClaimed &&
        rewardsState.weeklyRewardClaimed
      ) {
        notificationsApi.addReward({
          title: "Тижневу ціль виконано",
          reward: WEEKLY_REWARD,
          message:
            "Виконано 7 завдань цього тижня. Бонус уже додано до балансу.",
        });
      }
    }
  );
};

/*
 * Основний обробник цієї кнопки зареєстрований вище,
 * тому цей додатковий обробник запускається вже після
 * підтвердження прочитаних правил.
 */
guideConfirm.addEventListener(
  "click",
  () => {
    const taskId =
      "responsible-guide";

    const record =
      getTaskRecord(taskId);

    if (record.status === "claimable") {
      pulseNotifyTaskOnce(taskId);
    }
  }
);

const pulseOriginalEnableNotifications =
  enableNotificationsTask;

enableNotificationsTask =
  async function () {
    const taskId = "notifications";
    const record = getTaskRecord(taskId);

    const wasVerified =
      record.status === "claimable" ||
      record.status === "completed";

    await pulseOriginalEnableNotifications();

    if (
      !wasVerified &&
      record.status === "claimable"
    ) {
      pulseNotifyTaskOnce(taskId);
    }
  };

pulseNotifyClaimableTasks();

/*
 * =========================================================
 * PULSE — ПІДКЛЮЧЕННЯ СТОРІНКИ ПРОФІЛЮ
 * Цей блок має бути в самому кінці bonuses.js.
 * =========================================================
 */

const PULSE_PROFILE_COMPLETED_KEY =
  "arbifyProfileCompleted";

const pulseOriginalProfileVerification =
  getTaskVerificationResult;

getTaskVerificationResult = function (taskId) {
  if (taskId === "complete-profile") {
    const profileCompleted =
      sessionStorage.getItem(
        PULSE_PROFILE_COMPLETED_KEY
      ) === "true";

    return {
      valid: profileCompleted,
      message: profileCompleted
        ? ""
        : "Спочатку відкрий сторінку профілю через нижнє меню.",
    };
  }

  return pulseOriginalProfileVerification(
    taskId
  );
};

/*
 * Старий обробник кнопки профілю знаходиться вище.
 * Цей обробник пропускає користувача за справжнім
 * посиланням profile.html.
 */
profileNavigation.addEventListener(
  "click",
  (event) => {
    event.stopImmediatePropagation();
  },
  {
    capture: true,
  }
);

function pulseSynchronizeProfileTask() {
  const taskId = "complete-profile";
  const record = getTaskRecord(taskId);

  const profileCompleted =
    sessionStorage.getItem(
      PULSE_PROFILE_COMPLETED_KEY
    ) === "true";

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

pulseSynchronizeProfileTask();

document.addEventListener(
  "click",
  (event) => {
    const profileLink = event.target.closest(
      '.bottom-nav a[href="profile.html"]'
    );

    if (!profileLink) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    window.location.assign("profile.html");
  },
  true
);
