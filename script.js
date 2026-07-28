const accessForm = document.querySelector("#accessForm");
const accessPanel = document.querySelector("#accessPanel");
const successPanel = document.querySelector("#successPanel");
const accessKey = document.querySelector("#accessKey");
const accessButton = document.querySelector("#accessButton");
const keyField = document.querySelector("#keyField");
const keyLength = document.querySelector("#keyLength");
const formMessage = document.querySelector("#formMessage");
const resetButton = document.querySelector("#resetButton");
const supportButton = document.querySelector("#supportButton");
const supportPopover = document.querySelector("#supportPopover");

let verificationTimer;

accessKey.addEventListener("input", () => {
  const length = accessKey.value.length;
  keyLength.textContent = length ? `${length}/32` : "";
  keyField.classList.remove("has-error");
  formMessage.innerHTML = "&nbsp;";
});

accessForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const key = accessKey.value.trim();

  if (key.length < 6) {
    keyField.classList.remove("has-error");
    void keyField.offsetWidth;
    keyField.classList.add("has-error");
    formMessage.textContent =
      "Введи коректний ключ — щонайменше 6 символів";
    accessKey.focus();
    return;
  }

  accessButton.disabled = true;
  accessButton.innerHTML =
    '<span class="button-loader"></span><span>ПЕРЕВІРЯЄМО КЛЮЧ</span>';
  supportPopover.hidden = true;
  supportButton.setAttribute("aria-expanded", "false");

  clearTimeout(verificationTimer);
  verificationTimer = setTimeout(() => {
    accessPanel.hidden = true;
    successPanel.hidden = false;
  }, 1450);
});

resetButton.addEventListener("click", () => {
  clearTimeout(verificationTimer);
  accessKey.value = "";
  keyLength.textContent = "";
  formMessage.innerHTML = "&nbsp;";
  keyField.classList.remove("has-error");
  accessButton.disabled = false;
  accessButton.innerHTML = `
    <span class="button-sheen"></span>
    <span class="button-label">УВІЙТИ</span>
  `;
  successPanel.hidden = true;
  accessPanel.hidden = false;
  accessKey.focus();
});

supportButton.addEventListener("click", () => {
  const willOpen = supportPopover.hidden;
  supportPopover.hidden = !willOpen;
  supportButton.setAttribute("aria-expanded", String(willOpen));
});
