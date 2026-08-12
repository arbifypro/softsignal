"use strict";

/*
 * =========================================================
 * ARBIFY PULSE — ГЛОБАЛЬНИЙ ЦЕНТР СПОВІЩЕНЬ
 * =========================================================
 *
 * Підключай цей файл перед JS конкретної сторінки:
 *
 * <script src="notifications.js"></script>
 * <script src="home.js"></script>
 *
 * Історія спільна для всіх сторінок і зберігається
 * у localStorage.
 */

(() => {
  const STORAGE_KEY = "arbifyPulseNotificationsV1";
  const MAX_NOTIFICATIONS = 60;
  const READ_DELAY = 650;
  const CLOSE_DELAY = 360;

  const VALID_TYPES = new Set([
    "system",
    "success",
    "reward",
    "signal",
  ]);

  let notifications = loadNotifications();
  let notificationCenter = null;
  let notificationPanel = null;
  let notificationList = null;
  let notificationEmpty = null;
  let notificationSummary = null;
  let notificationClearButton = null;
  let notificationCloseButton = null;
  let notificationBackdrop = null;

  let closeTimer;
  let readTimer;
  let lastFocusedElement = null;

  /*
   * =======================================================
   * СХОВИЩЕ
   * =======================================================
   */

  function createId() {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID === "function"
    ) {
      return window.crypto.randomUUID();
    }

    return (
      `pulse-${Date.now()}-` +
      Math.random().toString(16).slice(2)
    );
  }

  function normalizeType(type) {
    return VALID_TYPES.has(type)
      ? type
      : "system";
  }

  function normalizeNotification(item) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.title !== "string"
    ) {
      return null;
    }

    return {
      id:
        typeof item.id === "string"
          ? item.id
          : createId(),
      type: normalizeType(item.type),
      category:
        typeof item.category === "string"
          ? item.category.slice(0, 40)
          : "PULSE",
      title: item.title.trim().slice(0, 120),
      message:
        typeof item.message === "string"
          ? item.message.trim().slice(0, 300)
          : "",
      reward:
        Number.isFinite(Number(item.reward)) &&
        Number(item.reward) > 0
          ? Math.round(Number(item.reward))
          : 0,
      createdAt:
        Number.isFinite(Number(item.createdAt))
          ? Number(item.createdAt)
          : Date.now(),
      read: Boolean(item.read),
    };
  }

  function loadNotifications() {
    try {
      const storedValue =
        localStorage.getItem(STORAGE_KEY);

      if (!storedValue) {
        return [];
      }

      const parsedValue = JSON.parse(storedValue);

      if (!Array.isArray(parsedValue)) {
        return [];
      }

      return parsedValue
        .map(normalizeNotification)
        .filter(Boolean)
        .sort((first, second) => {
          return second.createdAt - first.createdAt;
        })
        .slice(0, MAX_NOTIFICATIONS);
    } catch (error) {
      console.warn(
        "Impossibile caricare le notifiche:",
        error
      );

      return [];
    }
  }

  function saveNotifications() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          notifications.slice(0, MAX_NOTIFICATIONS)
        )
      );
    } catch (error) {
      console.warn(
        "Impossibile salvare le notifiche:",
        error
      );
    }
  }

  /*
   * =======================================================
   * ДОПОМІЖНІ ФУНКЦІЇ
   * =======================================================
   */

  function formatNumber(value) {
    return new Intl.NumberFormat("it-IT").format(value);
  }

  function getUnreadCount() {
    return notifications.reduce(
      (count, item) => {
        return count + (item.read ? 0 : 1);
      },
      0
    );
  }

  function getPluralMessage(count) {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (
      lastDigit === 1 &&
      lastTwoDigits !== 11
    ) {
      return "nuova notifica";
    }

    if (
      [2, 3, 4].includes(lastDigit) &&
      ![12, 13, 14].includes(lastTwoDigits)
    ) {
      return "nuove notifiche";
    }

    return "nuove notifiche";
  }

  function formatRelativeTime(timestamp) {
    const difference =
      Math.max(Date.now() - timestamp, 0);

    const minutes =
      Math.floor(difference / 60000);

    if (minutes < 1) {
      return "adesso";
    }

    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours =
      Math.floor(minutes / 60);

    if (hours < 24) {
      return `${hours} h`;
    }

    return new Intl.DateTimeFormat(
      "it-IT",
      {
        day: "2-digit",
        month: "2-digit",
      }
    ).format(new Date(timestamp));
  }

  function getIconMarkup(type) {
    if (type === "success") {
      return `
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="8.5"></circle>
          <path d="m8.2 12.2 2.5 2.5 5.3-5.5"></path>
        </svg>
      `;
    }

    if (type === "reward") {
      return `
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M4 10.2h16v10H4zM3 6.8h18v3.4H3z"></path>
          <path d="M12 6.8v13.4"></path>
          <path
            d="M11.7 6.7C9.8 6.9 7 6.5 7 4.5 7 2.2 11 3 11.7 6.7ZM12.3 6.7c1.9.2 4.7-.2 4.7-2.2 0-2.3-4-1.5-4.7 2.2Z"
          ></path>
        </svg>
      `;
    }

    if (type === "signal") {
      return `
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 5v14"></path>
          <path d="M8 8a5.7 5.7 0 0 0 0 8"></path>
          <path d="M16 8a5.7 5.7 0 0 1 0 8"></path>
          <path d="M4.8 5a10 10 0 0 0 0 14"></path>
          <path d="M19.2 5a10 10 0 0 1 0 14"></path>
        </svg>
      `;
    }

    return `
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M6.2 10.2c0-3.6 2.1-6.2 5.8-6.2s5.8 2.6 5.8 6.2v4l1.7 2.4h-15l1.7-2.4v-4Z"
        ></path>
        <path d="M9.8 19.2c.5.6 1.2.8 2.2.8s1.7-.2 2.2-.8"></path>
      </svg>
    `;
  }

  /*
   * =======================================================
   * РОЗМІТКА
   * =======================================================
   */

  function createNotificationCenter() {
    if (
      document.querySelector(
        "#pulseNotificationCenter"
      )
    ) {
      return;
    }

    const wrapper =
      document.createElement("div");

    wrapper.className =
      "pulse-notification-center";

    wrapper.id = "pulseNotificationCenter";
    wrapper.hidden = true;
    wrapper.setAttribute(
      "aria-hidden",
      "true"
    );

    wrapper.innerHTML = `
      <div
        class="pulse-notification-backdrop"
        data-pulse-notification-close
        aria-hidden="true"
      ></div>

      <aside
        class="pulse-notification-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pulseNotificationTitle"
      >
        <div
          class="pulse-notification-handle"
          aria-hidden="true"
        ></div>

        <header class="pulse-notification-header">
          <div class="pulse-notification-heading">
            <p class="pulse-notification-eyebrow">
              PULSE CENTER
            </p>

            <h2
              class="pulse-notification-title"
              id="pulseNotificationTitle"
            >
              Notifiche
            </h2>
          </div>

          <button
            class="pulse-notification-close"
            type="button"
            data-pulse-notification-close
            aria-label="Chiudi notifiche"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            >
              <path d="m6 6 12 12M18 6 6 18"></path>
            </svg>
          </button>
        </header>

        <div class="pulse-notification-summary">
          <span data-pulse-notification-summary>
            Nessuna nuova notifica
          </span>

          <button
            class="pulse-notification-clear"
            type="button"
            data-pulse-notification-clear
            hidden
          >
            CANCELLA
          </button>
        </div>

        <div
          class="pulse-notification-list"
          data-pulse-notification-list
          aria-live="polite"
        ></div>

        <div
          class="pulse-notification-empty"
          data-pulse-notification-empty
        >
          <div
            class="pulse-notification-empty-icon"
            aria-hidden="true"
          >
            ${getIconMarkup("system")}
          </div>

          <strong>Ancora nessuna notifica</strong>

          <p>
            Qui appariranno le attività completate,
            i premi ricevuti e le notifiche importanti di Pulse.
          </p>
        </div>
      </aside>
    `;

    document.body.appendChild(wrapper);
  }

  function collectElements() {
    notificationCenter =
      document.querySelector(
        "#pulseNotificationCenter"
      );

    notificationPanel =
      notificationCenter?.querySelector(
        ".pulse-notification-panel"
      );

    notificationList =
      notificationCenter?.querySelector(
        "[data-pulse-notification-list]"
      );

    notificationEmpty =
      notificationCenter?.querySelector(
        "[data-pulse-notification-empty]"
      );

    notificationSummary =
      notificationCenter?.querySelector(
        "[data-pulse-notification-summary]"
      );

    notificationClearButton =
      notificationCenter?.querySelector(
        "[data-pulse-notification-clear]"
      );

    notificationCloseButton =
      notificationCenter?.querySelector(
        ".pulse-notification-close"
      );

    notificationBackdrop =
      notificationCenter?.querySelector(
        ".pulse-notification-backdrop"
      );
  }

  function createBadge(button) {
    let badge =
      button.querySelector(
        "[data-notification-badge]"
      );

    if (badge) {
      return badge;
    }

    badge = document.createElement("span");
    badge.className = "notification-badge";
    badge.dataset.notificationBadge = "";
    badge.hidden = true;
    badge.textContent = "0";
    badge.setAttribute(
      "aria-label",
      "Nuove notifiche"
    );

    button.appendChild(badge);

    return badge;
  }

  function getNotificationButtons() {
    return Array.from(
      document.querySelectorAll(
        "#notificationButton, " +
          "[data-notification-button]"
      )
    );
  }

  /*
   * =======================================================
   * ВІДОБРАЖЕННЯ
   * =======================================================
   */

  function renderBadge() {
    const unreadCount = getUnreadCount();

    getNotificationButtons().forEach(
      (button) => {
        const badge = createBadge(button);
        const oldDot =
          button.querySelector(
            ".notification-dot"
          );

        if (oldDot) {
          oldDot.style.display = "none";
        }

        button.classList.toggle(
          "has-notifications",
          unreadCount > 0
        );

        button.setAttribute(
          "aria-label",
          unreadCount > 0
            ? `Notifiche: ${unreadCount} нових`
            : "Notifiche"
        );

        badge.textContent =
          unreadCount > 99
            ? "99+"
            : String(unreadCount);

        badge.hidden = unreadCount === 0;
      }
    );
  }

  function createNotificationElement(item) {
    const article =
      document.createElement("article");

    article.className =
      `pulse-notification-item is-${item.type}`;

    article.dataset.notificationId = item.id;

    article.classList.toggle(
      "is-unread",
      !item.read
    );

    const icon =
      document.createElement("div");

    icon.className =
      "pulse-notification-icon";

    icon.innerHTML =
      getIconMarkup(item.type);

    const copy =
      document.createElement("div");

    copy.className =
      "pulse-notification-copy";

    const meta =
      document.createElement("div");

    meta.className =
      "pulse-notification-meta";

    const category =
      document.createElement("span");

    category.textContent =
      item.category || "PULSE";

    const time =
      document.createElement("span");

    time.className =
      "pulse-notification-time";

    time.textContent =
      formatRelativeTime(item.createdAt);

    meta.append(category, time);

    const title =
      document.createElement("h3");

    title.className =
      "pulse-notification-item-title";

    title.textContent = item.title;

    copy.append(meta, title);

    if (item.message) {
      const message =
        document.createElement("p");

      message.className =
        "pulse-notification-message";

      message.textContent = item.message;
      copy.appendChild(message);
    }

    if (item.reward > 0) {
      const reward =
        document.createElement("span");

      reward.className =
        "pulse-notification-reward";

      reward.textContent =
        `+${formatNumber(item.reward)} PULSE`;

      copy.appendChild(reward);
    }

    article.append(icon, copy);

    return article;
  }

  function renderNotifications() {
    if (
      !notificationList ||
      !notificationEmpty ||
      !notificationSummary ||
      !notificationClearButton
    ) {
      renderBadge();
      return;
    }

    notificationList.replaceChildren();

    notifications.forEach((item) => {
      notificationList.appendChild(
        createNotificationElement(item)
      );
    });

    const hasNotifications =
      notifications.length > 0;

    notificationList.hidden =
      !hasNotifications;

    notificationEmpty.hidden =
      hasNotifications;

    notificationClearButton.hidden =
      !hasNotifications;

    const unreadCount = getUnreadCount();

    notificationSummary.textContent =
      unreadCount > 0
        ? `${unreadCount} ${getPluralMessage(unreadCount)}`
        : hasNotifications
          ? "Tutte le notifiche sono state lette"
          : "Nessuna nuova notifica";

    renderBadge();
  }

  /*
   * =======================================================
   * ВІДКРИТТЯ ТА ЗАКРИТТЯ
   * =======================================================
   */

  function syncVisualViewport() {
    const viewport =
      window.visualViewport;

    const height =
      viewport?.height ||
      window.innerHeight;

    document.documentElement.style.setProperty(
      "--pulse-notification-visual-height",
      `${Math.round(height)}px`
    );
  }

  function markAllAsRead() {
    let changed = false;

    notifications = notifications.map(
      (item) => {
        if (item.read) {
          return item;
        }

        changed = true;

        return {
          ...item,
          read: true,
        };
      }
    );

    if (!changed) {
      return;
    }

    saveNotifications();
    renderNotifications();
  }

function openNotificationCenter() {
  if (!notificationCenter) {
    return;
  }

  /*
   * Якщо сповіщень немає — велике вікно
   * не відкриваємо, а показуємо повідомлення знизу.
   */
  if (notifications.length === 0) {
    let emptyToast =
      document.querySelector(
        "#pulseNotificationEmptyToast"
      );

    if (!emptyToast) {
      emptyToast =
        document.createElement("div");

      emptyToast.id =
        "pulseNotificationEmptyToast";

      emptyToast.className =
        "pulse-notification-toast";

      emptyToast.setAttribute(
        "role",
        "status"
      );

      emptyToast.setAttribute(
        "aria-live",
        "polite"
      );

      emptyToast.innerHTML = `
        <span
          class="pulse-notification-toast-dot"
          aria-hidden="true"
        ></span>

        <span>
          Nessuna nuova notifica al momento
        </span>
      `;

      document.body.appendChild(
        emptyToast
      );
    }

    const previousTimer =
      Number(
        emptyToast.dataset.hideTimer
      );

    if (previousTimer) {
      window.clearTimeout(
        previousTimer
      );
    }

    emptyToast.classList.remove(
      "is-visible"
    );

    void emptyToast.offsetWidth;

    emptyToast.classList.add(
      "is-visible"
    );

    const hideTimer =
      window.setTimeout(() => {
        emptyToast.classList.remove(
          "is-visible"
        );
      }, 2300);

    emptyToast.dataset.hideTimer =
      String(hideTimer);

    return;
  }

  window.clearTimeout(closeTimer);
  window.clearTimeout(readTimer);

  lastFocusedElement =
    document.activeElement;

  syncVisualViewport();
  renderNotifications();

  notificationCenter.hidden = false;

  notificationCenter.setAttribute(
    "aria-hidden",
    "false"
  );

  document.documentElement.classList.add(
    "pulse-notifications-locked"
  );

  document.body.classList.add(
    "pulse-notifications-open"
  );

  getNotificationButtons().forEach(
    (button) => {
      button.setAttribute(
        "aria-expanded",
        "true"
      );
    }
  );

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      notificationCenter.classList.add(
        "is-open"
      );

      notificationCloseButton?.focus({
        preventScroll: true,
      });
    });
  });

  readTimer = window.setTimeout(
    markAllAsRead,
    READ_DELAY
  );
}
  function closeNotificationCenter() {
    if (
      !notificationCenter ||
      notificationCenter.hidden
    ) {
      return;
    }

    window.clearTimeout(readTimer);
    window.clearTimeout(closeTimer);

    markAllAsRead();

    notificationCenter.classList.remove(
      "is-open"
    );

    notificationCenter.setAttribute(
      "aria-hidden",
      "true"
    );

    document.documentElement.classList.remove(
      "pulse-notifications-locked"
    );

    document.body.classList.remove(
      "pulse-notifications-open"
    );

    getNotificationButtons().forEach(
      (button) => {
        button.setAttribute(
          "aria-expanded",
          "false"
        );
      }
    );

    closeTimer = window.setTimeout(() => {
      notificationCenter.hidden = true;
    }, CLOSE_DELAY);

    if (
      lastFocusedElement &&
      typeof lastFocusedElement.focus ===
        "function"
    ) {
      lastFocusedElement.focus({
        preventScroll: true,
      });
    }
  }

  function isOpen() {
    return Boolean(
      notificationCenter &&
      !notificationCenter.hidden &&
      notificationCenter.classList.contains(
        "is-open"
      )
    );
  }

  /*
   * =======================================================
   * ПУБЛІЧНІ ДІЇ
   * =======================================================
   */

  function addNotification(data = {}) {
    const title =
      typeof data.title === "string"
        ? data.title.trim()
        : "";

    if (!title) {
      return null;
    }

    const item = normalizeNotification({
      id: createId(),
      type: data.type,
      category: data.category,
      title,
      message: data.message,
      reward: data.reward,
      createdAt: Date.now(),
      read: false,
    });

    notifications = [
      item,
      ...notifications,
    ].slice(0, MAX_NOTIFICATIONS);

    saveNotifications();
    renderNotifications();

    document.dispatchEvent(
      new CustomEvent(
        "pulse:notification-added",
        {
          detail: {
            ...item,
          },
        }
      )
    );

    return item.id;
  }

  function addTaskCompleted({
    taskTitle = "Attività",
    reward = 0,
  } = {}) {
    return addNotification({
      type: "success",
      category: "ATTIVITÀ COMPLETATA",
      title: taskTitle,
      message:
        reward > 0
          ? "Attività verificata. Il premio è pronto per essere riscattato."
          : "Attività completata con successo.",
      reward,
    });
  }

  function addReward({
    title = "Premio accreditato",
    reward = 0,
    message = "Il saldo PULSE è stato aggiornato correttamente.",
  } = {}) {
    return addNotification({
      type: "reward",
      category: "PULSE REWARDS",
      title,
      message,
      reward,
    });
  }

  function addSignal({
    title = "Nuovo segnale pronto",
    message = "Apri il segnale per visualizzare i parametri.",
  } = {}) {
    return addNotification({
      type: "signal",
      category: "PULSE SIGNAL",
      title,
      message,
    });
  }

  function clearNotifications() {
    notifications = [];
    saveNotifications();
    renderNotifications();
  }

  function getNotifications() {
    return notifications.map((item) => {
      return {
        ...item,
      };
    });
  }

  /*
   * =======================================================
   * ПОДІЇ
   * =======================================================
   */

  function configureButtons() {
    getNotificationButtons().forEach(
      (button) => {
        if (
          button.dataset
            .pulseNotificationsConfigured ===
          "true"
        ) {
          return;
        }

        button.dataset
          .pulseNotificationsConfigured =
          "true";

        button.setAttribute(
          "aria-controls",
          "pulseNotificationCenter"
        );

        button.setAttribute(
          "aria-expanded",
          "false"
        );

        /*
         * Capture + stopImmediatePropagation прибирає
         * старі сторінкові обробники дзвіночка.
         */
        button.addEventListener(
          "click",
          (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();

            if (isOpen()) {
              closeNotificationCenter();
              return;
            }

            openNotificationCenter();
          },
          true
        );
      }
    );
  }

  function configureCenterEvents() {
    notificationCloseButton?.addEventListener(
      "click",
      closeNotificationCenter
    );

    notificationBackdrop?.addEventListener(
      "click",
      closeNotificationCenter
    );

    notificationClearButton?.addEventListener(
      "click",
      () => {
        clearNotifications();
      }
    );

    notificationCenter?.addEventListener(
      "touchmove",
      (event) => {
        const canScroll =
          notificationList?.contains(
            event.target
          );

        if (!canScroll) {
          event.preventDefault();
        }
      },
      {
        passive: false,
      }
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Escape" &&
          isOpen()
        ) {
          closeNotificationCenter();
        }
      }
    );

    window.addEventListener(
      "storage",
      (event) => {
        if (event.key !== STORAGE_KEY) {
          return;
        }

        notifications =
          loadNotifications();

        renderNotifications();
      }
    );

    window.addEventListener(
      "resize",
      syncVisualViewport
    );

    window.visualViewport?.addEventListener(
      "resize",
      syncVisualViewport
    );

    window.visualViewport?.addEventListener(
      "scroll",
      syncVisualViewport
    );

    window.addEventListener(
      "beforeunload",
      () => {
        window.clearTimeout(closeTimer);
        window.clearTimeout(readTimer);
      }
    );
  }

  /*
   * =======================================================
   * ЗАПУСК
   * =======================================================
   */

  function initialize() {
    createNotificationCenter();
    collectElements();
    configureButtons();
    configureCenterEvents();
    syncVisualViewport();
    renderNotifications();

    window.PulseNotifications =
      Object.freeze({
        add: addNotification,
        addTaskCompleted,
        addReward,
        addSignal,
        open: openNotificationCenter,
        close: closeNotificationCenter,
        clear: clearNotifications,
        markAllAsRead,
        getAll: getNotifications,
        getUnreadCount,
      });

    document.dispatchEvent(
      new CustomEvent(
        "pulse:notifications-ready"
      )
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      {
        once: true,
      }
    );
  } else {
    initialize();
  }
})();
