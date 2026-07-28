"use strict";

if (sessionStorage.getItem("arbifyAccess") !== "granted") {
  window.location.replace("index.html");
}

const slotCards = document.querySelectorAll(".slot-card");
const signalCard = document.querySelector("#signalCard");
const signalButton = document.querySelector("#signalButton");
const signalButtonText = document.querySelector("#signalButtonText");
const signalTitle = document.querySelector("#signalTitle");
const signalDescription = document.querySelector("#signalDescription");
const notificationButton = document.querySelector("#notificationButton");
const allSlotsButton = document.querySelector("#allSlotsButton");
const navItems = document.querySelectorAll(".nav-item");
const toast = document.querySelector("#toast");
const toastText = document.querySelector("#toastText");

let toastTimer;
let scanTimer;

function showToast(message) {
  window.clearTimeout(toastTimer);

  toastText.textContent = message;
  toast.classList.add("is-visible");

  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2400);
}

slotCards.forEach((card) => {
  card.addEventListener("click", () => {
    slotCards.forEach((item) => {
      item.classList.remove("is-selected");
    });

    card.classList.add("is-selected");
    showToast(`${card.dataset.slot} обрано`);
  });
});

signalButton.addEventListener("click", () => {
  if (signalCard.classList.contains("is-scanning")) {
    return;
  }

  signalCard.classList.add("is-scanning");
  signalButton.disabled = true;
  signalButtonText.textContent = "ЗАЧЕКАЙ";
  signalTitle.textContent = "СКАНУВАННЯ...";
  signalDescription.textContent = "Аналізуємо вибраний слот";

  scanTimer = window.setTimeout(() => {
    signalCard.classList.remove("is-scanning");
    signalButton.disabled = false;
    signalButtonText.textContent = "ЗАПУСТИТИ";
    signalTitle.textContent = "НОВИЙ СИГНАЛ";
    signalDescription.textContent = "Запусти аналіз для вибраного слота";

    showToast("Модуль сигналів підключимо на наступному етапі");
  }, 1700);
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

window.addEventListener("beforeunload", () => {
  window.clearTimeout(toastTimer);
  window.clearTimeout(scanTimer);
});
