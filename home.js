"use strict";

if (sessionStorage.getItem("arbifyAccess") !== "granted") {
  window.location.replace("index.html");
}

const SCAN_DURATION = 4600;
const RESULT_REVEAL_DELAY = 420;
const SUBID_VERIFY_DELAY = 1200;
const SUBID_SUCCESS_DELAY = 850;
const SUBID_STORAGE_KEY = "arbifyVerifiedSubId";

const slotCards = document.querySelectorAll(".slot-card");
const signalButton = document.querySelector("#signalButton");
const notificationButton = document.querySelector("#notificationButton");
const allSlotsButton = document.querySelector("#allSlotsButton");
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

const signalProfiles = {
  "Thunder Crown": {
    bets: [10, 20, 25, 30],
    spins: [8, 10, 12, 15],
    risks: ["НИЗЬКИЙ", "СЕРЕДНІЙ"],
    durations: ["02:30", "03:00", "03:30"],
  },

  "Candy Spiral": {
    bets: [10, 15, 20, 25],
    spins: [10, 12, 15, 18],
    risks: ["СЕРЕДНІЙ", "ВИСОКИЙ"],
    durations: ["02:45", "03:00", "04:00"],
  },

  "Gem Rocket": {
    bets: [15, 20, 30, 40],
    spins: [7, 9, 11, 14],
    risks: ["НИЗЬКИЙ", "СЕРЕДНІЙ"],
    durations: ["02:00", "02:30", "03:00"],
  },
};

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

let toastTimer;
let subIdVerifyTimer;
let subIdSuccessTimer;
let subIdCloseTimer;
let scanFrame;
let resultRevealTimer;
let selectedSlot = getSelectedSlot();
let activeSignal = null;

function showToast(message) {
  window.clearTimeout(toastTimer);

  toastText.textContent = message;
  toast.classList.add("is-visible");

  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2400);
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
  subIdVerifyTimer = window.setTimeout(() => {
    sessionStorage.setItem(
      SUBID_STORAGE_KEY,
      subId
    );

    subIdDialog.classList.remove("is-checking");
    subIdDialog.classList.add("is-success");
    subIdField.classList.remove("is-checking");
    subIdFormView.hidden = true;
    subIdSuccessView.hidden = false;

    subIdSuccessTimer = window.setTimeout(() => {
      closeSubIdModal(() => {
        startSignalFlow();
      });
    }, SUBID_SUCCESS_DELAY);
  }, SUBID_VERIFY_DELAY);
}

function getSelectedSlot() {
  const selectedCard =
    document.querySelector(".slot-card.is-selected") || slotCards[0];

  const image = selectedCard.querySelector("img");

  return {
    name: selectedCard.dataset.slot,
    image: image.getAttribute("src"),
  };
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function createSignal(slot) {
  const profile =
    signalProfiles[slot.name] || signalProfiles["Thunder Crown"];

  return {
    slotName: slot.name,
    slotImage: slot.image,
    bet: `₴${randomItem(profile.bets)}`,
    spins: randomItem(profile.spins),
    risk: randomItem(profile.risks),
    duration: randomItem(profile.durations),
    createdAt: Date.now(),
  };
}

function saveSignal(signal) {
  sessionStorage.setItem(
    "arbifyLastSignal",
    JSON.stringify(signal)
  );
}

function setScanStage(percent) {
  const currentStage = [...scanStages]
    .reverse()
    .find((stage) => percent >= stage.from);

  if (currentStage) {
    scanStatus.textContent = currentStage.message;
  }
}

function prepareScan(slot) {
  selectedSlot = slot;
  activeSignal = null;

  signalOverlayTitle.textContent = "НОВИЙ СИГНАЛ";
  scanSlotImage.src = slot.image;
  scanSlotName.textContent = slot.name;
  scanStatus.textContent = scanStages[0].message;
  scanPercent.textContent = "0%";
  scanProgress.style.width = "0%";

  resultView.hidden = true;
  scanView.hidden = false;

  signalOverlay.classList.remove("is-result");
  signalOverlay.classList.add("is-scanning");
}

function openSignalOverlay() {
  window.clearTimeout(toastTimer);
  toast.classList.remove("is-visible");

  signalOverlay.hidden = false;
  document.body.classList.add("signal-overlay-open");

  window.requestAnimationFrame(() => {
    signalOverlay.classList.add("is-open");
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

  document.body.classList.remove("signal-overlay-open");

  window.setTimeout(() => {
    signalOverlay.hidden = true;
    scanView.hidden = false;
    resultView.hidden = true;
  }, 220);
}

function fillResult(signal) {
  resultSlotImage.src = signal.slotImage;
  resultSlotName.textContent = signal.slotName;
  resultBet.textContent = signal.bet;
  resultSpins.textContent = String(signal.spins);
  resultDuration.textContent = signal.duration;

  resultRisk.innerHTML = `
    <span></span>
    ${signal.risk}
  `;

  resultRisk.dataset.level = signal.risk.toLowerCase();
}

function showSignalResult() {
  activeSignal = createSignal(selectedSlot);
  saveSignal(activeSignal);
  fillResult(activeSignal);

  scanPercent.textContent = "100%";
  scanProgress.style.width = "100%";
  scanStatus.textContent = "Сигнал успішно сформовано";

  resultRevealTimer = window.setTimeout(() => {
    scanView.hidden = true;
    resultView.hidden = false;

    signalOverlayTitle.textContent = "СИГНАЛ ГОТОВИЙ";
    signalOverlay.classList.remove("is-scanning");
    signalOverlay.classList.add("is-result");
  }, RESULT_REVEAL_DELAY);
}

function runScan() {
  stopScanning();

  const startedAt = performance.now();

  function updateScan(currentTime) {
    const elapsed = currentTime - startedAt;
    const rawProgress = Math.min(elapsed / SCAN_DURATION, 1);
    const easedProgress = 1 - Math.pow(1 - rawProgress, 1.45);

    const percent = Math.min(
      Math.floor(easedProgress * 100),
      rawProgress < 1 ? 99 : 100
    );

    scanPercent.textContent = `${percent}%`;
    scanProgress.style.width = `${percent}%`;
    setScanStage(percent);

    if (rawProgress < 1) {
      scanFrame = window.requestAnimationFrame(updateScan);
      return;
    }

    showSignalResult();
  }

  scanFrame = window.requestAnimationFrame(updateScan);
}

function startSignalFlow() {
  const slot = getSelectedSlot();

  prepareScan(slot);
  openSignalOverlay();
  runScan();
}

slotCards.forEach((card) => {
  card.addEventListener("click", () => {
    slotCards.forEach((item) => {
      item.classList.remove("is-selected");
    });

    card.classList.add("is-selected");
    selectedSlot = getSelectedSlot();

    showToast(`${selectedSlot.name} обрано`);
  });
});

signalButton.addEventListener("click", () => {
  const verifiedSubId = sessionStorage.getItem(
    SUBID_STORAGE_KEY
  );

  if (verifiedSubId) {
    startSignalFlow();
    return;
  }

  openSubIdModal();
});

subIdInput.addEventListener("input", () => {
  subIdField.classList.remove("has-error");
  subIdMessage.innerHTML = "&nbsp;";
});

subIdForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (subIdVerifyButton.disabled) {
    return;
  }

  const subId = normalizeSubId(
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
});

subIdCloseButton.addEventListener("click", () => {
  closeSubIdModal();
});

subIdModalBackdrop.addEventListener("click", () => {
  closeSubIdModal();
});

signalBackButton.addEventListener("click", () => {
  closeSignalOverlay();
});

resultNewButton.addEventListener("click", () => {
  prepareScan(getSelectedSlot());
  runScan();
});

resultActionButton.addEventListener("click", () => {
  if (!activeSignal) {
    return;
  }

  const message =
    `Сигнал для ${activeSignal.slotName} активовано на ` +
    activeSignal.duration;

  closeSignalOverlay();

  window.setTimeout(() => {
    showToast(message);
  }, 240);
});

notificationButton.addEventListener("click", () => {
  showToast("Нових сповіщень поки немає");
});

allSlotsButton.addEventListener("click", () => {
  showToast("Повний каталог додамо пізніше");
});

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const sectionName = item.dataset.section;

    if (sectionName !== "Головна") {
      showToast(`Розділ «${sectionName}» готується`);
    }
  });
});

document.addEventListener("keydown", (event) => {
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
});

window.addEventListener("beforeunload", () => {
  window.clearTimeout(toastTimer);
  window.clearTimeout(subIdVerifyTimer);
  window.clearTimeout(subIdSuccessTimer);
  window.clearTimeout(subIdCloseTimer);
  stopScanning();
});
