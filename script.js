const pointsPerItem = 10;
const comboWindowMs = 3000;
const totalStorageGb = 32;
const startingUsedGb = 21.5;
const maxActiveItems = 12;

const itemBank = [
  { id: "photo-important", kind: "photo", label: "가족 사진", size: 0.4, action: "keep" },
  { id: "photo-duplicate", kind: "photo", label: "중복 사진", size: 1.8, action: "delete" },
  { id: "video-trip", kind: "video", label: "여행 영상", size: 3.6, action: "backup" },
  { id: "cache-game", kind: "cache", label: "앱 캐시", size: 2.1, action: "delete" },
  { id: "doc-homework", kind: "doc", label: "숙제 파일", size: 0.2, action: "keep" },
  { id: "music-album", kind: "music", label: "음악 앨범", size: 1.4, action: "backup" },
  { id: "download-old", kind: "download", label: "다운로드", size: 1.1, action: "delete" },
  { id: "screenshot-old", kind: "photo", label: "지난 캡처", size: 0.7, action: "delete" },
  { id: "pet-photo", kind: "photo", label: "동물 사진", size: 0.5, action: "keep" },
  { id: "movie-clip", kind: "video", label: "긴 동영상", size: 4.2, action: "backup" },
  { id: "contact-backup", kind: "contact", label: "연락처", size: 0.1, action: "keep" },
  { id: "unused-app", kind: "app", label: "안 쓰는 앱", size: 2.8, action: "delete" },
  { id: "live-photo", kind: "photo", label: "새 사진", size: 0.9, action: "backup" },
  { id: "messenger-files", kind: "file", label: "메신저 파일", size: 1.3, action: "delete" },
  { id: "school-pdf", kind: "pdf", label: "수업 자료", size: 0.3, action: "keep" },
  { id: "screen-recording", kind: "video", label: "화면 녹화", size: 2.7, action: "backup" },
];

const itemGrid = document.querySelector("#itemGrid");
const phoneScreen = document.querySelector(".phone-screen");
const phoneMeter = document.querySelector(".phone-meter");
const timeText = document.querySelector("#timeText");
const scoreText = document.querySelector("#scoreText");
const comboText = document.querySelector("#comboText");
const levelText = document.querySelector("#levelText");
const storageText = document.querySelector("#storageText");
const storageFill = document.querySelector("#storageFill");
const incomingText = document.querySelector("#incomingText");
const keepCount = document.querySelector("#keepCount");
const backupCount = document.querySelector("#backupCount");
const deleteCount = document.querySelector("#deleteCount");
const message = document.querySelector("#message");
const startButton = document.querySelector("#startButton");
const resetButton = document.querySelector("#resetButton");
const dropBoxes = document.querySelectorAll(".drop-box");

let items = [];
let score = 0;
let combo = 0;
let sorted = {
  keep: 0,
  backup: 0,
  delete: 0,
};
let currentUsedGb = startingUsedGb;
let elapsedSeconds = 0;
let difficultyLevel = 1;
let itemSequence = 0;
let gameTimerId = null;
let spawnTimerId = null;
let comboTimerId = null;
let isPlaying = false;
let hasEnded = false;
let activeDrag = null;

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

function randomBetween(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

function formatGb(value) {
  return `${value.toFixed(1).replace(".0", "")}GB`;
}

function getKindLabel(kind) {
  const labels = {
    app: "APP",
    cache: "TMP",
    contact: "ID",
    doc: "DOC",
    download: "DL",
    file: "FILE",
    music: "♪",
    pdf: "PDF",
    photo: "IMG",
    video: "▶",
  };

  return labels[kind] || "FILE";
}

function getActionLabel(action) {
  const labels = {
    backup: "백업",
    delete: "삭제",
    keep: "보관",
  };

  return labels[action] || "";
}

function getActionGuide(action) {
  const guides = {
    backup: "큰 파일",
    delete: "필요 없음",
    keep: "중요함",
  };

  return guides[action] || "";
}

function getSpawnDelay() {
  const baseDelay = Math.max(1000, 2200 - difficultyLevel * 200);
  return isStorageEmpty() ? Math.max(650, baseDelay - 450) : baseDelay;
}

function getIncomingCount() {
  const emptyStorageBonus = isStorageEmpty() ? 1 : 0;

  if (difficultyLevel >= 9) {
    return 3 + emptyStorageBonus;
  }

  if (difficultyLevel >= 5) {
    return 2 + emptyStorageBonus;
  }

  return 1 + emptyStorageBonus;
}

function isStorageEmpty() {
  return currentUsedGb <= 0.05;
}

function createIncomingItem() {
  const template = itemBank[randomBetween(0, itemBank.length - 1)];
  itemSequence += 1;

  return {
    ...template,
    id: `${template.id}-${Date.now()}-${itemSequence}`,
    sorted: false,
    x: randomBetween(3, 74),
    y: randomBetween(4, 70),
    rotation: randomBetween(-16, 16),
    layer: itemSequence,
    isNew: true,
  };
}

function scatterItems(list) {
  return shuffle(list).map((item, index) => ({
    ...item,
    x: item.sorted ? item.x : randomBetween(3, 74),
    y: item.sorted ? item.y : randomBetween(4, 70),
    rotation: item.sorted ? item.rotation : randomBetween(-16, 16),
    layer: item.sorted ? item.layer : itemSequence + index,
  }));
}

function resetGame() {
  items = [];
  score = 0;
  combo = 0;
  sorted = {
    keep: 0,
    backup: 0,
    delete: 0,
  };
  currentUsedGb = startingUsedGb;
  elapsedSeconds = 0;
  difficultyLevel = 1;
  itemSequence = 0;
  isPlaying = false;
  hasEnded = false;

  clearInterval(gameTimerId);
  clearTimeout(spawnTimerId);
  clearTimeout(comboTimerId);
  gameTimerId = null;
  spawnTimerId = null;
  comboTimerId = null;
  cleanupPointerDrag();
  startButton.disabled = false;
  startButton.textContent = "시작";
  message.textContent = "시작 버튼을 누르면 파일이 실시간으로 들어옵니다.";

  renderItems();
  updateScoreboard();
}

function startGame() {
  if (isPlaying || hasEnded) {
    return;
  }

  isPlaying = true;
  startButton.disabled = true;
  startButton.textContent = "진행 중";
  message.textContent = "파일이 들어오고 있어요. 폰 용량이 꽉 차기 전에 정리하세요.";

  spawnItems(2);
  scheduleNextSpawn();

  gameTimerId = setInterval(() => {
    elapsedSeconds += 1;
    difficultyLevel = Math.floor(elapsedSeconds / 25) + 1;
    currentUsedGb = Math.min(totalStorageGb, currentUsedGb + 0.035 + difficultyLevel * 0.008);
    updateScoreboard();

    if (currentUsedGb >= totalStorageGb) {
      endGame("저장공간이 꽉 찼어요! 다시 도전해서 더 오래 버텨보세요.");
    }
  }, 1000);
}

function endGame(endMessage) {
  isPlaying = false;
  hasEnded = true;
  clearInterval(gameTimerId);
  clearTimeout(spawnTimerId);
  clearTimeout(comboTimerId);
  gameTimerId = null;
  spawnTimerId = null;
  comboTimerId = null;
  cleanupPointerDrag();
  startButton.disabled = false;
  startButton.textContent = "다시 도전";
  message.textContent = endMessage;
  renderItems();
}

function scheduleNextSpawn() {
  clearTimeout(spawnTimerId);

  if (!isPlaying) {
    return;
  }

  spawnTimerId = setTimeout(() => {
    spawnItems(getIncomingCount());
    scheduleNextSpawn();
  }, getSpawnDelay());
}

function spawnItems(count) {
  const availableSlots = maxActiveItems - items.length;
  const spawnCount = Math.min(count, availableSlots);

  if (spawnCount <= 0) {
    currentUsedGb = Math.min(totalStorageGb, currentUsedGb + 0.35);
    message.textContent = "정리할 파일이 너무 많이 쌓였어요. 서둘러 정리하세요!";
    updateScoreboard();
    return;
  }

  const incomingItems = Array.from({ length: spawnCount }, createIncomingItem);
  items = [...items, ...incomingItems];
  currentUsedGb = Math.min(
    totalStorageGb,
    currentUsedGb + incomingItems.reduce((total, item) => total + item.size * 0.18, 0),
  );
  message.textContent = `${spawnCount}개의 새 파일이 들어왔어요.`;

  if (!activeDrag) {
    renderItems();
    triggerIncomingEffect();
  }

  updateScoreboard();
}

function renderItems() {
  itemGrid.innerHTML = "";

  items.forEach((item) => {
    const button = document.createElement("button");
    button.className = "item-card";
    button.type = "button";
    button.draggable = false;
    button.dataset.id = item.id;
    button.dataset.action = item.action;
    button.dataset.kind = item.kind;
    button.style.setProperty("--x", `${item.x}%`);
    button.style.setProperty("--y", `${item.y}%`);
    button.style.setProperty("--r", `${item.rotation}deg`);
    button.style.zIndex = item.layer;
    
    if (item.isNew) {
      button.classList.add("is-new");
      item.isNew = false;
    }

    button.innerHTML = `
      <i class="file-art" data-kind="${item.kind}" aria-hidden="true">
        <b>${getKindLabel(item.kind)}</b>
      </i>
      <mark class="action-badge" data-action="${item.action}">${getActionLabel(item.action)}</mark>
      <span>${item.label}</span>
      <em>${formatGb(item.size)} · ${getActionGuide(item.action)}</em>
    `;

    button.addEventListener("pointerdown", (event) => startPointerDrag(event, item));
    itemGrid.appendChild(button);
  });
}

function startPointerDrag(event, item) {
  if (!isPlaying) {
    event.preventDefault();
    message.textContent = "먼저 시작 버튼을 눌러주세요.";
    return;
  }

  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();

  activeDrag = {
    itemId: item.id,
    element: card,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
  };

  card.setPointerCapture(event.pointerId);
  card.classList.add("is-dragging");
  card.style.width = `${rect.width}px`;
  card.style.height = `${rect.height}px`;
  card.style.left = `${rect.left}px`;
  card.style.top = `${rect.top}px`;
  card.style.zIndex = 1000;
  message.textContent = `${item.label}은 ${getActionLabel(item.action)}함에 넣으면 됩니다.`;

  movePointerDrag(event);
  card.addEventListener("pointermove", movePointerDrag);
  card.addEventListener("pointerup", finishPointerDrag);
  card.addEventListener("pointercancel", cancelPointerDrag);
}

function movePointerDrag(event) {
  if (!activeDrag) {
    return;
  }

  event.preventDefault();
  activeDrag.element.style.left = `${event.clientX - activeDrag.offsetX}px`;
  activeDrag.element.style.top = `${event.clientY - activeDrag.offsetY}px`;
  highlightDropBox(event.clientX, event.clientY);
}

function finishPointerDrag(event) {
  if (!activeDrag) {
    return;
  }

  event.preventDefault();
  const drag = activeDrag;
  const targetBox = findDropBoxAt(event.clientX, event.clientY);
  cleanupPointerDrag();

  if (targetBox) {
    sortItem(drag.itemId, targetBox.dataset.action);
  } else {
    message.textContent = "정리 상자 안에 놓아야 합니다.";
    renderItems();
  }
}

function cancelPointerDrag() {
  cleanupPointerDrag();
  renderItems();
}

function cleanupPointerDrag() {
  if (!activeDrag) {
    return;
  }

  const card = activeDrag.element;
  card.classList.remove("is-dragging");
  card.removeEventListener("pointermove", movePointerDrag);
  card.removeEventListener("pointerup", finishPointerDrag);
  card.removeEventListener("pointercancel", cancelPointerDrag);
  dropBoxes.forEach((box) => box.classList.remove("is-ready"));
  activeDrag = null;
}

function findDropBoxAt(clientX, clientY) {
  if (activeDrag) {
    activeDrag.element.style.pointerEvents = "none";
  }

  const target = document.elementFromPoint(clientX, clientY);

  if (activeDrag) {
    activeDrag.element.style.pointerEvents = "";
  }

  return target ? target.closest(".drop-box") : null;
}

function highlightDropBox(clientX, clientY) {
  const targetBox = findDropBoxAt(clientX, clientY);

  dropBoxes.forEach((box) => {
    box.classList.toggle("is-ready", box === targetBox);
  });
}

function sortItem(itemId, targetAction) {
  if (!isPlaying) {
    message.textContent = "먼저 시작 버튼을 눌러주세요.";
    return;
  }

  const item = findItem(itemId);

  if (!item) {
    return;
  }

  const targetBox = document.querySelector(`[data-action="${targetAction}"]`);
  const isCorrect = item.action === targetAction;

  if (isCorrect) {
    items = items.filter((currentItem) => currentItem.id !== itemId);
    combo += 1;
    sorted[targetAction] += 1;
    score += pointsPerItem + Math.max(0, combo - 1) * 3 + difficultyLevel;

    if (targetAction === "backup" || targetAction === "delete") {
      currentUsedGb = Math.max(0, currentUsedGb - item.size);
    }

    targetBox.classList.add("is-correct");
    createDropEffect(targetBox, "good", `+${pointsPerItem}`);
    createSparkles(targetBox);
    triggerScreenEffect("is-success");
    message.textContent = `정리 성공! ${item.label} 처리 완료. 콤보 ${combo}!`;
    scheduleComboReset();
  } else {
    resetCombo();
    targetBox.classList.add("is-wrong");
    createDropEffect(targetBox, "bad", "틀림");
    triggerScreenEffect("is-mistake");
    currentUsedGb = Math.min(totalStorageGb, currentUsedGb + 0.35);
    message.textContent = `${item.label}은 ${getActionLabel(item.action)}함이 정답이에요. 다시 골라보세요.`;
    items = scatterItems(items);
  }

  setTimeout(() => {
    targetBox.classList.remove("is-correct", "is-wrong");
  }, 280);

  renderItems();
  updateScoreboard();
}

function scheduleComboReset() {
  clearTimeout(comboTimerId);
  comboTimerId = setTimeout(() => {
    resetCombo();
    updateScoreboard();

    if (isPlaying) {
      message.textContent = "잠깐 멈춰서 콤보가 끊겼어요. 다시 연속으로 정리해보세요.";
    }
  }, comboWindowMs);
}

function resetCombo() {
  combo = 0;
  clearTimeout(comboTimerId);
  comboTimerId = null;
}

function findItem(itemId) {
  return items.find((item) => item.id === itemId);
}

function triggerScreenEffect(className) {
  phoneScreen.classList.remove(className);
  window.requestAnimationFrame(() => {
    phoneScreen.classList.add(className);
    setTimeout(() => phoneScreen.classList.remove(className), 420);
  });
}

function triggerIncomingEffect() {
  itemGrid.classList.remove("is-incoming");
  phoneScreen.classList.remove("is-incoming");

  window.requestAnimationFrame(() => {
    itemGrid.classList.add("is-incoming");
    phoneScreen.classList.add("is-incoming");
    setTimeout(() => {
      itemGrid.classList.remove("is-incoming");
      phoneScreen.classList.remove("is-incoming");
    }, 520);
  });
}

function createDropEffect(targetBox, type, text) {
  const effect = document.createElement("span");
  effect.className = `effect-pop ${type}`;
  effect.textContent = text;
  targetBox.appendChild(effect);
  setTimeout(() => effect.remove(), 700);
}

function createSparkles(targetBox) {
  for (let index = 0; index < 6; index += 1) {
    const sparkle = document.createElement("span");
    sparkle.className = "spark";
    sparkle.style.setProperty("--dx", `${randomBetween(-34, 34)}px`);
    sparkle.style.setProperty("--dy", `${randomBetween(-38, -14)}px`);
    sparkle.style.setProperty("--delay", `${index * 28}ms`);
    targetBox.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 650);
  }
}

function updateScoreboard() {
  const usedPercent = Math.min(100, (currentUsedGb / totalStorageGb) * 100);

  phoneScreen.classList.toggle("is-danger", usedPercent >= 88);
  phoneScreen.classList.toggle("is-critical", usedPercent >= 96);
  phoneMeter.classList.toggle("is-danger", usedPercent >= 88);
  phoneMeter.classList.toggle("is-critical", usedPercent >= 96);
  timeText.textContent = `${elapsedSeconds}초`;
  scoreText.textContent = `${score}점`;
  comboText.textContent = `${combo}`;
  levelText.textContent = `${difficultyLevel}단계`;
  storageText.textContent = `${formatGb(currentUsedGb)} / ${formatGb(totalStorageGb)} 사용 중`;
  storageFill.style.width = `${usedPercent}%`;
  if (usedPercent >= 96) {
    incomingText.textContent = "위험! 저장공간이 거의 꽉 찼습니다.";
  } else if (usedPercent >= 88) {
    incomingText.textContent = "주의! 저장공간이 얼마 남지 않았습니다.";
  } else if (isStorageEmpty()) {
    incomingText.textContent = "0GB! 새 파일이 더 빠르게 들어옵니다.";
  } else {
    incomingText.textContent = `${Math.round(getSpawnDelay() / 100) / 10}초마다 ${getIncomingCount()}개씩 파일이 들어옵니다.`;
  }

  keepCount.textContent = `${sorted.keep}개`;
  backupCount.textContent = `${sorted.backup}개`;
  deleteCount.textContent = `${sorted.delete}개`;
}

function handleMainButton() {
  if (hasEnded) {
    resetGame();
    return;
  }

  startGame();
}

startButton.addEventListener("click", handleMainButton);
resetButton.addEventListener("click", resetGame);

dropBoxes.forEach((box) => {
  box.addEventListener("dragleave", () => box.classList.remove("is-ready"));
});

resetGame();
