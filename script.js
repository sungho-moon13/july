const bits = [
  { id: 1, value: 0 },
  { id: 2, value: 1 },
  { id: 3, value: 0 },
  { id: 4, value: 1 },
  { id: 5, value: 1 },
  { id: 6, value: 0 },
  { id: 7, value: 1 },
  { id: 8, value: 0 },
];

const bitList = document.querySelector("#bitList");
const slotGrid = document.querySelector("#slotGrid");
const byteBox = document.querySelector("#byteBox");
const progressText = document.querySelector("#progressText");
const progressFill = document.querySelector("#progressFill");
const message = document.querySelector("#message");
const resetButton = document.querySelector("#resetButton");

let filledBits = [];

function renderBits() {
  bitList.innerHTML = "";

  bits.forEach((bit) => {
    const button = document.createElement("button");
    button.className = "bit-chip";
    button.type = "button";
    button.dataset.id = bit.id;
    button.draggable = true;
    button.innerHTML = `<strong>${bit.value}</strong><span>조각(bit)</span>`;
    button.addEventListener("click", () => moveBit(bit));
    button.addEventListener("dragstart", (event) => startDrag(event, bit));
    button.addEventListener("dragend", () => button.classList.remove("is-dragging"));
    bitList.appendChild(button);
  });
}

function renderSlots() {
  slotGrid.innerHTML = "";

  for (let index = 0; index < 8; index += 1) {
    const slot = document.createElement("div");
    slot.className = "slot";

    if (filledBits[index]) {
      slot.classList.add("is-filled");
      slot.innerHTML = `<strong>${filledBits[index].value}</strong>`;
    } else {
      slot.textContent = `${index + 1}`;
    }

    slotGrid.appendChild(slot);
  }
}

function moveBit(bit) {
  if (filledBits.some((filledBit) => filledBit.id === bit.id)) {
    return;
  }

  filledBits.push(bit);

  const chip = bitList.querySelector(`[data-id="${bit.id}"]`);
  chip.classList.add("is-used");

  renderSlots();
  updateProgress();
}

function startDrag(event, bit) {
  event.currentTarget.classList.add("is-dragging");
  event.dataTransfer.setData("text/plain", String(bit.id));
  event.dataTransfer.effectAllowed = "move";
}

function allowDrop(event) {
  event.preventDefault();
  byteBox.classList.add("is-drop-ready");
  event.dataTransfer.dropEffect = "move";
}

function finishDrop(event) {
  event.preventDefault();
  byteBox.classList.remove("is-drop-ready");

  const bitId = Number(event.dataTransfer.getData("text/plain"));
  const bit = bits.find((item) => item.id === bitId);

  if (bit) {
    moveBit(bit);
  }
}

function updateProgress() {
  const count = filledBits.length;
  progressText.textContent = `${count} / 8 bit`;
  progressFill.style.width = `${(count / 8) * 100}%`;

  if (count === 0) {
    message.textContent = "bit 조각을 눌러 byte 상자로 옮겨보세요.";
  } else if (count < 8) {
    message.textContent = `좋아요. bit 조각 ${8 - count}개를 더 넣으면 byte 상자가 완성됩니다.`;
  } else {
    message.textContent = "byte 상자가 완성되었습니다. bit 8개가 모이면 byte 1개가 됩니다.";
  }
}

function resetStage() {
  filledBits = [];
  renderBits();
  renderSlots();
  updateProgress();
}

resetButton.addEventListener("click", resetStage);
byteBox.addEventListener("dragover", allowDrop);
byteBox.addEventListener("dragleave", () => byteBox.classList.remove("is-drop-ready"));
byteBox.addEventListener("drop", finishDrop);

resetStage();
