"use strict";

(function initializeTelegramMiniApp() {
  const telegram =
    window.Telegram &&
    window.Telegram.WebApp;

  if (!telegram) {
    document.documentElement.classList.add(
      "regular-browser"
    );

    return;
  }

  const root =
    document.documentElement;

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
      telegram.initData || "",
    user:
      telegram.initDataUnsafe?.user ||
      null,
  };

  prepareTelegram();
})();
