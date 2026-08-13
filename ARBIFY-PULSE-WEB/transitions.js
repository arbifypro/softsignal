"use strict";

/*
 * =========================================================
 * ARBIFY PULSE — навігація з плавними переходами
 * =========================================================
 *
 * Скрипт працює лише з посиланнями нижнього меню.
 * Він не змінює розмітку, ширину або висоту сторінок.
 */

const PULSE_TRANSITION_STORAGE_KEY =
  "arbifyPulseTransitionPending";

const PULSE_TRANSITION_DELAY = 180;
const PULSE_ENTRY_DURATION = 420;
const PULSE_PENDING_LIFETIME = 4000;

let pulseNavigationStarted = false;
let pulseNavigationTimer;
let pulseEntryTimer;

/*
 * Перевіряємо підтримку нативних переходів
 * між окремими HTML-сторінками.
 */
function supportsNativePageTransitions() {
  return (
    "onpageswap" in window &&
    "onpagereveal" in window
  );
}

function readPendingTransition() {
  try {
    const storedValue = sessionStorage.getItem(
      PULSE_TRANSITION_STORAGE_KEY
    );

    if (!storedValue) {
      return null;
    }

    const transitionData =
      JSON.parse(storedValue);

    sessionStorage.removeItem(
      PULSE_TRANSITION_STORAGE_KEY
    );

    if (
      !transitionData ||
      typeof transitionData.createdAt !==
        "number"
    ) {
      return null;
    }

    const transitionAge =
      Date.now() - transitionData.createdAt;

    if (
      transitionAge < 0 ||
      transitionAge >
        PULSE_PENDING_LIFETIME
    ) {
      return null;
    }

    return transitionData;
  } catch {
    return null;
  }
}

function savePendingTransition(destination) {
  try {
    sessionStorage.setItem(
      PULSE_TRANSITION_STORAGE_KEY,
      JSON.stringify({
        destination,
        createdAt: Date.now(),
      })
    );
  } catch {
    /*
     * Навігація продовжить працювати,
     * навіть якщо сховище недоступне.
     */
  }
}

/*
 * Ця перевірка виконується ще до побудови сторінки.
 * Завдяки цьому запасна анімація входу не блимає.
 */
const pendingPulseTransition =
  readPendingTransition();

if (
  pendingPulseTransition &&
  !supportsNativePageTransitions()
) {
  document.documentElement.classList.add(
    "pulse-page-entering"
  );
}

function createTransitionLayer() {
  const existingLayer =
    document.querySelector(
      ".pulse-page-transition"
    );

  if (existingLayer) {
    return existingLayer;
  }

  const transitionLayer =
    document.createElement("div");

  transitionLayer.className =
    "pulse-page-transition";

  transitionLayer.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.appendChild(
    transitionLayer
  );

  return transitionLayer;
}

function resetTransitionState() {
  window.clearTimeout(
    pulseNavigationTimer
  );

  window.clearTimeout(pulseEntryTimer);

  pulseNavigationStarted = false;

  document.documentElement.classList.remove(
    "pulse-page-leaving",
    "pulse-page-entering"
  );

  document
    .querySelectorAll(
      ".nav-item.is-transitioning"
    )
    .forEach((item) => {
      item.classList.remove(
        "is-transitioning"
      );
    });
}

function finishEntryAnimation() {
  window.clearTimeout(pulseEntryTimer);

  pulseEntryTimer = window.setTimeout(
    () => {
      document.documentElement.classList.remove(
        "pulse-page-entering"
      );
    },
    PULSE_ENTRY_DURATION
  );
}

function isModifiedClick(event) {
  return (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

function getNavigationDestination(link) {
  const rawHref =
    link.getAttribute("href");

  if (
    !rawHref ||
    rawHref === "#" ||
    rawHref.startsWith("#")
  ) {
    return null;
  }

  let destination;

  try {
    destination = new URL(
      link.href,
      window.location.href
    );
  } catch {
    return null;
  }

  if (
    destination.origin !==
      window.location.origin ||
    (
      destination.protocol !== "http:" &&
      destination.protocol !== "https:"
    )
  ) {
    return null;
  }

  return destination;
}

function isCurrentPage(destination) {
  return (
    destination.pathname ===
      window.location.pathname &&
    destination.search ===
      window.location.search &&
    destination.hash ===
      window.location.hash
  );
}

function startPageNavigation(
  link,
  destination
) {
  if (pulseNavigationStarted) {
    return;
  }

  pulseNavigationStarted = true;

  createTransitionLayer();

  link.classList.add(
    "is-transitioning"
  );

  document.documentElement.classList.add(
    "pulse-page-leaving"
  );

  savePendingTransition(
    destination.href
  );

  pulseNavigationTimer =
    window.setTimeout(() => {
      window.location.assign(
        destination.href
      );
    }, PULSE_TRANSITION_DELAY);
}

function handleNavigationClick(event) {
  const clickedElement =
    event.target instanceof Element
      ? event.target
      : null;

  if (!clickedElement) {
    return;
  }

  const navigationLink =
    clickedElement.closest(
      ".bottom-nav a.nav-item[href]"
    );

  if (!navigationLink) {
    return;
  }

  if (
    isModifiedClick(event) ||
    navigationLink.hasAttribute(
      "download"
    ) ||
    (
      navigationLink.target &&
      navigationLink.target !== "_self"
    )
  ) {
    return;
  }

  const destination =
    getNavigationDestination(
      navigationLink
    );

  if (!destination) {
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();

  if (isCurrentPage(destination)) {
    return;
  }

  startPageNavigation(
    navigationLink,
    destination
  );
}

function initializePageTransitions() {
  createTransitionLayer();

  if (
    document.documentElement.classList.contains(
      "pulse-page-entering"
    )
  ) {
    finishEntryAnimation();
  }
}

/*
 * Capture-режим потрібен, щоб старі обробники
 * навігації на сторінках не запускалися паралельно.
 */
document.addEventListener(
  "click",
  handleNavigationClick,
  {
    capture: true,
  }
);

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializePageTransitions,
    {
      once: true,
    }
  );
} else {
  initializePageTransitions();
}

/*
 * Відновлюємо сторінку після повернення
 * системною кнопкою «Назад».
 */
window.addEventListener(
  "pageshow",
  (event) => {
    if (event.persisted) {
      resetTransitionState();
    }
  }
);

window.addEventListener(
  "pagehide",
  () => {
    window.clearTimeout(
      pulseNavigationTimer
    );

    window.clearTimeout(
      pulseEntryTimer
    );
  }
);
