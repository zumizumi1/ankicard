const sampleCardsText = `apple,りんご,英単語,果物のappleは可算名詞です
book,本,英単語,動詞では「予約する」という意味もあります
beautiful,美しい,形容詞,人にも景色にも使えます
remember,覚える,動詞,remember to doは「忘れずにする」です
question,質問,名詞,動詞では「疑問を持つ」という意味になります`;

const storageKey = "flashcard-list-v1";

const elements = {
  flashcard: document.querySelector("#flashcard"),
  questionText: document.querySelector("#question-text"),
  answerText: document.querySelector("#answer-text"),
  frontCategory: document.querySelector("#front-category"),
  backCategory: document.querySelector("#back-category"),
  triviaBlock: document.querySelector("#trivia-block"),
  triviaText: document.querySelector("#trivia-text"),
  currentNumber: document.querySelector("#current-number"),
  totalNumber: document.querySelector("#total-number"),
  categoryFilter: document.querySelector("#category-filter"),
  wordList: document.querySelector("#word-list"),
  wordListCount: document.querySelector("#word-list-count"),
  prevCard: document.querySelector("#prev-card"),
  nextCard: document.querySelector("#next-card"),
  randomCard: document.querySelector("#random-card"),
  cardInput: document.querySelector("#card-input"),
  loadCards: document.querySelector("#load-cards"),
  resetSample: document.querySelector("#reset-sample"),
  statusMessage: document.querySelector("#status-message"),
};

let cards = [];
let visibleCards = [];
let currentIndex = 0;
let currentCategory = "all";

function formatCards(cardList) {
  return cardList
    .map((card) =>
      [card.question, card.answer, card.category, card.trivia]
        .map((value) => String(value ?? "").replace(/\s+/g, " ").trim())
        .join("\t"),
    )
    .join("\n");
}

function getDefaultCardsText() {
  if (Array.isArray(window.defaultCards) && window.defaultCards.length > 0) {
    return formatCards(window.defaultCards);
  }

  return sampleCardsText;
}

function getInitialCategory() {
  return new URLSearchParams(window.location.search).get("category") || "all";
}

function parseCards(rawText) {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.includes("\t") ? "\t" : ",";
      const [question, answer, category, ...triviaParts] = line.split(separator);

      return {
        question: question?.trim() ?? "",
        answer: answer?.trim() ?? "",
        category: category?.trim() || "未分類",
        trivia: triviaParts.join(separator).trim(),
      };
    })
    .filter((card) => card.question && card.answer);
}

function getCategories() {
  return [...new Set(cards.map((card) => card.category))].sort((a, b) =>
    a.localeCompare(b, "ja"),
  );
}

function updateCategoryFilter() {
  const categories = getCategories();
  elements.categoryFilter.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = `すべて (${cards.length})`;
  elements.categoryFilter.append(allOption);

  categories.forEach((category) => {
    const option = document.createElement("option");
    const count = cards.filter((card) => card.category === category).length;
    option.value = category;
    option.textContent = `${category} (${count})`;
    elements.categoryFilter.append(option);
  });

  if (!categories.includes(currentCategory)) {
    currentCategory = "all";
  }

  elements.categoryFilter.value = currentCategory;
}

function applyCategoryFilter() {
  visibleCards =
    currentCategory === "all"
      ? [...cards]
      : cards.filter((card) => card.category === currentCategory);
  currentIndex = 0;
  updateWordList();
  updateCard();
}

function updateCard() {
  const card = visibleCards[currentIndex];
  elements.flashcard.classList.remove("is-flipped");

  if (!card) {
    elements.questionText.textContent = "単語を入力してください";
    elements.answerText.textContent = "";
    elements.frontCategory.textContent = "";
    elements.backCategory.textContent = "";
    elements.triviaText.textContent = "";
    elements.triviaBlock.hidden = true;
    elements.currentNumber.textContent = "0";
    elements.totalNumber.textContent = "0";
    return;
  }

  elements.questionText.textContent = card.question;
  elements.answerText.textContent = card.answer;
  elements.frontCategory.textContent = card.category;
  elements.backCategory.textContent = card.category;
  elements.triviaText.textContent = card.trivia;
  elements.triviaBlock.hidden = !card.trivia;
  elements.currentNumber.textContent = String(currentIndex + 1);
  elements.totalNumber.textContent = String(visibleCards.length);
  highlightCurrentWord();
}

function updateWordList() {
  elements.wordList.innerHTML = "";

  if (currentCategory === "all") {
    elements.wordListCount.textContent = "";
    const emptyState = document.createElement("p");
    emptyState.className = "word-list-empty";
    emptyState.textContent = "カテゴリー未選択";
    elements.wordList.append(emptyState);
    return;
  }

  elements.wordListCount.textContent = `${visibleCards.length}語`;

  visibleCards.forEach((card, index) => {
    const button = document.createElement("button");
    button.className = "word-chip";
    button.type = "button";
    button.textContent = card.question;
    button.addEventListener("click", () => {
      currentIndex = index;
      updateCard();
    });
    elements.wordList.append(button);
  });
}

function highlightCurrentWord() {
  const wordButtons = elements.wordList.querySelectorAll(".word-chip");
  wordButtons.forEach((button, index) => {
    button.classList.toggle("is-active", index === currentIndex);
  });
}

function showStatus(message) {
  elements.statusMessage.textContent = message;
}

function saveCardsText(rawText) {
  try {
    localStorage.setItem(storageKey, rawText);
    return true;
  } catch {
    return false;
  }
}

function loadCardsFromInput() {
  const nextCards = parseCards(elements.cardInput.value);

  if (nextCards.length === 0) {
    showStatus("有効なカードがありません");
    return;
  }

  cards = nextCards;
  const saved = saveCardsText(elements.cardInput.value);
  updateCategoryFilter();
  applyCategoryFilter();
  showStatus(
    saved
      ? `${cards.length}枚のカードを作成しました`
      : `${cards.length}枚のカードを作成しました（保存容量超過）`,
  );
}

function moveCard(step) {
  if (visibleCards.length === 0) return;
  currentIndex = (currentIndex + step + visibleCards.length) % visibleCards.length;
  updateCard();
}

function randomCard() {
  if (visibleCards.length <= 1) {
    updateCard();
    return;
  }

  let nextIndex = currentIndex;
  while (nextIndex === currentIndex) {
    nextIndex = Math.floor(Math.random() * visibleCards.length);
  }
  currentIndex = nextIndex;
  updateCard();
}

function initialize() {
  const savedText = localStorage.getItem(storageKey);
  elements.cardInput.value = savedText || getDefaultCardsText();
  cards = parseCards(elements.cardInput.value);
  currentCategory = getInitialCategory();
  updateCategoryFilter();
  applyCategoryFilter();
  showStatus(`${cards.length}枚のカードがあります`);
}

elements.flashcard.addEventListener("click", () => {
  elements.flashcard.classList.toggle("is-flipped");
});

elements.prevCard.addEventListener("click", () => moveCard(-1));
elements.nextCard.addEventListener("click", () => moveCard(1));
elements.randomCard.addEventListener("click", randomCard);
elements.loadCards.addEventListener("click", loadCardsFromInput);
elements.categoryFilter.addEventListener("change", (event) => {
  currentCategory = event.target.value;
  applyCategoryFilter();
});

elements.resetSample.addEventListener("click", () => {
  elements.cardInput.value = getDefaultCardsText();
  loadCardsFromInput();
});

document.addEventListener("keydown", (event) => {
  if (event.target === elements.cardInput) return;

  if (event.key === " ") {
    event.preventDefault();
    elements.flashcard.classList.toggle("is-flipped");
  }

  if (event.key === "ArrowLeft") moveCard(-1);
  if (event.key === "ArrowRight") moveCard(1);
  if (event.key.toLowerCase() === "r") randomCard();
});

initialize();
