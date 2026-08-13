"use strict";

/*
 * Inserisci lo username del referente SENZA il simbolo @.
 */
const TELEGRAM_USERNAME = "arbifypulse";
const HOME_PAGE = "home.html";

const app = document.querySelector(
  ".signal-app"
);

const accessForm = document.querySelector(
  "#accessForm"
);

const accessPanel = document.querySelector(
  "#accessPanel"
);

const successPanel = document.querySelector(
  "#successPanel"
);

const accessKey = document.querySelector(
  "#accessKey"
);

const accessButton = document.querySelector(
  "#accessButton"
);

const keyField = document.querySelector(
  "#keyField"
);

const keyLength = document.querySelector(
  "#keyLength"
);

const formMessage = document.querySelector(
  "#formMessage"
);

const resetButton = document.querySelector(
  "#resetButton"
);

const continueButton = document.querySelector(
  "#continueButton"
);

const supportButton = document.querySelector(
  "#supportButton"
);

const supportPopover = document.querySelector(
  "#supportPopover"
);

const footer = document.querySelector(
  "footer"
);

let stableAppHeight = window.innerHeight;
let authenticationPromise = null;

function preventPageZoom() {
  const preventGesture = (event) => {
    event.preventDefault();
  };

  /*
   * Блокує масштабування двома пальцями
   * у Safari на iPhone.
   */
  [
    "gesturestart",
    "gesturechange",
    "gestureend",
  ].forEach((eventName) => {
    document.addEventListener(
      eventName,
      preventGesture,
      {
        passive: false,
      }
    );
  });

  /*
   * Блокує масштабування двома пальцями
   * на iPhone та Android.
   */
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

  /*
   * Блокує збільшення сторінки
   * подвійним натисканням.
   */
  let lastTouchEnd = 0;

  document.addEventListener(
    "touchend",
    (event) => {
      const now = Date.now();

      if (
        now - lastTouchEnd <= 300
      ) {
        event.preventDefault();
      }

      lastTouchEnd = now;
    },
    {
      passive: false,
    }
  );

  /*
   * Блокує масштабування через
   * Ctrl + колесо або жест трекпада.
   */
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

function resetPagePosition() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function getStableHeight() {
  const telegram =
    window.ARBIFY_TELEGRAM?.webApp;

  return (
    telegram?.viewportStableHeight ||
    stableAppHeight ||
    window.innerHeight
  );
}

function setAppHeight() {
  /*
   * Коли поле активне, клавіатура
   * не змінює зафіксовану висоту.
   */
  if (document.activeElement !== accessKey) {
    stableAppHeight = window.innerHeight;
  }

  document.documentElement.style.setProperty(
    "--app-height",
    `${getStableHeight()}px`
  );
}

function normalizeKey(value) {
  return value
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(
      /[^A-ZА-ЯІЇЄҐ0-9-]/g,
      ""
    )
    .slice(0, 32);
}

function clearMessage() {
  keyField.classList.remove(
    "has-error",
    "is-validating"
  );

  formMessage.innerHTML = "&nbsp;";
}

function restoreAccessButton() {
  accessButton.disabled = false;

  accessButton.innerHTML = `
    <span class="button-sheen"></span>
    <span class="button-label">ACCEDI</span>
  `;
}

function showKeyError(message) {
  keyField.classList.remove(
    "has-error"
  );

  void keyField.offsetWidth;

  keyField.classList.add(
    "has-error"
  );

  formMessage.textContent = message;

  accessKey.focus({
    preventScroll: true,
  });

  resetPagePosition();
}

function showSystemMessage(message) {
  keyField.classList.remove(
    "is-validating"
  );

  formMessage.textContent = message;
}

function startVerification() {
  clearMessage();

  keyField.classList.add(
    "is-validating"
  );

  app.classList.add(
    "is-checking"
  );

  accessButton.disabled = true;

  accessButton.innerHTML = `
    <span class="button-loader"></span>
    <span>VERIFICA DELLA CHIAVE</span>
  `;
}

function finishVerification() {
  keyField.classList.remove(
    "is-validating"
  );

  app.classList.remove(
    "is-checking"
  );

  app.classList.add(
    "is-success"
  );

  accessPanel.hidden = true;
  successPanel.hidden = false;

  try {
    sessionStorage.setItem(
      "arbifyAccess",
      "granted"
    );
  } catch {
    /*
     * Основний доступ уже збережено
     * у серверній базі даних.
     */
  }

  resetPagePosition();
}

function getApiErrorMessage(error) {
  const retryAfterSeconds =
    Number(
      error?.retryAfterSeconds ||
        error?.data?.retryAfterSeconds
    ) || 0;

  if (error?.status === 429) {
    const minutes = Math.max(
      1,
      Math.ceil(
        retryAfterSeconds / 60
      )
    );

    return (
      `Troppi tentativi. ` +
      `Riprova tra ${minutes} min.`
    );
  }

  if (
    error?.data?.code ===
    "TELEGRAM_REQUIRED"
  ) {
    return "Apri l’app tramite Telegram";
  }

  if (
    error?.status === 408 ||
    error?.data?.code ===
      "REQUEST_TIMEOUT"
  ) {
    return "Il server impiega troppo tempo a rispondere. Riprova";
  }

  if (
    error?.status === 0 ||
    error?.data?.code ===
      "NETWORK_ERROR"
  ) {
    return "Impossibile connettersi al server. Controlla la connessione Internet";
  }

  if (error?.status === 503) {
    return "La verifica della chiave è temporaneamente non disponibile";
  }

  return "Questa chiave non è stata trovata oppure è scaduta";
}

function requireArbifyApi() {
  if (!window.ARBIFY_API) {
    throw new Error(
      "ARBIFY API is not loaded"
    );
  }

  return window.ARBIFY_API;
}

async function authenticateTelegramUser() {
  if (authenticationPromise) {
    return authenticationPromise;
  }

  authenticationPromise =
    (async () => {
      const api = requireArbifyApi();
      const user =
        await api.authenticate();

      if (user?.accessGranted) {
        finishVerification();
      }

      return user;
    })().catch((error) => {
      authenticationPromise = null;
      throw error;
    });

  return authenticationPromise;
}

async function verifyAccessKey(key) {
  const api = requireArbifyApi();

  await authenticateTelegramUser();

  return api.verifyAccessKey(key);
}

function configureSupport() {
  const usernameConfigured =
    Boolean(TELEGRAM_USERNAME) &&
    TELEGRAM_USERNAME !==
      "YOUR_USERNAME";

  const telegramUrl = usernameConfigured
    ? `https://t.me/${TELEGRAM_USERNAME.replace(
        "@",
        ""
      )}`
    : "#";

  supportPopover.innerHTML = `
    <p>
      Non riesci ad accedere? Contatta il referente: ti aiuterà a ottenere
      o recuperare la chiave.
    </p>

    <a
      class="telegram-button"
      id="telegramSupportLink"
      href="${telegramUrl}"
      target="_blank"
      rel="noopener noreferrer"
    >
      SCRIVI SU TELEGRAM
    </a>
  `;

  const telegramSupportLink =
    document.querySelector(
      "#telegramSupportLink"
    );

  if (!usernameConfigured) {
    telegramSupportLink.addEventListener(
      "click",
      (event) => {
        event.preventDefault();

        supportPopover.querySelector(
          "p"
        ).textContent =
          "Prima specifica lo username del referente nel file script.js.";
      }
    );
  }
}

function addResponsibleNotice() {
  if (
    footer.querySelector(
      ".responsible-note"
    )
  ) {
    return;
  }

  const notice =
    document.createElement("p");

  notice.className =
    "responsible-note";

  notice.textContent =
    "18+ · Gioca responsabilmente";

  footer.appendChild(notice);
}

accessKey.addEventListener(
  "input",
  () => {
    const normalizedValue =
      normalizeKey(accessKey.value);

    if (
      accessKey.value !==
      normalizedValue
    ) {
      accessKey.value =
        normalizedValue;
    }

    const length =
      normalizedValue.length;

    keyLength.textContent = length
      ? `${length}/32`
      : "";

    keyField.classList.toggle(
      "has-value",
      length > 0
    );

    clearMessage();
  }
);

/*
 * Не прокручуємо сторінку до поля.
 * Після відкриття клавіатури
 * повертаємо сторінку на початок.
 */
accessKey.addEventListener(
  "focus",
  () => {
    resetPagePosition();

    window.setTimeout(
      resetPagePosition,
      80
    );

    window.setTimeout(
      resetPagePosition,
      350
    );
  }
);

accessKey.addEventListener(
  "blur",
  () => {
    window.setTimeout(() => {
      resetPagePosition();
      setAppHeight();
    }, 400);
  }
);

accessForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const key = normalizeKey(
      accessKey.value
    );

    accessKey.value = key;

    if (key.length !== 6) {
      showKeyError(
        "La chiave deve contenere 6 caratteri"
      );

      return;
    }

    supportPopover.hidden = true;

    supportButton.setAttribute(
      "aria-expanded",
      "false"
    );

    accessKey.blur();
    resetPagePosition();
    startVerification();

    try {
      const result =
        await verifyAccessKey(key);

      if (
        result.accessGranted ||
        result.user?.accessGranted
      ) {
        finishVerification();
        return;
      }

      throw new Error(
        "Access was not granted"
      );
    } catch (error) {
      app.classList.remove(
        "is-checking"
      );

      keyField.classList.remove(
        "is-validating"
      );

      restoreAccessButton();

      showKeyError(
        getApiErrorMessage(error)
      );
    }
  }
);

resetButton.addEventListener(
  "click",
  () => {
    accessKey.value = "";
    keyLength.textContent = "";
    formMessage.innerHTML = "&nbsp;";

    keyField.classList.remove(
      "has-error",
      "has-value",
      "is-validating"
    );

    app.classList.remove(
      "is-checking",
      "is-success"
    );

    restoreAccessButton();

    successPanel.hidden = true;
    accessPanel.hidden = false;

    resetPagePosition();

    accessKey.focus({
      preventScroll: true,
    });
  }
);

continueButton.addEventListener(
  "click",
  () => {
    try {
      sessionStorage.setItem(
        "arbifyAccess",
        "granted"
      );
    } catch {
      /*
       * Доступ уже збережений
       * у базі даних.
       */
    }

    window.location.href =
      HOME_PAGE;
  }
);

supportButton.addEventListener(
  "click",
  () => {
    const willOpen =
      supportPopover.hidden;

    supportPopover.hidden =
      !willOpen;

    supportButton.setAttribute(
      "aria-expanded",
      String(willOpen)
    );
  }
);

/*
 * Не дозволяємо браузеру
 * зрушувати документ.
 */
window.addEventListener(
  "scroll",
  resetPagePosition,
  {
    passive: true,
  }
);

window.addEventListener(
  "resize",
  () => {
    setAppHeight();
    resetPagePosition();
  }
);

window.addEventListener(
  "orientationchange",
  () => {
    accessKey.blur();

    window.setTimeout(() => {
      stableAppHeight =
        window.innerHeight;

      setAppHeight();
      resetPagePosition();
    }, 400);
  }
);


function playSlotIntro() {
  const heroVisual =
    document.querySelector(".hero-visual");

  const heroArt =
    document.querySelector(".hero-art");

  if (!heroVisual || !heroArt) {
    return;
  }

  const reduceMotion =
    window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;

  if (reduceMotion) {
    heroVisual.classList.add(
      "slot-intro-finished"
    );
    return;
  }

  const start = () => {
    heroVisual.classList.remove(
      "slot-intro-finished"
    );

    heroVisual.classList.add(
      "slot-intro-running"
    );

    window.setTimeout(() => {
      heroVisual.classList.remove(
        "slot-intro-running"
      );

      heroVisual.classList.add(
        "slot-intro-finished"
      );
    }, 1450);
  };

  if (heroArt.complete) {
    window.requestAnimationFrame(start);
    return;
  }

  heroArt.addEventListener(
    "load",
    () => {
      window.requestAnimationFrame(start);
    },
    {
      once: true,
    }
  );
}

playSlotIntro();
preventPageZoom();
configureSupport();
setAppHeight();
resetPagePosition();

authenticateTelegramUser()
  .catch((error) => {
    if (
      error?.data?.code ===
      "TELEGRAM_REQUIRED"
    ) {
      showSystemMessage(
        "Apri l’app tramite Telegram"
      );

      return;
    }

    showSystemMessage(
      getApiErrorMessage(error)
    );
  });

window.requestAnimationFrame(() => {
  window.requestAnimationFrame(() => {
    document.body.classList.add(
      "page-loaded"
    );
  });
});
