"use strict";

(function initializeTelegramMiniApp() {
  const root = document.documentElement;
  const telegram =
    window.Telegram &&
    window.Telegram.WebApp;

  const API_TIMEOUT = 15000;

  let currentUser = null;
  let currentState = {};
  let authenticationPromise = null;

  class ArbifyApiError extends Error {
    constructor(
      message,
      status = 0,
      data = {}
    ) {
      super(message);

      this.name = "ArbifyApiError";
      this.status = status;
      this.data = data;
      this.retryAfterSeconds =
        Number(data.retryAfterSeconds) || 0;
    }
  }

  function dispatchArbifyEvent(
    eventName,
    detail = {}
  ) {
    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail,
      })
    );
  }

  function getTelegramInitData() {
    return telegram?.initData || "";
  }

  function requireTelegramInitData() {
    const initData =
      getTelegramInitData();

    if (!initData) {
      throw new ArbifyApiError(
        "Відкрийте застосунок через Telegram",
        401,
        {
          code: "TELEGRAM_REQUIRED",
        }
      );
    }

    return initData;
  }

  async function apiRequest(
    url,
    payload
  ) {
    const controller =
      new AbortController();

    const timeoutId =
      window.setTimeout(() => {
        controller.abort();
      }, API_TIMEOUT);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok || data.ok === false) {
        throw new ArbifyApiError(
          data.error ||
            "Не вдалося виконати запит",
          response.status,
          data
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ArbifyApiError) {
        throw error;
      }

      if (error?.name === "AbortError") {
        throw new ArbifyApiError(
          "Сервер відповідає надто довго",
          408,
          {
            code: "REQUEST_TIMEOUT",
          }
        );
      }

      throw new ArbifyApiError(
        "Немає зв’язку із сервером",
        0,
        {
          code: "NETWORK_ERROR",
        }
      );
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  function applyAuthenticatedUser(user) {
    currentUser = user || null;
    currentState = {
      ...(user?.state || {}),
    };

    if (currentUser) {
      currentUser.state = currentState;
    }

    root.dataset.arbifyAuth =
      currentUser
        ? "ready"
        : "anonymous";

    try {
      if (currentUser?.accessGranted) {
        sessionStorage.setItem(
          "arbifyAccess",
          "granted"
        );
      } else {
        sessionStorage.removeItem(
          "arbifyAccess"
        );
      }
    } catch {
      /*
       * Авторизація продовжить працювати,
       * навіть якщо sessionStorage
       * недоступний у браузері.
       */
    }

    dispatchArbifyEvent(
      "arbify:auth-ready",
      {
        user: currentUser,
        state: currentState,
      }
    );

    return currentUser;
  }

  async function authenticate(
    options = {}
  ) {
    const force =
      options.force === true;

    if (
      authenticationPromise &&
      !force
    ) {
      return authenticationPromise;
    }

    const initData =
      requireTelegramInitData();

    root.dataset.arbifyAuth =
      "loading";

    authenticationPromise =
      apiRequest(
        "/api/telegram/auth",
        {
          initData,
        }
      )
        .then((result) => {
          return applyAuthenticatedUser(
            result.user
          );
        })
        .catch((error) => {
          root.dataset.arbifyAuth =
            "error";

          dispatchArbifyEvent(
            "arbify:auth-error",
            {
              error,
            }
          );

          authenticationPromise = null;

          throw error;
        });

    return authenticationPromise;
  }

  async function verifyAccessKey(key) {
    const initData =
      requireTelegramInitData();

    const normalizedKey = String(
      key || ""
    )
      .trim()
      .toUpperCase();

    const result = await apiRequest(
      "/api/access/verify",
      {
        initData,
        key: normalizedKey,
      }
    );

    applyAuthenticatedUser(
      result.user
    );

    dispatchArbifyEvent(
      "arbify:access-granted",
      {
        user: currentUser,
        state: currentState,
      }
    );

    return result;
  }

  async function saveState(statePatch) {
    const initData =
      requireTelegramInitData();

    if (
      !statePatch ||
      typeof statePatch !== "object" ||
      Array.isArray(statePatch)
    ) {
      throw new ArbifyApiError(
        "Некоректні дані для збереження",
        400,
        {
          code: "INVALID_STATE",
        }
      );
    }

    const result = await apiRequest(
      "/api/state/save",
      {
        initData,
        state: statePatch,
      }
    );

    currentState = {
      ...(result.state || {}),
    };

    if (currentUser) {
      currentUser.state = currentState;
    }

    dispatchArbifyEvent(
      "arbify:state-updated",
      {
        state: currentState,
        updatedAt:
          result.updatedAt || null,
      }
    );

    return currentState;
  }

  function applyRewardsSnapshot(
    rewards
  ) {
    if (
      !rewards ||
      typeof rewards !== "object"
    ) {
      return null;
    }

    const existingTaskProgress =
      currentState.taskProgress &&
      typeof currentState.taskProgress ===
        "object"
        ? currentState.taskProgress
        : {};

    currentState = {
      ...currentState,
      pulseBalance:
        rewards.balance,
      pulseLevel:
        rewards.level,
      pulseUnlocks:
        rewards
          .unlockedLevelRewards,
      completedTasks:
        rewards.tasks,
      taskProgress: {
        ...existingTaskProgress,
        rewards: {
          highestLevel:
            rewards.highestLevel,
          weeklyProgress:
            rewards.weeklyProgress,
          weeklyRewardClaimed:
            rewards
              .weeklyRewardClaimed,
          progress:
            rewards.progress,
          taskNoticeIds:
            rewards.taskNoticeIds || [],
        },
        createdSignalCount:
          rewards.progress
            ?.createdSignalCount ??
          rewards.progress
            ?.signalMaster ??
          0,
      },
    };

    if (currentUser) {
      currentUser.state = currentState;
    }

    dispatchArbifyEvent(
      "arbify:rewards-updated",
      {
        rewards,
        state: currentState,
      }
    );

    return rewards;
  }

  async function getRewards() {
    const initData =
      requireTelegramInitData();

    const result = await apiRequest(
      "/api/rewards/status",
      {
        initData,
      }
    );

    return applyRewardsSnapshot(
      result.rewards
    );
  }

  async function verifyRewardTask(
    taskId
  ) {
    const initData =
      requireTelegramInitData();

    const result = await apiRequest(
      "/api/rewards/verify",
      {
        initData,
        taskId: String(taskId || ""),
      }
    );

    applyRewardsSnapshot(
      result.rewards
    );

    return result;
  }

  async function claimRewardTask(
    taskId
  ) {
    const initData =
      requireTelegramInitData();

    const result = await apiRequest(
      "/api/rewards/claim",
      {
        initData,
        taskId: String(taskId || ""),
      }
    );

    applyRewardsSnapshot(
      result.rewards
    );

    return result;
  }

  async function recordActivity(
    type,
    payload = {}
  ) {
    const initData =
      requireTelegramInitData();

    const result = await apiRequest(
      "/api/activity/record",
      {
        initData,
        type: String(type || ""),
        payload,
      }
    );

    applyRewardsSnapshot(
      result.rewards
    );

    return result;
  }

  function getCurrentUser() {
    return currentUser;
  }

  function getCurrentState() {
    return {
      ...currentState,
    };
  }

  function isTelegramMiniApp() {
    return Boolean(
      telegram &&
        getTelegramInitData()
    );
  }

  window.ARBIFY_API = {
    Error: ArbifyApiError,
    authenticate,
    verifyAccessKey,
    saveState,
    getRewards,
    verifyRewardTask,
    claimRewardTask,
    recordActivity,
    getCurrentUser,
    getCurrentState,
    getInitData: getTelegramInitData,
    isTelegramMiniApp,
    ready: Promise.resolve(null),
  };

  if (!telegram) {
    root.classList.add(
      "regular-browser"
    );

    root.dataset.arbifyAuth =
      "browser";

    window.ARBIFY_TELEGRAM = {
      webApp: null,
      initData: "",
      user: null,
    };

    return;
  }

  root.classList.add(
    "telegram-mini-app"
  );

  function setCssPixel(
    property,
    value
  ) {
    const numericValue =
      Number(value) || 0;

    root.style.setProperty(
      property,
      `${numericValue}px`
    );
  }

  function updateViewport() {
    const height =
      telegram.viewportStableHeight ||
      telegram.viewportHeight ||
      window.innerHeight;

    setCssPixel(
      "--app-height",
      height
    );

    setCssPixel(
      "--tg-viewport-height-custom",
      height
    );
  }

  function updateSafeArea() {
    const safeArea =
      telegram.safeAreaInset || {};

    const contentSafeArea =
      telegram.contentSafeAreaInset || {};

    setCssPixel(
      "--tg-safe-top",
      safeArea.top
    );

    setCssPixel(
      "--tg-safe-right",
      safeArea.right
    );

    setCssPixel(
      "--tg-safe-bottom",
      safeArea.bottom
    );

    setCssPixel(
      "--tg-safe-left",
      safeArea.left
    );

    setCssPixel(
      "--tg-content-safe-top",
      contentSafeArea.top
    );

    setCssPixel(
      "--tg-content-safe-right",
      contentSafeArea.right
    );

    setCssPixel(
      "--tg-content-safe-bottom",
      contentSafeArea.bottom
    );

    setCssPixel(
      "--tg-content-safe-left",
      contentSafeArea.left
    );
  }

  function configureTelegramColors() {
    try {
      telegram.setHeaderColor(
        "#020307"
      );
    } catch {
      /*
       * Старі версії Telegram можуть
       * не підтримувати цей метод.
       */
    }

    try {
      telegram.setBackgroundColor(
        "#020307"
      );
    } catch {
      /*
       * Залишаємо колір із CSS.
       */
    }

    try {
      telegram.setBottomBarColor(
        "#020307"
      );
    } catch {
      /*
       * Метод доступний не в усіх
       * версіях Telegram.
       */
    }
  }

  function prepareTelegram() {
    configureTelegramColors();
    updateViewport();
    updateSafeArea();

    try {
      telegram.expand();
    } catch {
      /*
       * Mini App продовжить працювати
       * без примусового розгортання.
       */
    }

    telegram.ready();
  }

  telegram.onEvent(
    "viewportChanged",
    updateViewport
  );

  telegram.onEvent(
    "safeAreaChanged",
    updateSafeArea
  );

  telegram.onEvent(
    "contentSafeAreaChanged",
    updateSafeArea
  );

  telegram.onEvent(
    "themeChanged",
    configureTelegramColors
  );

  window.addEventListener(
    "resize",
    updateViewport
  );

  window.ARBIFY_TELEGRAM = {
    webApp: telegram,
    initData:
      getTelegramInitData(),
    user:
      telegram.initDataUnsafe?.user ||
      null,
  };

  prepareTelegram();

  const readyPromise = authenticate()
    .catch((error) => {
      console.error(
        "ARBIFY authentication error:",
        error.message
      );

      return null;
    });

  window.ARBIFY_API.ready =
    readyPromise;
})();
