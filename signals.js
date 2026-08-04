"use strict";

const ACCESS_STORAGE_KEY = "arbifyAccess";
const FEED_STORAGE_KEY = "arbifyDemoLiveFeedV1";
const COUNTERS_STORAGE_KEY = "arbifyDemoLiveCountersV1";

const INITIAL_SIGNAL_COUNT = 24;
const MAX_SIGNAL_COUNT = 60;
const NEW_SIGNAL_MIN_DELAY = 5000;
const NEW_SIGNAL_MAX_DELAY = 7000;
const ACTIVE_MIN_DURATION = 26000;
const ACTIVE_MAX_DURATION = 44000;
const FEED_MAX_AGE = 24 * 60 * 60 * 1000;

const slots = [
  {
    name: "Thunder Crown",
    image: "assets/mythic-thunder.webp",
    bets: [10, 15, 20, 25, 30, 40, 50],
    spins: [7, 8, 10, 12, 15],
    multipliers: [4, 6, 8, 10, 14, 18, 24],
  },
  {
    name: "Candy Spiral",
    image: "assets/candy-spiral.webp",
    bets: [10, 15, 20, 25, 30, 40],
    spins: [8, 10, 12, 15, 18],
    multipliers: [3, 5, 7, 9, 12, 16, 21],
  },
  {
    name: "Gem Rocket",
    image: "assets/gem-rocket.webp",
    bets: [15, 20, 25, 30, 40, 50, 75],
    spins: [7, 9, 11, 12, 14],
    multipliers: [4, 6, 9, 11, 15, 20, 26],
  },
];

const userPrefixes = [
  "AX",
  "KP",
  "PL",
  "NX",
  "VR",
  "SK",
  "TM",
  "RL",
  "QZ",
  "DV",
  "MR",
  "LK",
  "PX",
  "TR",
  "SV",
  "ZK",
];

const signalFeed =
  document.querySelector("#signalFeed");

const signalCardTemplate =
  document.querySelector("#signalCardTemplate");

const emptyFeed =
  document.querySelector("#emptyFeed");

const filterButtons =
  document.querySelectorAll(".filter-button");

const navigationItems =
  document.querySelectorAll(".nav-item");

const nextSignalTimer =
  document.querySelector("#nextSignalTimer");

const newSignalBanner =
  document.querySelector("#newSignalBanner");

const newSignalBannerText =
  document.querySelector("#newSignalBannerText");

const toast =
  document.querySelector("#toast");

const toastText =
  document.querySelector("#toastText");

const activeSignalsCount =
  document.querySelector("#activeSignalsCount");

const wonSignalsCount =
  document.querySelector("#wonSignalsCount");

const totalSignalsCount =
  document.querySelector("#totalSignalsCount");

const allFilterCount =
  document.querySelector("#allFilterCount");

const activeFilterCount =
  document.querySelector("#activeFilterCount");

const wonFilterCount =
  document.querySelector("#wonFilterCount");

const lostFilterCount =
  document.querySelector("#lostFilterCount");

let signals = [];
let activeFilter = "all";
let nextSignalAt = 0;
let updateTimer;
let countdownTimer;
let toastTimer;
let bannerTimer;

const cardElements = new Map();

async function recordLiveViewActivity() {
  const api = window.ARBIFY_API;

  if (!api?.isTelegramMiniApp?.()) {
    return;
  }

  try {
    const user = await api.ready;

    if (!user?.accessGranted) {
      return;
    }

    await api.recordActivity(
      "live-viewed"
    );
  } catch (error) {
    console.error(
      "LIVE activity save error:",
      error.message
    );
  }
}

let liveCounters = {
  totalCreated: 0,
  totalWon: 0,
};

function randomNumber(min, max) {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

function randomItem(items) {
  return items[
    randomNumber(0, items.length - 1)
  ];
}

function createToken(length = 4) {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let token = "";

  for (
    let index = 0;
    index < length;
    index += 1
  ) {
    token += alphabet[
      randomNumber(
        0,
        alphabet.length - 1
      )
    ];
  }

  return token;
}

function createIdentifier() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return (
    `${Date.now()}-` +
    Math.random()
      .toString(16)
      .slice(2)
  );
}

function formatAmount(
  amount,
  includeSign = false
) {
  const absoluteAmount =
    Math.abs(
      Math.round(amount)
    );

  const formattedAmount =
    new Intl.NumberFormat(
      "uk-UA",
      {
        maximumFractionDigits: 0,
      }
    ).format(absoluteAmount);

  if (!includeSign) {
    return `₴${formattedAmount}`;
  }

  return amount >= 0
    ? `+₴${formattedAmount}`
    : `−₴${formattedAmount}`;
}

function formatRelativeTime(
  timestamp
) {
  const difference =
    Math.max(
      0,
      Date.now() - timestamp
    );

  const seconds =
    Math.floor(
      difference / 1000
    );

  if (seconds < 8) {
    return "щойно";
  }

  if (seconds < 60) {
    return `${seconds} с тому`;
  }

  const minutes =
    Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} хв тому`;
  }

  const hours =
    Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} год тому`;
  }

  return "сьогодні";
}

function getSignalProgress(
  signal,
  currentTime = Date.now()
) {
  if (signal.status !== "active") {
    return 100;
  }

  const duration =
    Math.max(
      1,
      signal.resolveAt -
        signal.createdAt
    );

  const elapsed =
    Math.max(
      0,
      currentTime -
        signal.createdAt
    );

  const progress =
    Math.floor(
      (elapsed / duration) * 100
    );

  return Math.min(
    99,
    Math.max(3, progress)
  );
}

function createUser() {
  const prefix =
    randomItem(userPrefixes);

  const suffix =
    randomNumber(100, 999);

  const shortCode =
    `${prefix}${String(suffix).slice(-2)}`;

  return {
    name:
      `USER • ${prefix}${suffix}`,
    avatar: shortCode,
  };
}

function createSignal(options = {}) {
  const currentTime = Date.now();
  const slot = randomItem(slots);
  const user = createUser();
  const bet = randomItem(slot.bets);
  const spins = randomItem(slot.spins);

  const duration =
    randomNumber(
      ACTIVE_MIN_DURATION,
      ACTIVE_MAX_DURATION
    );

  const createdAt =
    options.createdAt ??
    currentTime;

  const finalStatus =
    Math.random() < 0.67
      ? "won"
      : "lost";

  const multiplier =
    randomItem(slot.multipliers);

  const resultAmount =
    finalStatus === "won"
      ? bet * multiplier
      : -bet;

  const resolveAt =
    createdAt + duration;

  return {
    id: createIdentifier(),
    signalCode:
      `PLS-${createToken(5)}`,
    userName: user.name,
    avatar: user.avatar,
    slotName: slot.name,
    slotImage: slot.image,
    bet,
    spins,
    status:
      options.status ??
      "active",
    finalStatus,
    resultAmount,
    createdAt,
    resolveAt,
    resolvedAt:
      options.resolvedAt ??
      null,
  };
}

function createInitialSignals() {
  const currentTime =
    Date.now();

  const initialSignals = [];

  for (
    let index = 0;
    index < INITIAL_SIGNAL_COUNT;
    index += 1
  ) {
    if (index < 7) {
      const age =
        randomNumber(
          1000,
          19000
        );

      const signal =
        createSignal({
          createdAt:
            currentTime - age,
          status: "active",
        });

      signal.resolveAt =
        currentTime +
        randomNumber(
          9000,
          ACTIVE_MAX_DURATION -
            4000
        );

      initialSignals.push(
        signal
      );

      continue;
    }

    const minutesAgo =
      randomNumber(
        index + 1,
        index * 4 + 15
      );

    const createdAt =
      currentTime -
      minutesAgo *
        60 *
        1000;

    const signal =
      createSignal({
        createdAt,
      });

    signal.status =
      signal.finalStatus;

    signal.resolvedAt =
      signal.resolveAt;

    initialSignals.push(
      signal
    );
  }

  return initialSignals.sort(
    (first, second) => {
      return (
        second.createdAt -
        first.createdAt
      );
    }
  );
}

function isStoredSignalValid(
  signal
) {
  return Boolean(
    signal &&
      typeof signal.id ===
        "string" &&
      typeof signal.slotName ===
        "string" &&
      typeof signal.slotImage ===
        "string" &&
      typeof signal.createdAt ===
        "number" &&
      typeof signal.resolveAt ===
        "number" &&
      [
        "active",
        "won",
        "lost",
      ].includes(signal.status)
  );
}

function loadStoredSignals() {
  try {
    const storedValue =
      sessionStorage.getItem(
        FEED_STORAGE_KEY
      );

    if (!storedValue) {
      return [];
    }

    const parsedSignals =
      JSON.parse(storedValue);

    if (
      !Array.isArray(
        parsedSignals
      )
    ) {
      return [];
    }

    const oldestAllowedTimestamp =
      Date.now() -
      FEED_MAX_AGE;

    return parsedSignals
      .filter(
        isStoredSignalValid
      )
      .filter((signal) => {
        return (
          signal.createdAt >=
          oldestAllowedTimestamp
        );
      })
      .slice(
        0,
        MAX_SIGNAL_COUNT
      );
  } catch {
    return [];
  }
}

function saveSignals() {
  try {
    sessionStorage.setItem(
      FEED_STORAGE_KEY,
      JSON.stringify(
        signals.slice(
          0,
          MAX_SIGNAL_COUNT
        )
      )
    );
  } catch {
    /*
     * Якщо сховище браузера недоступне,
     * стрічка продовжить працювати.
     */
  }
}

function loadCounters() {
  try {
    const storedValue =
      sessionStorage.getItem(
        COUNTERS_STORAGE_KEY
      );

    if (!storedValue) {
      return;
    }

    const parsedCounters =
      JSON.parse(storedValue);

    if (
      Number.isFinite(
        parsedCounters.totalCreated
      ) &&
      Number.isFinite(
        parsedCounters.totalWon
      )
    ) {
      liveCounters = {
        totalCreated:
          parsedCounters.totalCreated,

        totalWon:
          parsedCounters.totalWon,
      };
    }
  } catch {
    liveCounters = {
      totalCreated: 0,
      totalWon: 0,
    };
  }
}

function saveCounters() {
  try {
    sessionStorage.setItem(
      COUNTERS_STORAGE_KEY,
      JSON.stringify(
        liveCounters
      )
    );
  } catch {
    /*
     * Лічильники продовжать працювати
     * без збереження.
     */
  }
}

function getCardElement(
  signalId
) {
  return (
    cardElements.get(
      signalId
    ) ?? null
  );
}

function setStatusLabel(
  element,
  status
) {
  const labels = {
    active: "АКТИВНИЙ",
    won: "ВИГРАШ",
    lost: "НЕ ЗАЙШОВ",
  };

  element.innerHTML = `
    <span aria-hidden="true"></span>
    ${labels[status]}
  `;
}

function fillCardStaticData(
  card,
  signal
) {
  card.dataset.signalId =
    signal.id;

  card.querySelector(
    "[data-avatar]"
  ).textContent =
    signal.avatar;

  card.querySelector(
    "[data-user]"
  ).textContent =
    signal.userName;

  const slotImage =
    card.querySelector(
      "[data-slot-image]"
    );

  slotImage.src =
    signal.slotImage;

  slotImage.alt =
    signal.slotName;

  card.querySelector(
    "[data-slot-name]"
  ).textContent =
    signal.slotName;

  card.querySelector(
    "[data-signal-id]"
  ).textContent =
    signal.signalCode;

  card.querySelector(
    "[data-bet]"
  ).textContent =
    formatAmount(
      signal.bet
    );

  card.querySelector(
    "[data-spins]"
  ).textContent =
    String(signal.spins);
}

function updateCard(signal) {
  const card =
    getCardElement(
      signal.id
    );

  if (!card) {
    return;
  }

  const statusLabel =
    card.querySelector(
      "[data-status-label]"
    );

  const result =
    card.querySelector(
      "[data-result]"
    );

  const progressWrap =
    card.querySelector(
      "[data-progress-wrap]"
    );

  const progressLabel =
    card.querySelector(
      "[data-progress-label]"
    );

  const progressPercent =
    card.querySelector(
      "[data-progress-percent]"
    );

  const progressBar =
    card.querySelector(
      "[data-progress-bar]"
    );

  const outcome =
    card.querySelector(
      "[data-outcome]"
    );

  const outcomeIcon =
    card.querySelector(
      "[data-outcome-icon]"
    );

  const outcomeLabel =
    card.querySelector(
      "[data-outcome-label]"
    );

  const outcomeValue =
    card.querySelector(
      "[data-outcome-value]"
    );

  const time =
    card.querySelector(
      "[data-time]"
    );

  card.dataset.status =
    signal.status;

  time.textContent =
    formatRelativeTime(
      signal.createdAt
    );

  time.dateTime =
    new Date(
      signal.createdAt
    ).toISOString();

  setStatusLabel(
    statusLabel,
    signal.status
  );

  if (
    signal.status ===
    "active"
  ) {
    const progress =
      getSignalProgress(
        signal
      );

    result.textContent =
      "ОЧІКУЄМО";

    progressWrap.hidden =
      false;

    outcome.hidden = true;

    progressLabel.textContent =
      progress < 70
        ? "Сигнал виконується"
        : "Завершення сигналу";

    progressPercent.textContent =
      `${progress}%`;

    progressBar.style.width =
      `${progress}%`;

    return;
  }

  const didWin =
    signal.status ===
    "won";

  result.textContent =
    formatAmount(
      signal.resultAmount,
      true
    );

  progressWrap.hidden = true;
  outcome.hidden = false;

  outcomeIcon.textContent =
    didWin ? "✓" : "×";

  outcomeLabel.textContent =
    didWin
      ? "СИГНАЛ УСПІШНО ЗАЙШОВ"
      : "СИГНАЛ НЕ ЗАЙШОВ";

  outcomeValue.textContent =
    didWin
      ? `Виграш ${formatAmount(
          signal.resultAmount,
          true
        )}`
      : `Результат ${formatAmount(
          signal.resultAmount,
          true
        )}`;
}

function createCardElement(
  signal,
  shouldAnimate = false
) {
  const fragment =
    signalCardTemplate
      .content
      .cloneNode(true);

  const card =
    fragment.querySelector(
      ".live-signal-card"
    );

  fillCardStaticData(
    card,
    signal
  );

  cardElements.set(
    signal.id,
    card
  );

  if (shouldAnimate) {
    card.classList.add(
      "is-new"
    );

    window.setTimeout(() => {
      card.classList.remove(
        "is-new"
      );
    }, 700);
  }

  return {
    fragment,
    card,
  };
}

function renderInitialFeed() {
  signalFeed.replaceChildren();
  cardElements.clear();

  const feedFragment =
    document.createDocumentFragment();

  signals.forEach(
    (signal) => {
      const { fragment } =
        createCardElement(
          signal
        );

      feedFragment.appendChild(
        fragment
      );
    }
  );

  signalFeed.appendChild(
    feedFragment
  );

  signals.forEach(
    (signal) => {
      updateCard(signal);
    }
  );

  signalFeed.setAttribute(
    "aria-busy",
    "false"
  );
}

function addSignalCard(
  signal
) {
  const {
    fragment,
    card,
  } = createCardElement(
    signal,
    true
  );

  signalFeed.prepend(
    fragment
  );

  updateCard(signal);

  if (
    signals.length >
    MAX_SIGNAL_COUNT
  ) {
    const removedSignals =
      signals.splice(
        MAX_SIGNAL_COUNT
      );

    removedSignals.forEach(
      (removedSignal) => {
        const removedCard =
          getCardElement(
            removedSignal.id
          );

        removedCard?.remove();

        cardElements.delete(
          removedSignal.id
        );
      }
    );
  }

  applyFilter();

  return card;
}

function getSignalCounts() {
  return signals.reduce(
    (counts, signal) => {
      counts.all += 1;
      counts[signal.status] += 1;

      return counts;
    },
    {
      all: 0,
      active: 0,
      won: 0,
      lost: 0,
    }
  );
}

function updateStatistics() {
  const counts =
    getSignalCounts();

  activeSignalsCount.textContent =
    String(counts.active);

  wonSignalsCount.textContent =
    String(
      82 +
      liveCounters.totalWon
    );

  totalSignalsCount.textContent =
    String(
      137 +
      liveCounters.totalCreated
    );

  allFilterCount.textContent =
    String(counts.all);

  activeFilterCount.textContent =
    String(counts.active);

  wonFilterCount.textContent =
    String(counts.won);

  lostFilterCount.textContent =
    String(counts.lost);
}

function applyFilter() {
  let visibleCardCount = 0;

  signals.forEach(
    (signal) => {
      const card =
        getCardElement(
          signal.id
        );

      if (!card) {
        return;
      }

      const shouldShow =
        activeFilter ===
          "all" ||
        signal.status ===
          activeFilter;

      card.classList.toggle(
        "is-filtered-out",
        !shouldShow
      );

      if (shouldShow) {
        visibleCardCount += 1;
      }
    }
  );

  emptyFeed.hidden =
    visibleCardCount !== 0;
}

function showToast(message) {
  window.clearTimeout(
    toastTimer
  );

  toastText.textContent =
    message;

  toast.classList.add(
    "is-visible"
  );

  toastTimer =
    window.setTimeout(() => {
      toast.classList.remove(
        "is-visible"
      );
    }, 2200);
}

function showNewSignalBanner(
  signal
) {
  window.clearTimeout(
    bannerTimer
  );

  newSignalBannerText.textContent =
    `${signal.userName} · ${signal.slotName}`;

  newSignalBanner.hidden =
    false;

  window.requestAnimationFrame(
    () => {
      newSignalBanner.classList.add(
        "is-visible"
      );
    }
  );

  bannerTimer =
    window.setTimeout(() => {
      newSignalBanner.classList.remove(
        "is-visible"
      );

      window.setTimeout(() => {
        if (
          !newSignalBanner
            .classList
            .contains(
              "is-visible"
            )
        ) {
          newSignalBanner.hidden =
            true;
        }
      }, 260);
    }, 1800);
}

function resolveSignal(
  signal,
  shouldCountResult = true
) {
  if (
    signal.status !==
    "active"
  ) {
    return false;
  }

  signal.status =
    signal.finalStatus;

  signal.resolvedAt =
    Date.now();

  if (
    shouldCountResult &&
    signal.status === "won"
  ) {
    liveCounters.totalWon += 1;
    saveCounters();
  }

  updateCard(signal);

  return true;
}

function updateActiveSignals() {
  const currentTime =
    Date.now();

  let didResolveSignal =
    false;

  signals.forEach(
    (signal) => {
      if (
        signal.status ===
          "active" &&
        currentTime >=
          signal.resolveAt
      ) {
        didResolveSignal =
          resolveSignal(
            signal
          ) ||
          didResolveSignal;

        return;
      }

      updateCard(signal);
    }
  );

  if (didResolveSignal) {
    saveSignals();
    updateStatistics();
    applyFilter();
  }
}

function addNewLiveSignal() {
  const signal =
    createSignal();

  signals.unshift(signal);

  liveCounters.totalCreated += 1;

  addSignalCard(signal);
  updateStatistics();
  showNewSignalBanner(signal);
  saveSignals();
  saveCounters();
}

function getNextSignalDelay() {
  return randomNumber(
    NEW_SIGNAL_MIN_DELAY,
    NEW_SIGNAL_MAX_DELAY
  );
}

function scheduleNextSignal() {
  nextSignalAt =
    Date.now() +
    getNextSignalDelay();

  updateCountdown();
}

function updateCountdown() {
  const remainingMilliseconds =
    Math.max(
      0,
      nextSignalAt -
        Date.now()
    );

  const remainingSeconds =
    Math.max(
      0,
      Math.ceil(
        remainingMilliseconds /
          1000
      )
    );

  nextSignalTimer.textContent =
    remainingSeconds === 1
      ? "через 1 секунду"
      : `через ${remainingSeconds} секунд`;

  if (
    remainingMilliseconds > 0
  ) {
    return;
  }

  addNewLiveSignal();
  scheduleNextSignal();
}

function setAppHeight() {
  const viewportHeight =
    window.visualViewport
      ?.height ||
    window.innerHeight;

  document.documentElement
    .style
    .setProperty(
      "--app-height",
      `${viewportHeight}px`
    );
}

function prepareSignals() {
  loadCounters();

  signals =
    loadStoredSignals();

  if (signals.length < 10) {
    signals =
      createInitialSignals();

    saveSignals();
  }

  let didResolveStoredSignals =
    false;

  const currentTime =
    Date.now();

  signals.forEach(
    (signal) => {
      if (
        signal.status ===
          "active" &&
        currentTime >=
          signal.resolveAt
      ) {
        didResolveStoredSignals =
          resolveSignal(
            signal,
            false
          ) ||
          didResolveStoredSignals;
      }
    }
  );

  if (
    didResolveStoredSignals
  ) {
    saveSignals();
  }

  signals.sort(
    (first, second) => {
      return (
        second.createdAt -
        first.createdAt
      );
    }
  );
}

function configureFilters() {
  filterButtons.forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          activeFilter =
            button.dataset.filter;

          filterButtons.forEach(
            (filterButton) => {
              const isActive =
                filterButton ===
                button;

              filterButton
                .classList
                .toggle(
                  "is-active",
                  isActive
                );

              filterButton
                .setAttribute(
                  "aria-pressed",
                  String(isActive)
                );
            }
          );

          applyFilter();
        }
      );
    }
  );
}

function configureNavigation() {
  navigationItems.forEach(
    (item) => {
      const sectionName =
        item.dataset.section;

      const destination =
        item.getAttribute(
          "href"
        );

      /*
       * Якщо пункт має справжнє посилання,
       * дозволяємо браузеру відкрити сторінку.
       */
      if (
        destination &&
        destination !== "#"
      ) {
        return;
      }

      /*
       * Повідомлення показуємо лише для розділів,
       * які ще не мають окремої сторінки.
       */
      item.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          showToast(
            `Розділ «${sectionName}» готується`
          );
        }
      );
    }
  );
}

function configurePageActions() {
  document.addEventListener(
    "gesturestart",
    (event) => {
      event.preventDefault();
    },
    {
      passive: false,
    }
  );
}

function startTimers() {
  scheduleNextSignal();

  updateTimer =
    window.setInterval(
      updateActiveSignals,
      850
    );

  countdownTimer =
    window.setInterval(
      updateCountdown,
      250
    );
}

function stopTimers() {
  window.clearInterval(
    updateTimer
  );

  window.clearInterval(
    countdownTimer
  );

  window.clearTimeout(
    toastTimer
  );

  window.clearTimeout(
    bannerTimer
  );
}

function initializePage() {
  /*
   * Запам’ятовуємо, що користувач
   * дійсно відкрив LIVE-сигнали.
   */
  try {
    sessionStorage.setItem(
      "arbifyViewedLiveSignals",
      "true"
    );
  } catch {
    /*
     * Сторінка продовжить працювати,
     * навіть якщо сховище недоступне.
     */
  }

  void recordLiveViewActivity();

  setAppHeight();
  prepareSignals();
  renderInitialFeed();
  updateStatistics();
  applyFilter();
  configureFilters();
  configureNavigation();
  configurePageActions();
  startTimers();

  window.requestAnimationFrame(
    () => {
      document.body
        .classList
        .add(
          "page-ready"
        );
    }
  );
}

if (
  sessionStorage.getItem(
    ACCESS_STORAGE_KEY
  ) !== "granted"
) {
  window.location.replace(
    "index.html"
  );
} else {
  initializePage();
}

window.addEventListener(
  "resize",
  setAppHeight
);

window.visualViewport
  ?.addEventListener(
    "resize",
    setAppHeight
  );

document.addEventListener(
  "visibilitychange",
  () => {
    if (
      document.visibilityState !==
      "visible"
    ) {
      return;
    }

    updateActiveSignals();

    if (
      Date.now() >=
      nextSignalAt
    ) {
      scheduleNextSignal();
    }
  }
);

window.addEventListener(
  "beforeunload",
  () => {
    saveSignals();
    stopTimers();
  }
);
