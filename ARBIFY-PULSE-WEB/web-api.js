"use strict";

/*
 * ARBIFY PULSE — browser/web adapter
 * ----------------------------------
 * This file lets the existing ARBIFY PULSE front-end run outside Telegram
 * without touching the Telegram Mini App project.
 *
 * IMPORTANT: this is a client-side access gate, not production-grade security.
 * Change WEB_ACCESS_KEY below if you want another demo/web key.
 */
(function initializeArbifyWebApi() {
  const STORAGE_USER_KEY = "arbifyWebUserV1";
  const STORAGE_STATE_KEY = "arbifyWebStateV1";
  const WEB_ACCESS_KEY = "ARBIFY";

  let currentState = readJson(STORAGE_STATE_KEY, {});
  let currentUser = readJson(STORAGE_USER_KEY, null);

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* The site continues working for the current page even if storage fails. */
    }
  }

  function createUser(accessGranted = false) {
    return {
      id: "web-user",
      telegramId: null,
      username: null,
      firstName: "Web",
      lastName: "User",
      accessGranted,
      state: { ...currentState },
    };
  }

  function persistUser() {
    if (!currentUser) {
      currentUser = createUser(false);
    }
    currentUser.state = { ...currentState };
    writeJson(STORAGE_USER_KEY, currentUser);
  }

  async function authenticate() {
    if (!currentUser) {
      currentUser = createUser(
        sessionStorage.getItem("arbifyAccess") === "granted"
      );
      persistUser();
    }

    if (currentUser.accessGranted) {
      try {
        sessionStorage.setItem("arbifyAccess", "granted");
      } catch {}
    }

    currentUser.state = { ...currentState };
    return currentUser;
  }

  async function verifyAccessKey(key) {
    const normalizedKey = String(key || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

    if (normalizedKey !== WEB_ACCESS_KEY) {
      const error = new Error("Chiave di accesso non valida");
      error.status = 401;
      error.data = { code: "INVALID_ACCESS_KEY" };
      throw error;
    }

    currentUser = createUser(true);
    persistUser();

    try {
      sessionStorage.setItem("arbifyAccess", "granted");
    } catch {}

    return {
      ok: true,
      user: currentUser,
      state: { ...currentState },
    };
  }

  async function saveState(statePatch) {
    if (!statePatch || typeof statePatch !== "object" || Array.isArray(statePatch)) {
      throw new Error("Dati non validi da salvare");
    }

    currentState = {
      ...currentState,
      ...statePatch,
    };

    writeJson(STORAGE_STATE_KEY, currentState);
    persistUser();
    return { ...currentState };
  }

  async function getRewards() {
    const stored = readJson("arbifyRewardsStateV2", null);
    return stored || {
      balance: 0,
      level: 1,
      highestLevel: 1,
      unlockedLevelRewards: ["base-access"],
      weeklyProgress: 0,
      weeklyRewardClaimed: false,
      taskNoticeIds: [],
      tasks: {},
      progress: {
        favoriteSlots: 0,
        favoriteSlotsMaximum: 3,
        signalMaster: 0,
        signalMasterMaximum: 10,
      },
    };
  }

  async function verifyRewardTask(taskId) {
    return {
      ok: true,
      taskId: String(taskId || ""),
      rewards: await getRewards(),
    };
  }

  async function claimRewardTask(taskId) {
    return {
      ok: true,
      taskId: String(taskId || ""),
      newlyClaimed: false,
      receivedReward: 0,
      weeklyRewardReceived: 0,
      rewards: await getRewards(),
    };
  }

  async function recordActivity() {
    return {
      ok: true,
      activityRecorded: true,
      rewards: await getRewards(),
    };
  }

  function getCurrentUser() {
    return currentUser;
  }

  function getCurrentState() {
    return { ...currentState };
  }

  function isTelegramMiniApp() {
    return false;
  }

  function resetWebAccess() {
    currentUser = createUser(false);
    persistUser();
    try {
      sessionStorage.removeItem("arbifyAccess");
    } catch {}
  }

  window.ARBIFY_TELEGRAM = {
    webApp: null,
    initData: "",
    user: null,
  };

  window.ARBIFY_API = {
    authenticate,
    verifyAccessKey,
    saveState,
    getRewards,
    verifyRewardTask,
    claimRewardTask,
    recordActivity,
    getCurrentUser,
    getCurrentState,
    isTelegramMiniApp,
    resetWebAccess,
    ready: authenticate(),
  };
})();
