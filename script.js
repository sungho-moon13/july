const totalRounds = 5;
const maxStage = 10;
const recordKey = "capacityChallengeRecords";

// 용량은 모두 GB로 계산한다. 화면에는 읽기 쉬운 단위로 표시한다.
const rounds = [
  { capacity: 10000, label: "대형 서버", items: [
    ["4K 영화 묶음", 3200, "▶"], ["사진 아카이브", 1800, "▧"], ["게임 라이브러리", 2500, "◆"],
    ["문서 백업", 700, "▤"], ["음악 컬렉션", 900, "♫"], ["프로젝트 자료", 1400, "✦"], ["드론 영상", 1100, "●"], ["전자책", 250, "▤"]
  ]},
  { capacity: 7000, label: "외장 하드", items: [
    ["영상 편집본", 2600, "▶"], ["여행 사진", 1200, "▧"], ["게임 설치 파일", 2100, "◆"],
    ["수업 자료", 650, "▤"], ["음악 앨범", 800, "♫"], ["앱 자료", 950, "✦"], ["백업 파일", 1700, "●"], ["메모 모음", 300, "▤"]
  ]},
  { capacity: 5000, label: "클라우드 보관함", items: [
    ["영화 컬렉션", 1900, "▶"], ["사진 백업", 1100, "▧"], ["게임 자료", 1500, "◆"],
    ["문서 묶음", 450, "▤"], ["음악 파일", 700, "♫"], ["디자인 원본", 1250, "✦"], ["회의 영상", 900, "●"], ["텍스트 기록", 200, "▤"]
  ]},
  { capacity: 2000, label: "태블릿", items: [
    ["고화질 영상", 800, "▶"], ["사진 폴더", 500, "▧"], ["게임 하나", 700, "◆"],
    ["과제 자료", 180, "▤"], ["음악 모음", 240, "♫"], ["그림 파일", 360, "✦"], ["영화 한 편", 550, "●"], ["전자책 모음", 120, "▤"]
  ]},
  { capacity: 1000, label: "USB 저장장치", items: [
    ["영상 파일", 420, "▶"], ["사진 묶음", 280, "▧"], ["게임 파일", 390, "◆"],
    ["문서 폴더", 90, "▤"], ["음악 앨범", 150, "♫"], ["발표 자료", 210, "✦"], ["짧은 영상", 330, "●"], ["메모", 50, "▤"]
  ]}
];

const $ = (selector) => document.querySelector(selector);
const startScreen = $("#startScreen"), gameScreen = $("#gameScreen"), resultScreen = $("#resultScreen"), cardGrid = $("#cardGrid");
let stage = 1, round = 0, score = 0, chances = 3, selected = [], current = null, locked = false, timeLeft = 0, timerId = null;

function formatSize(gb) {
  if (gb >= 1000) return `${Number((gb / 1000).toFixed(2))}TB`;
  return `${gb}GB`;
}
function shuffle(list) { return [...list].sort(() => Math.random() - 0.5); }
function getRecords() {
  try { return JSON.parse(localStorage.getItem(recordKey)) || { bestScore: 0, bestStage: 1, recent: [] }; }
  catch { return { bestScore: 0, bestStage: 1, recent: [] }; }
}
function updateRecordDisplay() {
  const records = getRecords();
  $("#bestScoreText").textContent = `${records.bestScore}점`;
  $("#bestStageText").textContent = `${records.bestStage}단계`;
}
function saveRecord(failed) {
  const records = getRecords(), isNewScore = score > records.bestScore, isNewStage = stage > records.bestStage;
  records.bestScore = Math.max(records.bestScore, score); records.bestStage = Math.max(records.bestStage, stage);
  records.recent = [{ score, stage, success: !failed }, ...records.recent].slice(0, 5);
  try { localStorage.setItem(recordKey, JSON.stringify(records)); } catch { /* 저장이 막혀도 플레이는 계속 */ }
  return { isNewScore, isNewStage };
}
function showScreen(screen) { [startScreen, gameScreen, resultScreen].forEach((item) => item.classList.add("is-hidden")); screen.classList.remove("is-hidden"); }
function resetState(resetStage = true) {
  if (timerId) clearInterval(timerId); timerId = null;
  $("#dangerOverlay").classList.remove("is-active"); $("#particleLayer").replaceChildren();
  if (resetStage) stage = 1; round = 0; score = resetStage ? 0 : score; chances = 3; selected = []; current = null; locked = false; resultScreen.classList.remove("failed");
}
function startGame() { resetState(true); showScreen(gameScreen); nextRound(); }
function startNextStage() { if (stage >= maxStage) return startGame(); stage += 1; resetState(false); showScreen(gameScreen); nextRound(); }
function getChallenge(base) {
  const capacityFactor = 1 + (stage - 1) * 0.035;
  const changedItems = base.items.map((item, index) => {
    // 스테이지가 바뀔 때마다 카드 용량을 조금씩 다르게 만들어 암기만으로 풀 수 없게 한다.
    const stageFactor = 1 + (stage - 1) * 0.045;
    const cardVariation = 1 + ((index % 4) - 1.5) * 0.018 * Math.max(1, stage - 1);
    return [item[0], Math.max(10, Math.round(item[1] * stageFactor * cardVariation)), item[2]];
  });
  const changedCapacity = Math.round(base.capacity * capacityFactor);
  const extra = [
    ["압축 백업", Math.round(changedCapacity * 0.17), "◈"],
    ["원본 데이터", Math.round(changedCapacity * 0.21), "◉"],
    ["연구 자료", Math.round(changedCapacity * 0.14), "◇"],
    ["장기 보관 파일", Math.round(changedCapacity * 0.26), "◎"]
  ];
  const extraCount = stage < 3 ? 0 : stage < 6 ? 2 : stage < 9 ? 3 : 4;
  return { ...base, capacity: changedCapacity, items: [...changedItems, ...extra.slice(0, extraCount)] };
}
function getUsed() { return selected.reduce((sum, index) => sum + current.items[index][1], 0); }
function updateBoard() {
  const used = getUsed(), remaining = current ? current.capacity - used : 0;
  $("#scoreText").textContent = `${score}점`; $("#chanceText").textContent = "♥".repeat(chances) + "♡".repeat(3 - chances);
  $("#timerText").textContent = `${timeLeft}초`; $("#timerText").classList.toggle("is-urgent", timeLeft <= 5); $("#dangerOverlay").classList.toggle("is-active", timeLeft > 0 && timeLeft <= 5);
  $("#selectedText").textContent = `${selected.length}개`; $("#storageMessage").textContent = remaining >= 0 ? formatSize(remaining) : "초과했어요";
  $("#storageFill").style.width = `${Math.min(100, Math.max(0, used / current.capacity * 100))}%`;
}
function nextRound() {
  if (round >= totalRounds) return endGame(`스테이지 ${stage} 클리어!`, "용량 안에 물건을 알뜰하게 담아 전달했어요.", false);
  if (timerId) clearInterval(timerId); locked = false; selected = []; current = getChallenge(rounds[round % rounds.length]); round += 1;
  $("#stageLabel").textContent = `STAGE ${String(stage).padStart(2, "0")}`; $("#roundText").textContent = `${String(round).padStart(2, "0")} / ${String(totalRounds).padStart(2, "0")}`;
  $("#deviceTypeText").textContent = current.label; $("#deviceCapacityText").textContent = formatSize(current.capacity);
  // 초반부터 여유가 많지 않고, 스테이지가 오를수록 빠르게 판단해야 한다.
  timeLeft = Math.max(8, 16 - stage); $("#gameMessage").textContent = `스테이지 ${stage} · ${current.items.length}개 중 최적의 조합을 찾아보세요. (${timeLeft}초)`; $("#deliverButton").disabled = false; renderCards(); updateBoard();
  timerId = setInterval(() => { if (locked) return; timeLeft -= 1; updateBoard(); if (timeLeft <= 0) { clearInterval(timerId); timerId = null; locked = true; endGame("시간 초과!", "시간 안에 최적의 조합을 완성하지 못했어요.", true); } }, 1000);
}
function renderCards() {
  cardGrid.innerHTML = shuffle(current.items.map((item, index) => ({ item, index }))).map(({ item, index }) => `
    <button class="capacity-card" type="button" data-index="${index}"><span class="file-icon" aria-hidden="true">${item[2]}</span><span class="file-name">${item[0]}</span><strong class="file-size">${formatSize(item[1])}</strong></button>`).join("");
  cardGrid.querySelectorAll(".capacity-card").forEach((button) => button.addEventListener("click", () => toggleCard(Number(button.dataset.index), button)));
}
function toggleCard(index, button) {
  if (locked) return;
  const position = selected.indexOf(index), nextUsed = getUsed() + (position >= 0 ? -current.items[index][1] : current.items[index][1]);
  if (position < 0 && nextUsed > current.capacity) { button.classList.add("is-wrong"); $("#gameMessage").textContent = "용량을 초과해요! 다른 물건을 골라보세요."; setTimeout(() => button.classList.remove("is-wrong"), 350); return; }
  if (position >= 0) { selected.splice(position, 1); button.classList.remove("is-selected"); } else { selected.push(index); button.classList.add("is-selected"); }
  $("#gameMessage").textContent = selected.length ? `${selected.length}개를 담았어요. 남은 용량을 확인하세요.` : "물건을 여러 개 선택한 뒤 전달하기를 눌러보세요."; updateBoard();
}
function optimalCount() {
  let best = 0;
  for (let mask = 0; mask < (1 << current.items.length); mask += 1) { let used = 0, count = 0; current.items.forEach((item, i) => { if (mask & (1 << i)) { used += item[1]; count += 1; } }); if (used <= current.capacity) best = Math.max(best, count); }
  return best;
}
function deliver() {
  if (locked || !selected.length) { $("#gameMessage").textContent = "최소 한 개의 물건을 담아야 해요."; return; }
  locked = true; if (timerId) { clearInterval(timerId); timerId = null; } const best = optimalCount(), count = selected.length;
  if (count === best) {
    score += count * 10 + Math.round(getUsed() / current.capacity * 10);
    $("#gameMessage").textContent = `비교 결과: ${count}개 / 최대 ${best}개 · 완벽해요! 다음 라운드로 이동합니다.`;
    cardGrid.querySelectorAll(".capacity-card").forEach((card) => { if (card.classList.contains("is-selected")) card.classList.add("is-correct"); });
    updateBoard(); createParticles(); setTimeout(nextRound, 1400);
  } else {
    chances -= 1; $("#gameMessage").textContent = `비교 결과: ${count}개 / 최대 ${best}개 · ${best - count}개 더 담을 수 있었어요.`; updateBoard();
    if (chances <= 0) setTimeout(() => endGame("전달 실패", `최대 ${best}개까지 담을 수 있었지만 기회를 모두 사용했어요.`, true), 1200);
    else setTimeout(() => { locked = false; selected = []; timeLeft = Math.max(8, 16 - stage); renderCards(); updateBoard(); timerId = setInterval(() => { if (locked) return; timeLeft -= 1; updateBoard(); if (timeLeft <= 0) { clearInterval(timerId); timerId = null; locked = true; endGame("시간 초과!", "시간 안에 최적의 조합을 완성하지 못했어요.", true); } }, 1000); }, 1200);
  }
}
function createParticles() {
  const layer = $("#particleLayer"); layer.replaceChildren();
  const colors = ["#5276f5", "#42b889", "#ffb44a", "#f36c82", "#8f75ed"];
  for (let i = 0; i < 28; i += 1) {
    const particle = document.createElement("i"); particle.className = "particle"; particle.style.setProperty("--x", `${Math.round(Math.cos(i / 28 * Math.PI * 2) * (90 + Math.random() * 125))}px`); particle.style.setProperty("--y", `${Math.round(Math.sin(i / 28 * Math.PI * 2) * (100 + Math.random() * 130))}px`); particle.style.setProperty("--rotate", `${Math.round(Math.random() * 720 - 360)}deg`); particle.style.setProperty("--particle-color", colors[i % colors.length]); particle.style.animationDelay = `${Math.random() * 130}ms`; layer.appendChild(particle);
  }
}
function endGame(title, copy, failed) {
  const record = saveRecord(failed); $("#resultTitle").textContent = title; $("#resultCopy").textContent = copy; $("#finalScore").textContent = `${score}점`; $("#resultIcon").textContent = failed ? "!" : "✓"; resultScreen.classList.toggle("failed", failed);
  $("#resultSummary").textContent = `${round - (failed ? 0 : 0)}라운드 진행 · ${chances}번의 기회가 남았어요`;
  $("#recordResult").textContent = record.isNewScore || record.isNewStage ? "🎉 신기록 달성! 기록이 저장됐어요." : `최고 점수 ${getRecords().bestScore}점 · 최고 ${getRecords().bestStage}스테이지`;
  $("#retryButton").textContent = failed ? "다시 도전 ↻" : stage >= maxStage ? "처음부터 다시 ↻" : `다음 스테이지 도전 →`; $("#retryButton").onclick = failed ? () => { resetState(false); showScreen(gameScreen); nextRound(); } : stage >= maxStage ? startGame : startNextStage; showScreen(resultScreen);
}
$("#startButton").addEventListener("click", startGame); $("#resetButton").addEventListener("click", startGame); $("#deliverButton").addEventListener("click", deliver);
$("#homeButton").addEventListener("click", () => { resetState(true); updateRecordDisplay(); showScreen(startScreen); }); $("#resultHomeButton").addEventListener("click", () => { resetState(true); updateRecordDisplay(); showScreen(startScreen); }); updateRecordDisplay();
