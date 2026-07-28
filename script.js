"use strict";

/*
 * Вкажи username менеджера БЕЗ символу @.
 * Приклад: const TELEGRAM_USERNAME = "arbify_support";
 */
const TELEGRAM_USERNAME = "YOUR_USERNAME";

/*
 * Це поки демонстраційна перевірка інтерфейсу.
 * Справжню перевірку ключа пізніше підключимо через серверне API.
 */
const DEMO_VERIFY_DELAY = 1650;
const VALID_ACCESS_KEY = "K7X4Q9";
const HOME_PAGE = "home.html";

const app = document.querySelector(".signal-app");
const accessForm = document.querySelector("#accessForm");
const accessPanel = document.querySelector("#accessPanel");
const successPanel = document.querySelector("#successPanel");
const accessKey = document.querySelector("#accessKey");
const accessButton = document.querySelector("#accessButton");
const keyField = document.querySelector("#keyField");
const keyLength = document.querySelector("#keyLength");
const formMessage = document.querySelector("#formMessage");
const resetButton = document.querySelector("#resetButton");
const continueButton = document.querySelector("#continueButton");
const supportButton = document.querySelector("#supportButton");
const supportPopover = document.querySelector("#supportPopover");
const footer = document.querySelector("footer");

let verificationTimer;
let stableAppHeight = window.innerHeight;

function preventPageZoom() {
  const preventGesture = (event) => {
    event.preventDefault();
  };

  /*
   * Блокує масштабування двома пальцями в Safari на iPhone.
   */
  ["gesturestart", "gesturechange", "gestureend"].forEach((eventName) => {
    document.addEventListener(eventName, preventGesture, {
      passive: false,
    });
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
   * Блокує збільшення сторінки подвійним натисканням.
   */
  let lastTouchEnd = 0;

  document.addEventListener(
    "touchend",
    (event) => {
      const now = Date.now();

      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }

      lastTouchEnd = now;
    },
    {
      passive: false,
    }
  );

  /*
   * Блокує масштабування через Ctrl + колесо
   * або жест трекпада на комп’ютері.
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

function setAppHeight() {
  /*
   * Коли поле активне, клавіатура не повинна
   * змінювати зафіксовану висоту застосунку.
   */
  if (document.activeElement !== accessKey) {
    stableAppHeight = window.innerHeight;
  }

  document.documentElement.style.setProperty(
    "--app-height",
    `${stableAppHeight}px`
  );
}

function normalizeKey(value) {
  return value
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-ZА-ЯІЇЄҐ0-9-]/g, "")
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
    <span class="button-label">УВІЙТИ</span>
  `;
}

function showKeyError(message) {
  keyField.classList.remove("has-error");

  void keyField.offsetWidth;

  keyField.classList.add("has-error");
  formMessage.textContent = message;

  accessKey.focus({
    preventScroll: true,
  });

  resetPagePosition();
}

function startVerification() {
  clearMessage();

  keyField.classList.add("is-validating");
  app.classList.add("is-checking");

  accessButton.disabled = true;

  accessButton.innerHTML = `
    <span class="button-loader"></span>
    <span>ПЕРЕВІРЯЄМО КЛЮЧ</span>
  `;
}

function finishVerification() {
  keyField.classList.remove("is-validating");
  app.classList.remove("is-checking");
  app.classList.add("is-success");

  accessPanel.hidden = true;
  successPanel.hidden = false;

  /*
   * Автоматичного переходу тут більше немає.
   * Перехід виконається лише після натискання кнопки.
   */
}

function verifyAccessKey(key) {
  return new Promise((resolve) => {
    verificationTimer = window.setTimeout(() => {
      resolve({
        valid: key === VALID_ACCESS_KEY,
      });
    }, DEMO_VERIFY_DELAY);
  });
}

function configureSupport() {
  const usernameConfigured =
    TELEGRAM_USERNAME &&
    TELEGRAM_USERNAME !== "YOUR_USERNAME";

  const telegramUrl = usernameConfigured
    ? `https://t.me/${TELEGRAM_USERNAME.replace("@", "")}`
    : "#";

  supportPopover.innerHTML = `
    <p>
      Не можеш увійти? Напиши менеджеру — він допоможе отримати
      або відновити ключ.
    </p>

    <a
      class="telegram-button"
      id="telegramSupportLink"
      href="${telegramUrl}"
      target="_blank"
      rel="noopener noreferrer"
    >
      НАПИСАТИ В TELEGRAM
    </a>
  `;

  const telegramSupportLink = document.querySelector(
    "#telegramSupportLink"
  );

  if (!usernameConfigured) {
    telegramSupportLink.addEventListener("click", (event) => {
      event.preventDefault();

      supportPopover.querySelector("p").textContent =
        "Спочатку вкажи username менеджера у файлі script.js.";
    });
  }
}

function addResponsibleNotice() {
  const notice = document.createElement("p");

  notice.className = "responsible-note";
  notice.textContent = "18+ · Грай відповідально";

  footer.appendChild(notice);
}

accessKey.addEventListener("input", () => {
  const normalizedValue = normalizeKey(accessKey.value);

  if (accessKey.value !== normalizedValue) {
    accessKey.value = normalizedValue;
  }

  const length = normalizedValue.length;

  keyLength.textContent = length
    ? `${length}/32`
    : "";

  keyField.classList.toggle(
    "has-value",
    length > 0
  );

  clearMessage();
});

/*
 * Не прокручуємо сторінку до поля.
 * Після відкриття клавіатури повертаємо сторінку на початок.
 */
accessKey.addEventListener("focus", () => {
  resetPagePosition();

  window.setTimeout(
    resetPagePosition,
    80
  );

  window.setTimeout(
    resetPagePosition,
    350
  );
});

accessKey.addEventListener("blur", () => {
  window.setTimeout(() => {
    resetPagePosition();
    setAppHeight();
  }, 400);
});

accessForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const key = normalizeKey(accessKey.value);

  accessKey.value = key;

  if (key.length !== 6) {
    showKeyError(
      "Ключ має складатися з 6 символів"
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

 const result = await verifyAccessKey(key);

  if (result.valid) {
    finishVerification();
    return;
  }

  app.classList.remove("is-checking");

  keyField.classList.remove(
    "is-validating"
  );

  restoreAccessButton();

  showKeyError(
    "Цей ключ не знайдено або його термін дії завершився"
  );
});

resetButton.addEventListener("click", () => {
  window.clearTimeout(verificationTimer);

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
});

continueButton.addEventListener("click", () => {
  sessionStorage.setItem(
    "arbifyAccess",
    "granted"
  );

  window.location.href = HOME_PAGE;
});

supportButton.addEventListener("click", () => {
  const willOpen = supportPopover.hidden;

  supportPopover.hidden = !willOpen;

  supportButton.setAttribute(
    "aria-expanded",
    String(willOpen)
  );
});

/*
 * Не дозволяємо браузеру зрушувати документ.
 */
window.addEventListener(
  "scroll",
  resetPagePosition,
  {
    passive: true,
  }
);

window.addEventListener("resize", () => {
  setAppHeight();
  resetPagePosition();
});

window.addEventListener("orientationchange", () => {
  accessKey.blur();

  window.setTimeout(() => {
    stableAppHeight = window.innerHeight;
    setAppHeight();
    resetPagePosition();
  }, 400);
});

preventPageZoom();
configureSupport();
addResponsibleNotice();
setAppHeight();
resetPagePosition();

window.requestAnimationFrame(() => {
  window.requestAnimationFrame(() => {
    document.body.classList.add(
      "page-loaded"
    );
  });
});
