"use strict";

const SCAN_DURATION = 4600;
const RESULT_REVEAL_DELAY = 420;
const SUBID_VERIFY_DELAY = 1200;
const SUBID_SUCCESS_DELAY = 850;
const SUBID_STORAGE_KEY = "arbifyVerifiedSubId";
const FAVORITE_SLOTS_STORAGE_KEY = "arbifyFavoriteSlots";
const ACTIVE_SIGNAL_TIMER_STORAGE_KEY = "arbifyActiveSignalTimer";
const RISK_PROFILE_STORAGE_KEY = "arbifyRiskProfile";
const ONBOARDING_STORAGE_KEY = "arbifyOnboardingSeen";
const PROFILE_ONBOARDING_REQUEST_KEY = "arbifyOpenOnboardingFromProfile";

const slotGrid = document.querySelector(".slot-grid");
const signalButton = document.querySelector("#signalButton");
const notificationButton = document.querySelector("#notificationButton");
const allSlotsButton = document.querySelector("#allSlotsButton");
const allSlotsOverlay = document.querySelector("#allSlotsOverlay");
const allSlotsBackButton = document.querySelector("#allSlotsBackButton");
const allSlotsGrid = document.querySelector("#allSlotsGrid");
const allSlotsCount = document.querySelector("#allSlotsCount");
const allSlotsTitle = document.querySelector("#allSlotsTitle");
const allSlotsSearchInput = document.querySelector(
  "#allSlotsSearchInput"
);
const allSlotsSearchClear = document.querySelector(
  "#allSlotsSearchClear"
);
const allSlotsEmpty = document.querySelector(
  "#allSlotsEmpty"
);
const allSlotsEmptyTitle = document.querySelector(
  "#allSlotsEmptyTitle"
);
const allSlotsEmptyText = document.querySelector(
  "#allSlotsEmptyText"
);
const allSlotsCategories = document.querySelector(
  "#allSlotsCategories"
);
const favoriteSlotsCount = document.querySelector(
  "#favoriteSlotsCount"
);

const allSlotsFavoritesButton = document.querySelector(
  "#allSlotsFavoritesButton"
);
const navItems = document.querySelectorAll(".nav-item");
const toast = document.querySelector("#toast");
const toastText = document.querySelector("#toastText");

const subIdModal = document.querySelector("#subIdModal");

const subIdModalBackdrop = document.querySelector(
  ".subid-modal-backdrop"
);

const subIdDialog = document.querySelector(".subid-dialog");

const subIdCloseButton = document.querySelector(
  "#subIdCloseButton"
);

const subIdFormView = document.querySelector("#subIdFormView");

const subIdSuccessView = document.querySelector(
  "#subIdSuccessView"
);

const subIdForm = document.querySelector("#subIdForm");
const subIdField = document.querySelector("#subIdField");
const subIdInput = document.querySelector("#subIdInput");
const subIdMessage = document.querySelector("#subIdMessage");

const subIdVerifyButton = document.querySelector(
  "#subIdVerifyButton"
);

const subIdVerifyText = document.querySelector(
  "#subIdVerifyText"
);

const signalOverlay = document.querySelector("#signalOverlay");
const signalOverlayTitle = document.querySelector("#signalOverlayTitle");
const signalBackButton = document.querySelector("#signalBackButton");
const scanView = document.querySelector("#scanView");
const resultView = document.querySelector("#resultView");
const scanSlotImage = document.querySelector("#scanSlotImage");
const scanSlotName = document.querySelector("#scanSlotName");
const scanStatus = document.querySelector("#scanStatus");
const scanPercent = document.querySelector("#scanPercent");
const scanProgress = document.querySelector("#scanProgress");
const resultSlotImage = document.querySelector("#resultSlotImage");
const resultSlotName = document.querySelector("#resultSlotName");
const resultBet = document.querySelector("#resultBet");
const resultSpins = document.querySelector("#resultSpins");
const resultRisk = document.querySelector("#resultRisk");
const resultDuration = document.querySelector("#resultDuration");
const resultActionButton = document.querySelector("#resultActionButton");
const resultNewButton = document.querySelector("#resultNewButton");

const activeSignalTimer = document.querySelector(
  "#activeSignalTimer"
);
const activeSignalTimerStatus = document.querySelector(
  "#activeSignalTimerStatus"
);
const activeSignalTimerSlot = document.querySelector(
  "#activeSignalTimerSlot"
);
const activeSignalTimerValue = document.querySelector(
  "#activeSignalTimerValue"
);
const activeSignalTimerProgress = document.querySelector(
  "#activeSignalTimerProgress"
);
const activeSignalTimerHint = document.querySelector(
  "#activeSignalTimerHint"
);

const activeSignalNotice = document.querySelector(
  "#activeSignalNotice"
);
const activeSignalNoticeBackdrop = document.querySelector(
  "#activeSignalNoticeBackdrop"
);
const activeSignalNoticeButton = document.querySelector(
  "#activeSignalNoticeButton"
);
const activeSignalNoticeTime = document.querySelector(
  "#activeSignalNoticeTime"
);

const riskProfile = document.querySelector(
  "#riskProfile"
);

const riskProfileOptions = document.querySelectorAll(
  ".risk-profile-option"
);

const pulseOnboarding = document.querySelector(
  "#pulseOnboarding"
);

const pulseOnboardingSkip = document.querySelector(
  "#pulseOnboardingSkip"
);

const pulseOnboardingNext = document.querySelector(
  "#pulseOnboardingNext"
);

const lastSignalChip = document.querySelector(
  "#lastSignalChip"
);

const lastSignalChipLabel =
  lastSignalChip?.querySelector("span");

const lastSignalFloat = document.querySelector(
  "#lastSignalFloat"
);

const lastSignalImage = document.querySelector(
  "#lastSignalImage"
);

const lastSignalName = document.querySelector(
  "#lastSignalName"
);

const lastSignalBet = document.querySelector(
  "#lastSignalBet"
);

const lastSignalSpins = document.querySelector(
  "#lastSignalSpins"
);

const lastSignalRisk = document.querySelector(
  "#lastSignalRisk"
);

const lastSignalTime = document.querySelector(
  "#lastSignalTime"
);

const signalProfileTemplates = {
  balanced: {
    bets: [10, 20, 25, 30],
    spins: [8, 10, 12, 15],
    risks: ["НИЗЬКИЙ", "СЕРЕДНІЙ"],
    durations: ["02:30", "03:00", "03:30"],
  },

  dynamic: {
    bets: [10, 15, 20, 25],
    spins: [10, 12, 15, 18],
    risks: ["СЕРЕДНІЙ", "ВИСОКИЙ"],
    durations: ["02:45", "03:00", "04:00"],
  },

  focused: {
    bets: [15, 20, 30, 40],
    spins: [7, 9, 11, 14],
    risks: ["НИЗЬКИЙ", "СЕРЕДНІЙ"],
    durations: ["02:00", "02:30", "03:00"],
  },
};

/*
 * Популярні реальні слоти.
 * Нові обкладинки можна поступово додавати в assets/slots.
 * Поки конкретного файла немає, автоматично показується
 * одна з наявних обкладинок без помилки на сторінці.
 */
const slotCatalog = [
  {
    name: "Gates of Olympus",
    image: "assets/slots/gates-of-olympus.webp",
    fallbackImage: "assets/mythic-thunder.webp",
    accent: "#8d4cff",
    profile: "balanced",
  },
  {
    name: "Sweet Bonanza",
    image: "assets/slots/sweet-bonanza.webp",
    fallbackImage: "assets/candy-spiral.webp",
    accent: "#ff4ecb",
    profile: "dynamic",
  },
  {
    name: "The Dog House Megaways",
    image: "assets/slots/the-dog-house-megaways.webp",
    fallbackImage: "assets/candy-spiral.webp",
    accent: "#ffb347",
    profile: "dynamic",
  },
  {
    name: "Big Bass Bonanza",
    image: "assets/slots/big-bass-bonanza.webp",
    fallbackImage: "assets/gem-rocket.webp",
    accent: "#21d4ff",
    profile: "focused",
  },
  {
    name: "Book of Dead",
    image: "assets/slots/book-of-dead.webp",
    fallbackImage: "assets/mythic-thunder.webp",
    accent: "#d7b950",
    profile: "balanced",
  },
  {
    name: "Starlight Princess",
    image: "assets/slots/starlight-princess.webp",
    fallbackImage: "assets/candy-spiral.webp",
    accent: "#ca62ff",
    profile: "dynamic",
  },
  {
    name: "Sugar Rush",
    image: "assets/slots/sugar-rush.webp",
    fallbackImage: "assets/candy-spiral.webp",
    accent: "#ff5aa9",
    profile: "dynamic",
  },
  {
    name: "The Dog House Multihold",
    image: "assets/slots/the-dog-house-multihold.webp",
    fallbackImage: "assets/candy-spiral.webp",
    accent: "#ff9f43",
    profile: "focused",
  },
  {
    name: "Fruit Party",
    image: "assets/slots/fruit-party.webp",
    fallbackImage: "assets/candy-spiral.webp",
    accent: "#9cff57",
    profile: "dynamic",
  },
  {
    name: "Big Bass Splash",
    image: "assets/slots/big-bass-splash.webp",
    fallbackImage: "assets/gem-rocket.webp",
    accent: "#20c9ff",
    profile: "focused",
  },
  {
    name: "Starburst",
    image: "assets/slots/starburst.webp",
    fallbackImage: "assets/gem-rocket.webp",
    accent: "#9b6cff",
    profile: "balanced",
  },
  {
    name: "Gonzo's Quest",
    image: "assets/slots/gonzos-quest.webp",
    fallbackImage: "assets/mythic-thunder.webp",
    accent: "#4fd47c",
    profile: "balanced",
  },
  {
    name: "Fire Joker",
    image: "assets/slots/fire-joker.webp",
    fallbackImage: "assets/gem-rocket.webp",
    accent: "#ff5a3c",
    profile: "focused",
  },
  {
    name: "Wolf Gold",
    image: "assets/slots/wolf-gold.webp",
    fallbackImage: "assets/mythic-thunder.webp",
    accent: "#e9c46a",
    profile: "balanced",
  },
  {
    name: "Buffalo King Megaways",
    image: "assets/slots/buffalo-king-megaways.webp",
    fallbackImage: "assets/mythic-thunder.webp",
    accent: "#c78b52",
    profile: "dynamic",
  },
  {
    name: "Great Rhino Megaways",
    image: "assets/slots/great-rhino-megaways.webp",
    fallbackImage: "assets/mythic-thunder.webp",
    accent: "#8bc34a",
    profile: "balanced",
  },
  {
    name: "Madame Destiny Megaways",
    image: "assets/slots/madame-destiny-megaways.webp",
    fallbackImage: "assets/mythic-thunder.webp",
    accent: "#b95cff",
    profile: "dynamic",
  },
  {
    name: "Wanted Dead or a Wild",
    image: "assets/slots/wanted-dead-or-a-wild.webp",
    fallbackImage: "assets/mythic-thunder.webp",
    accent: "#ff7043",
    profile: "dynamic",
  },
  {
    name: "Money Train 3",
    image: "assets/slots/money-train-3.webp",
    fallbackImage: "assets/gem-rocket.webp",
    accent: "#b0bec5",
    profile: "focused",
  },
  {
    name: "Reactoonz",
    image: "assets/slots/reactoonz.webp",
    fallbackImage: "assets/gem-rocket.webp",
    accent: "#71e6ff",
    profile: "dynamic",
  },
  {
    name: "Legacy of Dead",
    image: "assets/slots/legacy-of-dead.webp",
    fallbackImage: "assets/mythic-thunder.webp",
    accent: "#d6ad60",
    profile: "balanced",
  },
  {
    name: "Dead or Alive 2",
    image: "assets/slots/dead-or-alive-2.webp",
    fallbackImage: "assets/mythic-thunder.webp",
    accent: "#c49a6c",
    profile: "focused",
  },
  {
    name: "Jammin' Jars",
    image: "assets/slots/jammin-jars.webp",
    fallbackImage: "assets/candy-spiral.webp",
    accent: "#ff4fcf",
    profile: "dynamic",
  },
  {
    name: "Immortal Romance",
    image: "assets/slots/immortal-romance.webp",
    fallbackImage: "assets/mythic-thunder.webp",
    accent: "#d64f8f",
    profile: "balanced",
  },
 ];

const popularSlotNames = new Set(
  slotCatalog.slice(0, 8).map((slot) => slot.name)
);

const newSlotNames = new Set([
  "The Dog House Multihold",
  "Wanted Dead or a Wild",
  "Money Train 3",
  "Reactoonz",
  "Jammin' Jars",
  "Immortal Romance",
]);

const categoryLabels = {
  all: "Усі слоти",
  popular: "Популярні слоти",
  new: "Нові слоти",
  megaways: "Megaways",
  favorites: "Обране",
};

let activeSlotCategory = "all";
let favoriteSlotNames = loadFavoriteSlots();

const signalProfiles = Object.fromEntries(
  slotCatalog.map((slot) => {
    return [
      slot.name,
      signalProfileTemplates[slot.profile],
    ];
  })
);

function createSlotCard(slot, index) {
  const card = document.createElement("div");
  const imageWrap = document.createElement("span");
  const image = document.createElement("img");
  const shine = document.createElement("span");
  const selectedCheck = document.createElement("span");
  const favoriteButton = document.createElement("button");
  const slotName = document.createElement("span");

  card.className = "slot-card";
  card.dataset.slot = slot.name;
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", `Обрати слот ${slot.name}`);
  card.style.setProperty(
    "--slot-accent",
    slot.accent
  );

  if (index === 0) {
    card.classList.add("is-selected");
  }

  imageWrap.className = "slot-image-wrap";
  image.src = slot.image;
  image.alt = slot.name;
  image.loading = index < 3 ? "eager" : "lazy";
  image.decoding = "async";
  image.draggable = false;

  image.addEventListener(
    "error",
    () => {
      if (
        image.dataset.fallbackApplied === "true"
      ) {
        return;
      }

      image.dataset.fallbackApplied = "true";
      image.src = slot.fallbackImage;
    },
    {
      once: true,
    }
  );

  shine.className = "slot-shine";
  selectedCheck.className = "selected-check";
  selectedCheck.setAttribute(
    "aria-hidden",
    "true"
  );
  selectedCheck.textContent = "✓";

  favoriteButton.className = "slot-favorite-button";
  favoriteButton.type = "button";
  favoriteButton.dataset.favoriteSlot = slot.name;
  favoriteButton.innerHTML = `
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M20.8 4.7c-2-2-5.2-2-7.2 0L12 6.3l-1.6-1.6c-2-2-5.2-2-7.2 0s-2 5.2 0 7.2L12 20.7l8.8-8.8c2-2 2-5.2 0-7.2Z"></path>
    </svg>
  `;

  updateFavoriteButton(
    favoriteButton,
    slot.name
  );

  favoriteButton.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleFavoriteSlot(slot.name);
    }
  );

  slotName.className = "slot-name";
  slotName.textContent = slot.name;

  imageWrap.append(
    image,
    shine,
    selectedCheck,
    favoriteButton
  );

  card.append(
    imageWrap,
    slotName
  );

  card.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        card.click();
      }
    }
  );

  return card;
}

function loadFavoriteSlots() {
  try {
    const storedValue = JSON.parse(
      localStorage.getItem(
        FAVORITE_SLOTS_STORAGE_KEY
      ) || "[]"
    );

    if (!Array.isArray(storedValue)) {
      return new Set();
    }

    return new Set(
      storedValue.filter((slotName) => {
        return slotCatalog.some((slot) => {
          return slot.name === slotName;
        });
      })
    );
  } catch {
    return new Set();
  }
}

function saveFavoriteSlots() {
  try {
    localStorage.setItem(
      FAVORITE_SLOTS_STORAGE_KEY,
      JSON.stringify([...favoriteSlotNames])
    );
  } catch {
    /* Обране працюватиме до перезавантаження. */
  }
}

function updateFavoriteButton(
  button,
  slotName
) {
  const isFavorite =
    favoriteSlotNames.has(slotName);

  button.classList.toggle(
    "is-favorite",
    isFavorite
  );

  button.setAttribute(
    "aria-pressed",
    String(isFavorite)
  );

  button.setAttribute(
    "aria-label",
    isFavorite
      ? `Видалити ${slotName} з обраного`
      : `Додати ${slotName} в обране`
  );
}

function updateFavoriteInterface() {
  document
    .querySelectorAll(
      ".slot-favorite-button"
    )
    .forEach((button) => {
      updateFavoriteButton(
        button,
        button.dataset.favoriteSlot
      );
    });

  if (favoriteSlotsCount) {
    favoriteSlotsCount.textContent =
      String(favoriteSlotNames.size);
  }

  if (allSlotsFavoritesButton) {
    const favoritesAreOpen =
      activeSlotCategory === "favorites";

    allSlotsFavoritesButton.classList.toggle(
      "is-active",
      favoritesAreOpen
    );

    allSlotsFavoritesButton.setAttribute(
      "aria-pressed",
      String(favoritesAreOpen)
    );

    allSlotsFavoritesButton.setAttribute(
      "aria-selected",
      String(favoritesAreOpen)
    );
  }
}

function toggleFavoriteSlot(slotName) {
  const isRemoving =
    favoriteSlotNames.has(slotName);

  if (isRemoving) {
    favoriteSlotNames.delete(slotName);
  } else {
    favoriteSlotNames.add(slotName);
  }

  saveFavoriteSlots();
  updateFavoriteInterface();

  /*
   * Синхронізуємо обране з профілем/сервером.
   * Завдання «Додати 3 слоти в обране» на сторінці Bonus
   * читає саме цей список у Telegram Mini App.
   */
  if (homeReady) {
    void persistStatePatch({
      favorites: [
        ...favoriteSlotNames,
      ],
    });
  }

  showToast(
    isRemoving
      ? `${slotName} видалено з обраного`
      : `${slotName} додано в обране`
  );

  if (
    activeSlotCategory === "favorites"
  ) {
    renderAllSlotsCatalog(
      allSlotsSearchInput?.value || ""
    );
  }
}

function slotMatchesCategory(
  slot,
  category
) {
  if (category === "popular") {
    return popularSlotNames.has(slot.name);
  }

  if (category === "new") {
    return newSlotNames.has(slot.name);
  }

  if (category === "megaways") {
    return slot.name
      .toLocaleLowerCase("uk-UA")
      .includes("megaways");
  }

  if (category === "favorites") {
    return favoriteSlotNames.has(slot.name);
  }

  return true;
}

function setActiveSlotCategory(category) {
  activeSlotCategory =
    categoryLabels[category]
      ? category
      : "all";

  allSlotsCategories
    ?.querySelectorAll(
      ".all-slots-category"
    )
    .forEach((button) => {
      const isActive =
        button.dataset.category ===
        activeSlotCategory;

      button.classList.toggle(
        "is-active",
        isActive
      );

      button.setAttribute(
        "aria-selected",
        String(isActive)
      );
    });

  if (allSlotsTitle) {
    allSlotsTitle.textContent =
      categoryLabels[activeSlotCategory];
  }

  renderAllSlotsCatalog(
    allSlotsSearchInput?.value || ""
  );

  updateFavoriteInterface();
}

function normalizeSlotSearch(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("uk-UA");
}

function renderAllSlotsCatalog(searchValue = "") {
  if (!allSlotsGrid) {
    return;
  }

  const normalizedSearch =
    normalizeSlotSearch(searchValue);

  const filteredSlots =
    slotCatalog.filter((slot) => {
      const matchesCategory =
        slotMatchesCategory(
          slot,
          activeSlotCategory
        );

      const matchesSearch =
        !normalizedSearch ||
        normalizeSlotSearch(
          slot.name
        ).includes(normalizedSearch);

      return (
        matchesCategory &&
        matchesSearch
      );
    });

  const fragment =
    document.createDocumentFragment();

  filteredSlots.forEach((slot) => {
    const card = createSlotCard(slot, -1);

    card.addEventListener(
      "click",
      async () => {
        if (!(await ensureHomeReady())) {
          return;
        }

        applySelectedSlot(slot.name);

        showToast(
          `${slot.name} обрано`
        );

        void persistStatePatch({
          selectedSlot: slot.name,
        });

        closeAllSlotsOverlay();
      }
    );

    fragment.appendChild(card);
  });

  allSlotsGrid.replaceChildren(fragment);

  if (allSlotsCount) {
    allSlotsCount.textContent =
      String(filteredSlots.length);
  }

  if (allSlotsEmpty) {
    allSlotsEmpty.hidden =
      filteredSlots.length > 0;
  }

  if (
    filteredSlots.length === 0 &&
    allSlotsEmptyTitle &&
    allSlotsEmptyText
  ) {
    if (
      activeSlotCategory ===
        "favorites" &&
      !normalizedSearch
    ) {
      allSlotsEmptyTitle.textContent =
        "Обраних слотів ще немає";
      allSlotsEmptyText.textContent =
        "Натисніть сердечко на слоті, щоб додати його сюди";
    } else {
      allSlotsEmptyTitle.textContent =
        "Нічого не знайдено";
      allSlotsEmptyText.textContent =
        "Спробуйте іншу назву або категорію";
    }
  }

  if (allSlotsSearchClear) {
    allSlotsSearchClear.hidden =
      normalizedSearch.length === 0;
  }

  applyAllSlotsSelection();
  updateFavoriteInterface();
}

function openAllSlotsOverlay() {
  if (!allSlotsOverlay) {
    return;
  }

  window.clearTimeout(toastTimer);
  toast.classList.remove("is-visible");

  if (allSlotsSearchInput) {
    allSlotsSearchInput.value = "";
  }

  setActiveSlotCategory("all");
  allSlotsOverlay.hidden = false;

  document.body.classList.add(
    "all-slots-open"
  );

  window.requestAnimationFrame(() => {
    allSlotsOverlay.classList.add(
      "is-open"
    );
  });
}

function closeAllSlotsOverlay() {
  if (!allSlotsOverlay) {
    return;
  }

  allSlotsOverlay.classList.remove(
    "is-open"
  );

  document.body.classList.remove(
    "all-slots-open"
  );

  window.setTimeout(() => {
    allSlotsOverlay.hidden = true;
  }, 220);
}

function applyAllSlotsSelection() {
  if (!allSlotsGrid) {
    return;
  }

  const selectedName =
    getSelectedSlot().name;

  allSlotsGrid
    .querySelectorAll(".slot-card")
    .forEach((card) => {
      card.classList.toggle(
        "is-selected",
        card.dataset.slot === selectedName
      );
    });
}

function renderSlotCatalog() {
  if (!slotGrid) {
    return;
  }

  const fragment =
    document.createDocumentFragment();

  slotCatalog.forEach((slot, index) => {
    fragment.appendChild(
      createSlotCard(slot, index)
    );
  });

  slotGrid.replaceChildren(fragment);
}

const scanStages = [
  {
    from: 0,
    message: "Підключення до аналітичного ядра",
  },
  {
    from: 18,
    message: "Отримання поточних параметрів слота",
  },
  {
    from: 38,
    message: "Аналіз останніх ігрових циклів",
  },
  {
    from: 61,
    message: "Розрахунок оптимальних параметрів",
  },
  {
    from: 82,
    message: "Перевірка результату системою Pulse",
  },
  {
    from: 96,
    message: "Формування готового сигналу",
  },
];

renderSlotCatalog();
renderAllSlotsCatalog();
updateFavoriteInterface();

const slotCards =
  slotGrid.querySelectorAll(".slot-card");

let toastTimer;
let subIdVerifyTimer;
let subIdSuccessTimer;
let subIdCloseTimer;
let scanFrame;
let resultRevealTimer;
let selectedSlot = getSelectedSlot();
let activeSignal = null;
let homeReady = false;
let homeState = {};
let homeInitializationPromise = null;
let stateSaveQueue = Promise.resolve({});
let stateSaveErrorWasShown = false;
let activeSignalTimerInterval;
let activeSignalNoticeInterval;
let activeSignalNoticeRevealTimer;
let activeSignalTimerState = loadActiveSignalTimerState();
let selectedRiskProfile = loadRiskProfile();
let pulseOnboardingTimer;
let pulseOnboardingCloseTimer;
let lastSignalPopoverTimer;
let lastSignalFreshTimer;

updateRiskProfileInterface();





function consumeProfileOnboardingRequest() {
  let requested = false;

  try {
    requested =
      sessionStorage.getItem(
        PROFILE_ONBOARDING_REQUEST_KEY
      ) === "true";

    if (requested) {
      sessionStorage.removeItem(
        PROFILE_ONBOARDING_REQUEST_KEY
      );
    }
  } catch {
    /*
     * Якщо sessionStorage недоступний,
     * перевіряємо fallback query-параметр.
     */
  }

  try {
    const url = new URL(
      window.location.href
    );

    if (
      url.searchParams.get(
        "onboarding"
      ) === "1"
    ) {
      requested = true;
      url.searchParams.delete(
        "onboarding"
      );

      window.history.replaceState(
        window.history.state,
        "",
        url.pathname +
          url.search +
          url.hash
      );
    }
  } catch {
    /* URL fallback не критичний. */
  }

  return requested;
}


function hasSeenPulseOnboarding() {
  try {
    return (
      localStorage.getItem(
        ONBOARDING_STORAGE_KEY
      ) === "true"
    );
  } catch {
    return false;
  }
}

function markPulseOnboardingSeen() {
  try {
    localStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      "true"
    );
  } catch {
    /* Tutorial може показатися знову. */
  }
}

function openPulseOnboarding() {
  if (!pulseOnboarding) {
    return;
  }

  if (
    !allSlotsOverlay.hidden ||
    !subIdModal.hidden ||
    !signalOverlay.hidden ||
    (
      activeSignalNotice &&
      !activeSignalNotice.hidden
    )
  ) {
    return;
  }

  window.clearTimeout(
    pulseOnboardingCloseTimer
  );

  pulseOnboarding.hidden = false;

  document.body.classList.add(
    "pulse-welcome-open"
  );

  window.requestAnimationFrame(() => {
    pulseOnboarding.classList.add(
      "is-open"
    );
  });
}

function closePulseOnboarding(
  remember = true
) {
  if (!pulseOnboarding) {
    return;
  }

  if (remember) {
    markPulseOnboardingSeen();
  }

  window.clearTimeout(
    pulseOnboardingTimer
  );

  window.clearTimeout(
    pulseOnboardingCloseTimer
  );

  pulseOnboarding.classList.remove(
    "is-open"
  );

  document.body.classList.remove(
    "pulse-welcome-open"
  );

  pulseOnboardingCloseTimer =
    window.setTimeout(() => {
      pulseOnboarding.hidden = true;
    }, 260);
}

function schedulePulseOnboarding() {
  if (hasActiveSignalTimer()) {
    return;
  }

  window.clearTimeout(
    pulseOnboardingTimer
  );

  pulseOnboardingTimer =
    window.setTimeout(
      openPulseOnboarding,
      520
    );
}

function normalizeRiskProfile(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  return [
    "НИЗЬКИЙ",
    "СЕРЕДНІЙ",
    "ВИСОКИЙ",
  ].includes(normalized)
    ? normalized
    : "СЕРЕДНІЙ";
}

function loadRiskProfile() {
  try {
    return normalizeRiskProfile(
      localStorage.getItem(
        RISK_PROFILE_STORAGE_KEY
      ) || "СЕРЕДНІЙ"
    );
  } catch {
    return "СЕРЕДНІЙ";
  }
}

function saveRiskProfile(value) {
  selectedRiskProfile =
    normalizeRiskProfile(value);

  try {
    localStorage.setItem(
      RISK_PROFILE_STORAGE_KEY,
      selectedRiskProfile
    );
  } catch {
    /* Профіль залишиться активним до перезавантаження. */
  }
}

function hasActiveSignalTimer() {
  const timerState =
    loadActiveSignalTimerState();

  return Boolean(
    timerState &&
    timerState.endAt > Date.now()
  );
}

function updateRiskProfileInterface() {
  riskProfileOptions.forEach((button) => {
    const isActive =
      button.dataset.risk ===
      selectedRiskProfile;

    button.classList.toggle(
      "is-active",
      isActive
    );

    button.setAttribute(
      "aria-checked",
      String(isActive)
    );
  });

  const isLocked =
    hasActiveSignalTimer();

  riskProfile?.classList.toggle(
    "is-locked",
    isLocked
  );

  riskProfile?.setAttribute(
    "aria-disabled",
    String(isLocked)
  );
}

function selectRiskProfile(value) {
  if (hasActiveSignalTimer()) {
    activeSignalTimerState =
      loadActiveSignalTimerState();

    openActiveSignalNotice();
    return;
  }

  saveRiskProfile(value);
  updateRiskProfileInterface();
}

function stopActiveSignalNoticeInterval() {
  window.clearInterval(
    activeSignalNoticeInterval
  );

  activeSignalNoticeInterval = undefined;
}

function updateActiveSignalNoticeTime() {
  if (
    !activeSignalNoticeTime ||
    !activeSignalTimerState
  ) {
    return;
  }

  const remainingMs = Math.max(
    0,
    activeSignalTimerState.endAt -
      Date.now()
  );

  activeSignalNoticeTime.textContent =
    formatActiveSignalRemaining(
      remainingMs
    );

  if (remainingMs <= 0) {
    closeActiveSignalNotice();
  }
}

function openActiveSignalNotice() {
  activeSignalTimerState =
    loadActiveSignalTimerState();

  if (
    !activeSignalTimerState ||
    activeSignalTimerState.endAt <=
      Date.now()
  ) {
    return;
  }

  updateActiveSignalNoticeTime();

  window.clearTimeout(
    activeSignalNoticeRevealTimer
  );

  activeSignalNotice.hidden = false;
  activeSignalNotice.classList.remove(
    "is-open"
  );

  document.body.classList.add(
    "active-signal-notice-open"
  );

  /*
   * Спочатку показуємо backdrop.
   * Картка з'являється трохи пізніше,
   * коли blur уже встиг відмалюватися.
   */
  window.requestAnimationFrame(() => {
    activeSignalNotice.classList.add(
      "is-backdrop-ready"
    );

    activeSignalNoticeRevealTimer =
      window.setTimeout(() => {
        activeSignalNotice.classList.add(
          "is-open"
        );
      }, 90);
  });

  stopActiveSignalNoticeInterval();

  activeSignalNoticeInterval =
    window.setInterval(
      updateActiveSignalNoticeTime,
      250
    );
}

function closeActiveSignalNotice() {
  if (!activeSignalNotice) {
    return;
  }

  stopActiveSignalNoticeInterval();

  window.clearTimeout(
    activeSignalNoticeRevealTimer
  );

  activeSignalNotice.classList.remove(
    "is-open"
  );

  window.setTimeout(() => {
    activeSignalNotice.classList.remove(
      "is-backdrop-ready"
    );

    document.body.classList.remove(
      "active-signal-notice-open"
    );
  }, 70);

  window.setTimeout(() => {
    activeSignalNotice.hidden = true;
  }, 210);
}


function parseSignalDurationToMilliseconds(duration) {
  const match = String(duration || "")
    .trim()
    .match(/^(\d{1,2}):([0-5]\d)$/);

  if (!match) {
    return 0;
  }

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);

  return (minutes * 60 + seconds) * 1000;
}

function formatActiveSignalRemaining(milliseconds) {
  const totalSeconds = Math.max(
    0,
    Math.ceil(milliseconds / 1000)
  );

  const minutes = Math.floor(
    totalSeconds / 60
  );

  const seconds = totalSeconds % 60;

  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0")
  );
}

function loadActiveSignalTimerState() {
  try {
    const rawValue = localStorage.getItem(
      ACTIVE_SIGNAL_TIMER_STORAGE_KEY
    );

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);

    if (
      !parsedValue ||
      typeof parsedValue !== "object" ||
      !Number.isFinite(parsedValue.endAt) ||
      !Number.isFinite(parsedValue.startedAt) ||
      !Number.isFinite(parsedValue.durationMs) ||
      !parsedValue.signal
    ) {
      return null;
    }

    return parsedValue;
  } catch {
    return null;
  }
}

function saveActiveSignalTimerState(state) {
  activeSignalTimerState = state;

  try {
    localStorage.setItem(
      ACTIVE_SIGNAL_TIMER_STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch {
    /* Таймер продовжить працювати до закриття сторінки. */
  }
}

function clearActiveSignalTimerState() {
  activeSignalTimerState = null;

  try {
    localStorage.removeItem(
      ACTIVE_SIGNAL_TIMER_STORAGE_KEY
    );
  } catch {
    /* Локальне очищення не критичне. */
  }
}

function stopActiveSignalTimerInterval() {
  window.clearInterval(
    activeSignalTimerInterval
  );

  activeSignalTimerInterval = undefined;
}

function setActiveSignalTimerButtons(isRunning) {
  /*
   * "ПОЧАТИ СИГНАЛ" лишається видимою та клікабельною.
   * Якщо таймер уже активний, клік відкриє повідомлення,
   * але не перезапустить відлік.
   */
  resultActionButton.hidden = false;
  resultActionButton.disabled = false;

  /*
   * Створення нового сигналу блокуємо до завершення поточного.
   */
  resultNewButton.hidden = isRunning;
  resultNewButton.disabled = isRunning;
}

function renderActiveSignalTimer() {
  if (
    !activeSignalTimerState ||
    !activeSignalTimer
  ) {
    return false;
  }

  const now = Date.now();
  const remainingMs = Math.max(
    0,
    activeSignalTimerState.endAt - now
  );

  const durationMs = Math.max(
    1,
    activeSignalTimerState.durationMs
  );

  const progress = Math.max(
    0,
    Math.min(
      1,
      remainingMs / durationMs
    )
  );

  const isFinished = remainingMs <= 0;
  const isEnding =
    !isFinished &&
    remainingMs <= 30000;

  activeSignalTimer.hidden = false;

  activeSignalTimer.classList.toggle(
    "is-ending",
    isEnding
  );

  activeSignalTimer.classList.toggle(
    "is-finished",
    isFinished
  );

  activeSignalTimerValue.textContent =
    formatActiveSignalRemaining(
      remainingMs
    );

  activeSignalTimerProgress.style.width =
    `${progress * 100}%`;

  activeSignalTimerSlot.textContent =
    activeSignalTimerState.signal
      ?.slotName || "";

  activeSignalTimerStatus.textContent =
    isFinished
      ? "СИГНАЛ ЗАВЕРШЕНО"
      : "СИГНАЛ АКТИВНИЙ";

  activeSignalTimerHint.textContent =
    isFinished
      ? "Час сигналу завершився. Можна створити новий сигнал"
      : "Дотримуйтесь параметрів сигналу до завершення таймера";

  setActiveSignalTimerButtons(
    !isFinished
  );

  updateRiskProfileInterface();

  if (isFinished) {
    stopActiveSignalTimerInterval();
    clearActiveSignalTimerState();
    resultNewButton.hidden = false;
    updateRiskProfileInterface();

    signalOverlayTitle.textContent =
      "СИГНАЛ ЗАВЕРШЕНО";

    return false;
  }

  signalOverlayTitle.textContent =
    "СИГНАЛ АКТИВНИЙ";

  return true;
}

function beginActiveSignalTimerLoop() {
  stopActiveSignalTimerInterval();

  if (!renderActiveSignalTimer()) {
    return;
  }

  activeSignalTimerInterval =
    window.setInterval(
      renderActiveSignalTimer,
      250
    );
}

function startActiveSignalTimer(signal) {
  activeSignalTimerState =
    loadActiveSignalTimerState();

  if (
    activeSignalTimerState &&
    activeSignalTimerState.endAt >
      Date.now()
  ) {
    activeSignal = {
      ...activeSignalTimerState.signal,
    };

    beginActiveSignalTimerLoop();

    openActiveSignalNotice();

    return;
  }

  const durationMs =
    parseSignalDurationToMilliseconds(
      signal?.duration
    );

  if (!durationMs) {
    showToast(
      "Не вдалося визначити тривалість сигналу"
    );

    return;
  }

  const startedAt = Date.now();

  saveActiveSignalTimerState({
    signal: {
      ...signal,
    },
    startedAt,
    endAt: startedAt + durationMs,
    durationMs,
  });

  activeSignal = {
    ...signal,
  };

  activeSignalTimer.hidden = false;
  beginActiveSignalTimerLoop();

  showToast(
    `Сигнал для ${signal.slotName} активовано`
  );
}

function restoreActiveSignalTimerIfAvailable() {
  if (!activeSignalTimerState) {
    return false;
  }

  if (
    activeSignalTimerState.endAt <=
    Date.now()
  ) {
    clearActiveSignalTimerState();
    return false;
  }

  activeSignal = {
    ...activeSignalTimerState.signal,
  };

  fillResult(activeSignal);

  scanView.hidden = true;
  resultView.hidden = false;
  signalOverlay.hidden = false;

  signalOverlay.classList.remove(
    "is-scanning"
  );

  signalOverlay.classList.add(
    "is-result"
  );

  document.body.classList.add(
    "signal-overlay-open"
  );

  window.requestAnimationFrame(() => {
    signalOverlay.classList.add(
      "is-open"
    );
  });

  beginActiveSignalTimerLoop();

  return true;
}

function showToast(message) {
  window.clearTimeout(toastTimer);

  toastText.textContent = message;
  toast.classList.add("is-visible");

  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2400);
}

function formatLastSignalTime(createdAt) {
  const timestamp = Number(createdAt);

  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString(
    "uk-UA",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function closeLastSignalPopover() {
  window.clearTimeout(
    lastSignalPopoverTimer
  );

  if (!lastSignalFloat) {
    return;
  }

  lastSignalFloat.classList.remove(
    "is-visible"
  );

  lastSignalChip?.setAttribute(
    "aria-expanded",
    "false"
  );

  window.setTimeout(() => {
    if (
      !lastSignalFloat.classList.contains(
        "is-visible"
      )
    ) {
      lastSignalFloat.hidden = true;
    }
  }, 190);
}

function openLastSignalPopover() {
  if (
    !lastSignalFloat ||
    !lastSignalChip ||
    lastSignalChip.hidden
  ) {
    return;
  }

  window.clearTimeout(
    lastSignalPopoverTimer
  );

  lastSignalFloat.hidden = false;

  lastSignalChip.setAttribute(
    "aria-expanded",
    "true"
  );

  window.requestAnimationFrame(() => {
    lastSignalFloat.classList.add(
      "is-visible"
    );
  });

  lastSignalPopoverTimer =
    window.setTimeout(
      closeLastSignalPopover,
      4200
    );
}

function toggleLastSignalPopover() {
  if (
    lastSignalFloat &&
    !lastSignalFloat.hidden &&
    lastSignalFloat.classList.contains(
      "is-visible"
    )
  ) {
    closeLastSignalPopover();
    return;
  }

  openLastSignalPopover();
}

function animateFreshLastSignal() {
  if (!lastSignalChip) {
    return;
  }

  window.clearTimeout(
    lastSignalFreshTimer
  );

  lastSignalChip.classList.remove(
    "is-fresh",
    "is-updated"
  );

  if (lastSignalChipLabel) {
    lastSignalChipLabel.textContent =
      "Оновлено";
  }

  void lastSignalChip.offsetWidth;

  lastSignalChip.classList.add(
    "is-fresh",
    "is-updated"
  );

  lastSignalFreshTimer =
    window.setTimeout(() => {
      lastSignalChip.classList.remove(
        "is-fresh",
        "is-updated"
      );

      if (lastSignalChipLabel) {
        lastSignalChipLabel.classList.add(
          "is-switching"
        );

        window.setTimeout(() => {
          lastSignalChipLabel.textContent =
            "Останній";

          lastSignalChipLabel.classList.remove(
            "is-switching"
          );
        }, 140);
      }
    }, 1700);
}

function renderLastSignalSummary(
  signal,
  options = {}
) {
  const animateFresh =
    options.animateFresh === true;

  if (
    !lastSignalChip ||
    !lastSignalFloat ||
    !signal ||
    typeof signal !== "object" ||
    !signal.slotName
  ) {
    if (lastSignalChip) {
      lastSignalChip.hidden = true;
    }

    if (lastSignalFloat) {
      lastSignalFloat.hidden = true;
      lastSignalFloat.classList.remove(
        "is-visible"
      );
    }

    return;
  }

  if (lastSignalImage) {
    lastSignalImage.src =
      signal.slotImage || "";

    lastSignalImage.alt =
      signal.slotName || "";
  }

  if (lastSignalName) {
    lastSignalName.textContent =
      signal.slotName || "";
  }

  if (lastSignalBet) {
    lastSignalBet.textContent =
      signal.bet || "—";
  }

  if (lastSignalSpins) {
    const spins = Number(signal.spins);

    lastSignalSpins.textContent =
      Number.isFinite(spins)
        ? `${spins} обертів`
        : "—";
  }

  if (lastSignalRisk) {
    const risk =
      String(signal.risk || "")
        .trim()
        .toUpperCase();

    lastSignalRisk.textContent =
      risk || "—";

    lastSignalRisk.dataset.level =
      risk.toLowerCase();
  }

  if (lastSignalTime) {
    lastSignalTime.textContent =
      formatLastSignalTime(
        signal.createdAt
      );
  }

  lastSignalChip.hidden = false;

  if (
    !animateFresh &&
    lastSignalChipLabel
  ) {
    lastSignalChipLabel.textContent =
      "Останній";
  }

  if (animateFresh) {
    animateFreshLastSignal();
  }
}

function getArbifyApi() {
  if (!window.ARBIFY_API) {
    throw new Error(
      "ARBIFY API is not loaded"
    );
  }

  return window.ARBIFY_API;
}

async function recordSignalCreatedActivity(
  signal
) {
  const api = getArbifyApi();

  if (!api.isTelegramMiniApp()) {
    return null;
  }

  const result = await api.recordActivity(
    "signal-created",
    {
      slotName:
        signal?.slotName || "",
    }
  );

  homeState = {
    ...api.getCurrentState(),
  };

  return result;
}

function getStoredSubId() {
  const databaseSubId =
    normalizeSubId(homeState.subid || "");

  if (databaseSubId) {
    return databaseSubId;
  }

  try {
    return normalizeSubId(
      sessionStorage.getItem(
        SUBID_STORAGE_KEY
      ) || ""
    );
  } catch {
    return "";
  }
}

function getLegacySignalCount() {
  try {
    const value = Number(
      localStorage.getItem(
        "arbifyCreatedSignalCount"
      )
    );

    return Number.isSafeInteger(value) &&
      value > 0
      ? value
      : 0;
  } catch {
    return 0;
  }
}

function getCreatedSignalCount() {
  const value = Number(
    homeState.taskProgress
      ?.createdSignalCount
  );

  if (
    Number.isSafeInteger(value) &&
    value >= 0
  ) {
    return value;
  }

  return getLegacySignalCount();
}

function applySelectedSlot(
  slotName
) {
  if (!slotName) {
    return;
  }

  const matchingCard =
    [...slotCards].find((card) => {
      return card.dataset.slot === slotName;
    });

  if (!matchingCard) {
    return;
  }

  riskProfileOptions.forEach((button) => {
  button.addEventListener(
    "click",
    () => {
      selectRiskProfile(
        button.dataset.risk
      );
    }
  );
});

slotCards.forEach((card) => {
    card.classList.toggle(
      "is-selected",
      card === matchingCard
    );
  });

  selectedSlot = getSelectedSlot();
}

function applyDatabaseState(state) {
  homeState = {
    ...(state || {}),
  };

  const savedSubId =
    normalizeSubId(homeState.subid || "");

  if (savedSubId) {
    try {
      sessionStorage.setItem(
        SUBID_STORAGE_KEY,
        savedSubId
      );
    } catch {
      /*
       * SUBID вже збережений у базі.
       */
    }
  }

  applySelectedSlot(
    homeState.selectedSlot
  );

  if (
    Array.isArray(
      homeState.favorites
    )
  ) {
    favoriteSlotNames =
      new Set(
        homeState.favorites.filter(
          (slotName) => {
            return slotCatalog.some(
              (slot) =>
                slot.name === slotName
            );
          }
        )
      );

    saveFavoriteSlots();
    updateFavoriteInterface();
  }

  if (homeState.lastSignal) {
    renderLastSignalSummary(
      homeState.lastSignal
    );

    try {
      sessionStorage.setItem(
        "arbifyLastSignal",
        JSON.stringify(
          homeState.lastSignal
        )
      );
    } catch {
      /*
       * Останній сигнал уже є у базі.
       */
    }
  } else {
    renderLastSignalSummary(null);
  }
}

function persistStatePatch(
  statePatch,
  options = {}
) {
  const required =
    options.required === true;

  homeState = {
    ...homeState,
    ...statePatch,
  };

  const operation = stateSaveQueue
    .catch(() => {
      return homeState;
    })
    .then(async () => {
      const api = getArbifyApi();
      const savedState =
        await api.saveState(
          statePatch
        );

      homeState = {
        ...savedState,
      };

      stateSaveErrorWasShown = false;

      return homeState;
    });

  stateSaveQueue = operation.catch(
    (error) => {
      console.error(
        "ARBIFY state save error:",
        error.message
      );

      if (
        !required &&
        !stateSaveErrorWasShown
      ) {
        stateSaveErrorWasShown = true;

        showToast(
          "Не вдалося синхронізувати дані"
        );
      }

      return homeState;
    }
  );

  return required
    ? operation
    : stateSaveQueue;
}

async function migrateLegacyState() {
  const patch = {};
  const legacySubId = getStoredSubId();
  const legacySignalCount =
    getLegacySignalCount();

  if (
    !homeState.subid &&
    legacySubId
  ) {
    patch.subid = legacySubId;
  }

  if (
    !homeState.selectedSlot &&
    selectedSlot?.name
  ) {
    patch.selectedSlot =
      selectedSlot.name;
  }

  if (
    !Array.isArray(
      homeState.favorites
    ) &&
    favoriteSlotNames.size > 0
  ) {
    patch.favorites = [
      ...favoriteSlotNames,
    ];
  }


  if (
    !homeState.taskProgress
      ?.createdSignalCount &&
    legacySignalCount > 0
  ) {
    patch.taskProgress = {
      ...(homeState.taskProgress || {}),
      createdSignalCount:
        legacySignalCount,
    };
  }

  if (!homeState.lastSignal) {
    try {
      const legacyLastSignal =
        sessionStorage.getItem(
          "arbifyLastSignal"
        );

      if (legacyLastSignal) {
        patch.lastSignal =
          JSON.parse(
            legacyLastSignal
          );
      }
    } catch {
      /*
       * Пошкоджені локальні дані
       * просто не переносимо.
       */
    }
  }

  if (Object.keys(patch).length > 0) {
    await persistStatePatch(
      patch,
      {
        required: true,
      }
    );
  }
}

async function initializeHomeState() {
  const api = getArbifyApi();
  const user = await api.authenticate();

  if (!user?.accessGranted) {
    window.location.replace(
      "index.html"
    );

    return false;
  }

  try {
    sessionStorage.setItem(
      "arbifyAccess",
      "granted"
    );
  } catch {
    /*
     * Доступ підтверджує сервер.
     */
  }

  applyDatabaseState(
    user.state ||
      api.getCurrentState()
  );

  homeReady = true;

  await migrateLegacyState();
  applyDatabaseState(homeState);

  document.documentElement.dataset
    .arbifyPageReady = "true";

  const onboardingRequestedFromProfile =
    consumeProfileOnboardingRequest();

  if (onboardingRequestedFromProfile) {
    /*
     * Відкриваємо той самий #pulseOnboarding,
     * який використовується при першому запуску.
     * Маленька затримка дає Home завершити перший paint.
     */
    window.clearTimeout(
      pulseOnboardingTimer
    );

    pulseOnboardingTimer =
      window.setTimeout(
        openPulseOnboarding,
        80
      );
  } else {
    schedulePulseOnboarding();
  }

  return true;
}

function beginHomeInitialization() {
  if (!homeInitializationPromise) {
    homeInitializationPromise =
      initializeHomeState().catch(
        (error) => {
          homeReady = false;

          console.error(
            "ARBIFY home initialization error:",
            error.message
          );

          showToast(
            "Не вдалося підключитися до профілю"
          );

          return false;
        }
      );
  }

  return homeInitializationPromise;
}

async function ensureHomeReady() {
  if (homeReady) {
    return true;
  }

  return Boolean(
    await beginHomeInitialization()
  );
}

function normalizeSubId(value) {
  return value
    .trim()
    .replace(/\s+/g, "")
    .slice(0, 64);
}

function resetSubIdModal() {
  subIdDialog.classList.remove(
    "is-checking",
    "is-success"
  );

  subIdField.classList.remove(
    "has-error",
    "is-checking"
  );

  subIdFormView.hidden = false;
  subIdSuccessView.hidden = true;
  subIdMessage.innerHTML = "&nbsp;";
  subIdVerifyButton.disabled = false;
  subIdVerifyText.textContent = "ПЕРЕВІРИТИ SUBID";
}

function openSubIdModal() {
  window.clearTimeout(toastTimer);
  window.clearTimeout(subIdCloseTimer);

  toast.classList.remove("is-visible");
  resetSubIdModal();

  subIdInput.value = "";
  subIdModal.hidden = false;

  document.body.classList.add(
    "subid-modal-open"
  );

  window.requestAnimationFrame(() => {
    subIdModal.classList.add("is-open");
  });
}

function closeSubIdModal(afterClose) {
  window.clearTimeout(subIdVerifyTimer);
  window.clearTimeout(subIdSuccessTimer);
  window.clearTimeout(subIdCloseTimer);

  subIdInput.blur();
  subIdModal.classList.remove("is-open");

  document.body.classList.remove(
    "subid-modal-open"
  );

  subIdCloseTimer = window.setTimeout(() => {
    subIdModal.hidden = true;
    resetSubIdModal();

    if (typeof afterClose === "function") {
      afterClose();
    }
  }, 220);
}

function showSubIdError(message) {
  subIdDialog.classList.remove("is-checking");
  subIdField.classList.remove("is-checking");

  void subIdField.offsetWidth;

  subIdField.classList.add("has-error");
  subIdMessage.textContent = message;
  subIdVerifyButton.disabled = false;
  subIdVerifyText.textContent = "ПЕРЕВІРИТИ SUBID";
  subIdInput.focus();
}

function startSubIdVerification(subId) {
  subIdInput.blur();
  subIdMessage.innerHTML = "&nbsp;";
  subIdField.classList.remove("has-error");
  subIdField.classList.add("is-checking");
  subIdDialog.classList.add("is-checking");
  subIdVerifyButton.disabled = true;
  subIdVerifyText.textContent = "ПЕРЕВІРЯЄМО...";

  /*
   * ДЕМО-ПЕРЕВІРКА:
   * зараз будь-який непорожній SUBID вважається правильним.
   * Пізніше цей таймер замінимо запитом до серверного API,
   * яке перевірятиме реєстрацію через Keitaro.
   */
  subIdVerifyTimer = window.setTimeout(
    async () => {
      try {
        await persistStatePatch(
          {
            subid: subId,
          },
          {
            required: true,
          }
        );

        try {
          sessionStorage.setItem(
            SUBID_STORAGE_KEY,
            subId
          );
        } catch {
          /*
           * SUBID уже збережено
           * у серверній базі.
           */
        }

        let noticeWasSent = false;

        try {
          noticeWasSent =
            sessionStorage.getItem(
              PULSE_SUBID_NOTICE_KEY
            ) === "true";
        } catch {
          /*
           * Сповіщення не впливає
           * на підтвердження SUBID.
           */
        }

        if (!noticeWasSent) {
          try {
            sessionStorage.setItem(
              PULSE_SUBID_NOTICE_KEY,
              "true"
            );
          } catch {
            /*
             * Продовжуємо без локальної
             * позначки сповіщення.
             */
          }

          pulseHomeUseNotifications(
            (notificationsApi) => {
              notificationsApi.add({
                type: "success",
                category:
                  "SUBID ПІДТВЕРДЖЕНО",
                title:
                  "Реєстрацію знайдено",
                message:
                  `SUBID ${pulseMaskSubId(subId)} успішно підтверджено. ` +
                  "Доступ до створення сигналів відкрито.",
              });
            }
          );
        }

        subIdDialog.classList.remove(
          "is-checking"
        );

        subIdDialog.classList.add(
          "is-success"
        );

        subIdField.classList.remove(
          "is-checking"
        );

        subIdFormView.hidden = true;
        subIdSuccessView.hidden = false;

        subIdSuccessTimer =
          window.setTimeout(() => {
            closeSubIdModal(() => {
              startSignalFlow();
            });
          }, SUBID_SUCCESS_DELAY);
      } catch (error) {
        console.error(
          "SUBID save error:",
          error.message
        );

        showSubIdError(
          "Не вдалося зберегти SUBID. Спробуйте ще раз"
        );
      }
    },
    SUBID_VERIFY_DELAY
  );
}

function getSelectedSlot() {
  const selectedCard =
    document.querySelector(".slot-card.is-selected") ||
    slotCards[0];

  const image = selectedCard.querySelector("img");

  return {
    name: selectedCard.dataset.slot,
    image: image.getAttribute("src"),
  };
}

function randomItem(items) {
  return items[
    Math.floor(
      Math.random() * items.length
    )
  ];
}

function createSignal(slot) {
  const profile =
    signalProfiles[slot.name] ||
    signalProfiles["Gates of Olympus"];

  return {
    slotName: slot.name,
    slotImage: slot.image,
    bet: `₴${randomItem(profile.bets)}`,
    spins: randomItem(profile.spins),
    risk: selectedRiskProfile,
    duration: randomItem(profile.durations),
    createdAt: Date.now(),
  };
}

function saveSignal(signal) {
  renderLastSignalSummary(
    signal,
    { animateFresh: true }
  );

  try {
    sessionStorage.setItem(
      "arbifyLastSignal",
      JSON.stringify(signal)
    );
  } catch {
    /*
     * Основна копія сигналу
     * зберігається на сервері.
     */
  }

  const previousHistory =
    Array.isArray(
      homeState.signalHistory
    )
      ? homeState.signalHistory
      : [];

  const signalHistory = [
    signal,
    ...previousHistory,
  ].slice(0, 50);

  void persistStatePatch({
    lastSignal: signal,
    signalHistory,
  });
}

function setScanStage(percent) {
  const currentStage = [...scanStages]
    .reverse()
    .find((stage) => {
      return percent >= stage.from;
    });

  if (currentStage) {
    scanStatus.textContent =
      currentStage.message;
  }
}

function prepareScan(slot) {
  selectedSlot = slot;
  activeSignal = null;

  stopActiveSignalTimerInterval();

  if (activeSignalTimer) {
    activeSignalTimer.hidden = true;
    activeSignalTimer.classList.remove(
      "is-ending",
      "is-finished"
    );
  }

  resultActionButton.hidden = false;
  resultActionButton.disabled = false;

  resultNewButton.hidden = false;
  resultNewButton.disabled = false;

  signalOverlayTitle.textContent =
    "НОВИЙ СИГНАЛ";

  scanSlotImage.src = slot.image;
  scanSlotName.textContent = slot.name;

  scanStatus.textContent =
    scanStages[0].message;

  scanPercent.textContent = "0%";
  scanProgress.style.width = "0%";

  resultView.hidden = true;
  scanView.hidden = false;

  signalOverlay.classList.remove(
    "is-result"
  );

  signalOverlay.classList.add(
    "is-scanning"
  );
}

function openSignalOverlay() {
  window.clearTimeout(toastTimer);
  toast.classList.remove("is-visible");

  signalOverlay.hidden = false;

  document.body.classList.add(
    "signal-overlay-open"
  );

  window.requestAnimationFrame(() => {
    signalOverlay.classList.add(
      "is-open"
    );
  });
}

function stopScanning() {
  window.cancelAnimationFrame(scanFrame);
  window.clearTimeout(resultRevealTimer);

  scanFrame = undefined;
  resultRevealTimer = undefined;
}

function closeSignalOverlay() {
  stopScanning();

  signalOverlay.classList.remove(
    "is-open",
    "is-scanning",
    "is-result"
  );

  document.body.classList.remove(
    "signal-overlay-open"
  );

  window.setTimeout(() => {
    signalOverlay.hidden = true;
    scanView.hidden = false;
    resultView.hidden = true;
  }, 220);
}

function fillResult(signal) {
  if (activeSignalTimer) {
    activeSignalTimer.hidden = true;
    activeSignalTimer.classList.remove(
      "is-ending",
      "is-finished"
    );
  }

  resultActionButton.hidden = false;
  resultActionButton.disabled = false;

  resultNewButton.hidden = false;
  resultNewButton.disabled = false;

  resultSlotImage.src =
    signal.slotImage;

  resultSlotName.textContent =
    signal.slotName;

  resultBet.textContent =
    signal.bet;

  resultSpins.textContent =
    String(signal.spins);

  resultDuration.textContent =
    signal.duration;

  resultRisk.innerHTML = `
    <span></span>
    ${signal.risk}
  `;

  resultRisk.dataset.level =
    signal.risk.toLowerCase();
}

function showSignalResult() {
  activeSignal =
    createSignal(selectedSlot);

  saveSignal(activeSignal);
  fillResult(activeSignal);

  scanPercent.textContent = "100%";
  scanProgress.style.width = "100%";

  scanStatus.textContent =
    "Сигнал успішно сформовано";

  resultRevealTimer =
    window.setTimeout(() => {
      scanView.hidden = true;
      resultView.hidden = false;

      signalOverlayTitle.textContent =
        "СИГНАЛ ГОТОВИЙ";

      signalOverlay.classList.remove(
        "is-scanning"
      );

      signalOverlay.classList.add(
        "is-result"
      );
    }, RESULT_REVEAL_DELAY);
}

function runScan() {
  stopScanning();

  const startedAt =
    performance.now();

  function updateScan(currentTime) {
    const elapsed =
      currentTime - startedAt;

    const rawProgress =
      Math.min(
        elapsed / SCAN_DURATION,
        1
      );

    const easedProgress =
      1 -
      Math.pow(
        1 - rawProgress,
        1.45
      );

    const percent =
      Math.min(
        Math.floor(
          easedProgress * 100
        ),
        rawProgress < 1
          ? 99
          : 100
      );

    scanPercent.textContent =
      `${percent}%`;

    scanProgress.style.width =
      `${percent}%`;

    setScanStage(percent);

    if (rawProgress < 1) {
      scanFrame =
        window.requestAnimationFrame(
          updateScan
        );

      return;
    }

    showSignalResult();
  }

  scanFrame =
    window.requestAnimationFrame(
      updateScan
    );
}

function startSignalFlow() {
  const slot = getSelectedSlot();

  prepareScan(slot);
  openSignalOverlay();
  runScan();
}

slotCards.forEach((card) => {
  card.addEventListener("click", async () => {
    if (!(await ensureHomeReady())) {
      return;
    }

    slotCards.forEach((item) => {
      item.classList.remove(
        "is-selected"
      );
    });

    card.classList.add(
      "is-selected"
    );

    selectedSlot =
      getSelectedSlot();

    showToast(
      `${selectedSlot.name} обрано`
    );

    void persistStatePatch({
      selectedSlot:
        selectedSlot.name,
    });
  });
});

signalButton.addEventListener(
  "click",
  async () => {
    if (!(await ensureHomeReady())) {
      return;
    }

    activeSignalTimerState =
      loadActiveSignalTimerState();

    if (
      activeSignalTimerState &&
      activeSignalTimerState.endAt >
        Date.now()
    ) {
      restoreActiveSignalTimerIfAvailable();
      return;
    }

    const verifiedSubId =
      getStoredSubId();

    if (verifiedSubId) {
      startSignalFlow();
      return;
    }

    openSubIdModal();
  }
);

subIdInput.addEventListener(
  "input",
  () => {
    subIdField.classList.remove(
      "has-error"
    );

    subIdMessage.innerHTML =
      "&nbsp;";
  }
);

subIdForm.addEventListener(
  "submit",
  (event) => {
    event.preventDefault();

    if (
      subIdVerifyButton.disabled
    ) {
      return;
    }

    const subId =
      normalizeSubId(
        subIdInput.value
      );

    subIdInput.value = subId;

    if (!subId) {
      showSubIdError(
        "Введіть свій SUBID для перевірки"
      );

      return;
    }

    startSubIdVerification(subId);
  }
);

subIdCloseButton.addEventListener(
  "click",
  () => {
    closeSubIdModal();
  }
);

subIdModalBackdrop.addEventListener(
  "click",
  () => {
    closeSubIdModal();
  }
);

signalBackButton.addEventListener(
  "click",
  () => {
    closeSignalOverlay();
  }
);

resultNewButton.addEventListener(
  "click",
  () => {
    prepareScan(
      getSelectedSlot()
    );

    runScan();
  }
);

resultActionButton.addEventListener(
  "click",
  () => {
    if (!activeSignal) {
      return;
    }

    activeSignalTimerState =
      loadActiveSignalTimerState();

    if (
      activeSignalTimerState &&
      activeSignalTimerState.endAt >
        Date.now()
    ) {
      beginActiveSignalTimerLoop();
      openActiveSignalNotice();

      return;
    }

    startActiveSignalTimer(
      activeSignal
    );
  }
);

activeSignalNoticeButton?.addEventListener(
  "click",
  closeActiveSignalNotice
);

activeSignalNoticeBackdrop?.addEventListener(
  "click",
  closeActiveSignalNotice
);

pulseOnboardingNext?.addEventListener(
  "click",
  () => {
    closePulseOnboarding(true);
  }
);

pulseOnboardingSkip?.addEventListener(
  "click",
  () => {
    closePulseOnboarding(true);
  }
);

lastSignalChip?.addEventListener(
  "click",
  (event) => {
    event.stopPropagation();
    toggleLastSignalPopover();
  }
);

lastSignalFloat?.addEventListener(
  "click",
  (event) => {
    event.stopPropagation();
  }
);

document.addEventListener(
  "click",
  () => {
    closeLastSignalPopover();
  }
);

notificationButton.addEventListener(
  "click",
  () => {
    showToast(
      "Нових сповіщень поки немає"
    );
  }
);

allSlotsButton.addEventListener(
  "click",
  async () => {
    if (!(await ensureHomeReady())) {
      return;
    }

    openAllSlotsOverlay();
  }
);

allSlotsBackButton.addEventListener(
  "click",
  () => {
    closeAllSlotsOverlay();
  }
);

allSlotsSearchInput?.addEventListener(
  "input",
  () => {
    renderAllSlotsCatalog(
      allSlotsSearchInput.value
    );
  }
);

allSlotsSearchClear?.addEventListener(
  "click",
  () => {
    allSlotsSearchInput.value = "";
    renderAllSlotsCatalog();
    allSlotsSearchInput.focus();
  }
);


allSlotsCategories?.addEventListener(
  "click",
  (event) => {
    const button = event.target.closest(
      ".all-slots-category"
    );

    if (!button) {
      return;
    }

    setActiveSlotCategory(
      button.dataset.category
    );
  }
);

/*
 * Нижня навігація.
 * Кнопка «Сигнали» відкриває LIVE-стрічку.
 */
navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const sectionName =
      item.dataset.section;

    if (
      sectionName === "Сигнали"
    ) {
      window.location.href =
        "signals.html";

      return;
    }

    if (
      sectionName !== "Головна"
    ) {
      showToast(
        `Розділ «${sectionName}» готується`
      );
    }
  });
});

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Escape" &&
      pulseOnboarding &&
      !pulseOnboarding.hidden
    ) {
      closePulseOnboarding(true);
      return;
    }

    if (
      event.key === "Escape" &&
      activeSignalNotice &&
      !activeSignalNotice.hidden
    ) {
      closeActiveSignalNotice();
      return;
    }

    if (
      event.key === "Escape" &&
      !allSlotsOverlay.hidden
    ) {
      closeAllSlotsOverlay();
      return;
    }

    if (
      event.key === "Escape" &&
      !subIdModal.hidden
    ) {
      closeSubIdModal();
      return;
    }

    if (
      event.key === "Escape" &&
      !signalOverlay.hidden
    ) {
      closeSignalOverlay();
    }
  }
);

window.addEventListener(
  "beforeunload",
  () => {
    window.clearTimeout(
      toastTimer
    );

    window.clearTimeout(
      subIdVerifyTimer
    );

    window.clearTimeout(
      subIdSuccessTimer
    );

    window.clearTimeout(
      subIdCloseTimer
    );

    stopScanning();
    stopActiveSignalTimerInterval();
    stopActiveSignalNoticeInterval();

    window.clearTimeout(
      activeSignalNoticeRevealTimer
    );

    window.clearTimeout(
      pulseOnboardingTimer
    );

    window.clearTimeout(
      pulseOnboardingCloseTimer
    );

    window.clearTimeout(
      lastSignalPopoverTimer
    );

    window.clearTimeout(
      lastSignalFreshTimer
    );
  }
);

/*
 * Реальна висота екрана під час відкритої клавіатури.
 * Потрібно для iPhone Safari та Telegram WebView.
 */
function syncSubIdVisualViewport() {
  const viewport =
    window.visualViewport;

  const viewportHeight =
    viewport?.height ||
    window.innerHeight;

  const viewportTop =
    viewport?.offsetTop || 0;

  const coveredHeight =
    Math.max(
      0,
      window.innerHeight -
        viewportHeight -
        viewportTop
    );

  document.documentElement.style.setProperty(
    "--subid-visual-height",
    `${viewportHeight}px`
  );

  document.documentElement.style.setProperty(
    "--subid-visual-top",
    `${viewportTop}px`
  );

  const keyboardIsOpen =
    !subIdModal.hidden &&
    coveredHeight >
      Math.max(
        120,
        window.innerHeight * 0.18
      );

  document.body.classList.toggle(
    "subid-keyboard-open",
    keyboardIsOpen
  );
}

function scheduleSubIdViewportSync() {
  syncSubIdVisualViewport();

  window.setTimeout(
    syncSubIdVisualViewport,
    80
  );

  window.setTimeout(
    syncSubIdVisualViewport,
    260
  );

  window.setTimeout(
    syncSubIdVisualViewport,
    420
  );
}

subIdInput.addEventListener(
  "focus",
  scheduleSubIdViewportSync
);

subIdInput.addEventListener(
  "blur",
  scheduleSubIdViewportSync
);

window.visualViewport?.addEventListener(
  "resize",
  syncSubIdVisualViewport
);

window.visualViewport?.addEventListener(
  "scroll",
  syncSubIdVisualViewport
);

window.addEventListener(
  "orientationchange",
  scheduleSubIdViewportSync
);

syncSubIdVisualViewport();

/*
 * =========================================================
 * PULSE — СПОВІЩЕННЯ ГОЛОВНОЇ СТОРІНКИ
 * Цей блок має бути в самому кінці home.js.
 * =========================================================
 */

const PULSE_SIGNAL_COUNT_KEY =
  "arbifyCreatedSignalCount";

const PULSE_SUBID_NOTICE_KEY =
  "arbifySubIdNoticeSent";

function pulseHomeUseNotifications(action) {
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

function pulseIncrementSignalCount() {
  const synchronizedValue =
    getCreatedSignalCount();

  try {
    localStorage.setItem(
      PULSE_SIGNAL_COUNT_KEY,
      String(synchronizedValue)
    );
  } catch {
    /*
     * Лічильник уже збережений
     * у серверній базі.
     */
  }

  return synchronizedValue;
}

function pulseMaskSubId(subId) {
  const normalizedValue =
    String(subId || "").trim();

  if (normalizedValue.length <= 4) {
    return normalizedValue;
  }

  return (
    normalizedValue.slice(0, 2) +
    "•".repeat(
      Math.min(
        normalizedValue.length - 4,
        6
      )
    ) +
    normalizedValue.slice(-2)
  );
}

const pulseOriginalShowSignalResult =
  showSignalResult;

function pulseSendSignalNotification(
  signal,
  signalCount
) {
  pulseHomeUseNotifications(
    (notificationsApi) => {
      notificationsApi.addSignal({
        title:
          `Сигнал для ${signal.slotName} готовий`,
        message:
          `Ставка ${signal.bet} · ` +
          `${signal.spins} обертань · ` +
          `ризик ${signal.risk.toLowerCase()}. ` +
          `Усього створено сигналів: ${signalCount}.`,
      });
    }
  );
}

async function pulseRegisterSignalResult(
  signal
) {
  const api = getArbifyApi();

  if (api.isTelegramMiniApp()) {
    try {
      const result =
        await recordSignalCreatedActivity(
          signal
        );

      const signalCount = Number(
        result?.rewards?.progress
          ?.createdSignalCount
      );

      pulseSendSignalNotification(
        signal,
        Number.isSafeInteger(
          signalCount
        )
          ? signalCount
          : getCreatedSignalCount()
      );

      return;
    } catch (error) {
      console.error(
        "Signal activity save error:",
        error.message
      );

      showToast(
        "Сигнал створено, але прогрес ще не синхронізовано"
      );

      return;
    }
  }

  const localSignalCount =
    getCreatedSignalCount() + 1;

  homeState = {
    ...homeState,
    taskProgress: {
      ...(homeState.taskProgress || {}),
      createdSignalCount:
        localSignalCount,
    },
  };

  try {
    localStorage.setItem(
      PULSE_SIGNAL_COUNT_KEY,
      String(localSignalCount)
    );
  } catch {
    /* Локальний деморежим. */
  }

  pulseSendSignalNotification(
    signal,
    localSignalCount
  );
}

showSignalResult = function () {
  pulseOriginalShowSignalResult();

  if (!activeSignal) {
    return;
  }

  const signal = {
    ...activeSignal,
  };

  void pulseRegisterSignalResult(
    signal
  );
};

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    beginHomeInitialization,
    {
      once: true,
    }
  );
} else {
  beginHomeInitialization();
}
