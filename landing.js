// landing.js (Speaking Cards) - MODAL VERSION
const container = document.getElementById("cards");
const resetBtn = document.getElementById("reset");
const unlearnBtn = document.getElementById("unlearnedBtn");
const randomBtn = document.getElementById("randomBtn");
const pageButtonsContainer = document.getElementById("pageButtons");
const paginationSection = document.getElementById("paginationSection");

let currentPage = 1;
let showUnlearned = false;
let showRandom = false;

const totalPages = 5; // kaç dosyan varsa (page1..pageN) ona göre ayarla

const getLS = (key) => JSON.parse(localStorage.getItem(key) || "[]");
const setLS = (key, val) => localStorage.setItem(key, JSON.stringify(val));

const norm = (s = "") => String(s).trim().replace(/\s+/g, " ");
const keyOf = (page, q) => `${page}_${norm(q)}`;

// ✅ Modal refs
const modal = document.getElementById("answerModal");
const modalQ = document.getElementById("modalQuestion");
const modalA = document.getElementById("modalAnswer");
const closeModalBtn = document.getElementById("closeModal");
const modalBackdrop = modal ? modal.querySelector(".modal-backdrop") : null;

function openModal(q, a) {
  if (!modal) return;
  modalQ.textContent = norm(q);
  modalA.innerHTML = toHtmlWithBreaks(a || "");
  modal.hidden = false;
  document.body.style.overflow = "hidden"; // body scroll kilitle
}

function closeModal() {
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = ""; // geri aç
}

if (closeModalBtn) closeModalBtn.onclick = closeModal;
if (modalBackdrop) modalBackdrop.onclick = closeModal;

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal && !modal.hidden) closeModal();
});

// ✅ Eski key’leri (varsa) yeniye taşı
(function migrateLS() {
  const legacyKeys = ["unlearned", "unlearnedWord", "unlearnWords"];
  const targetKey = "unlearnedWords";
  const target = getLS(targetKey);

  legacyKeys.forEach((k) => {
    const legacy = JSON.parse(localStorage.getItem(k) || "[]");
    if (Array.isArray(legacy) && legacy.length) {
      legacy.forEach((item) => {
        if (!target.includes(item)) target.push(item);
      });
      localStorage.removeItem(k);
    }
  });

  setLS(targetKey, target);
})();

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toHtmlWithBreaks(text = "") {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

/**
 * ✅ page*.json yoksa patlamasın
 * Beklenen JSON: [{ "q": "...", "a": "..." }, ...]
 */
function fetchPages(pages) {
  return Promise.all(
    pages.map((p) =>
      fetch(`data/page/speaking${p}.json`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) =>
          Array.isArray(data)
            ? data.map((item) => ({
                q: item.q ?? item.question ?? "",
                a: item.a ?? item.answer ?? "",
                page: p,
              }))
            : []
        )
        .catch(() => [])
    )
  ).then((arrs) => arrs.flat());
}

const pageButtons = [];
for (let i = 1; i <= totalPages; i++) {
  const btn = document.createElement("button");
  btn.textContent = `${i}`;
  btn.className = "pageBtn";
  btn.onclick = () => {
    currentPage = i;
    showUnlearned = false;
    showRandom = false;
    renderCards();
  };
  pageButtons.push({ page: i, btn });
  pageButtonsContainer.appendChild(btn);
}

/**
 * ✅ Fix: page dosyası yok/bozuk/boşsa completed yapma
 */
function updateStrike() {
  if (showUnlearned || showRandom) return;

  const hidden = getLS("hiddenWords");
  const unlearn = getLS("unlearnedWords");

  pageButtons.forEach(({ page, btn }) => {
    btn.classList.remove("completed");

    fetch(`data/page/page${page}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) return;

        const visible = data
          .map((item) => ({ q: item.q ?? item.question ?? "", page }))
          .filter((w) => {
            const key = keyOf(w.page, w.q);
            return !hidden.includes(key) && !unlearn.includes(key);
          });

        if (visible.length === 0) btn.classList.add("completed");
      })
      .catch(() => {});
  });
}

/** ✅ Kartı öğrenildi/ezberlenmemiş olarak işaretle */
function markLearned(key) {
  const hidden = getLS("hiddenWords");
  const unlearn = getLS("unlearnedWords");

  if (!hidden.includes(key)) hidden.push(key);
  setLS("hiddenWords", hidden);

  const idx = unlearn.indexOf(key);
  if (idx !== -1) {
    unlearn.splice(idx, 1);
    setLS("unlearnedWords", unlearn);
  }
}

function markUnlearned(key) {
  const unlearn = getLS("unlearnedWords");
  if (!unlearn.includes(key)) {
    unlearn.push(key);
    setLS("unlearnedWords", unlearn);
  }
}

function addProgressBadge(card, text) {
  if (!text) return;

  const badge = document.createElement("div");
  badge.className = "progress-badge";
  badge.textContent = text;

  badge.style.position = "absolute";
  badge.style.top = "-12px";
  badge.style.left = "50%";
  badge.style.transform = "translateX(-50%)";
  badge.style.padding = "6px 10px";
  badge.style.borderRadius = "999px";
  badge.style.fontSize = "12px";
  badge.style.fontWeight = "800";
  badge.style.background = "rgba(15,23,42,0.92)";
  badge.style.color = "#e2e8f0";
  badge.style.border = "1px solid rgba(255,255,255,0.12)";
  badge.style.boxShadow = "0 10px 15px -3px rgb(0 0 0 / 0.2)";
  badge.style.zIndex = "20";

  card.appendChild(badge);
}

function makeCard({ q, a, page }, opts = {}) {
  const key = keyOf(page, q);

  const card = document.createElement("div");
  const inner = document.createElement("div");
  const front = document.createElement("div");
  const back = document.createElement("div");
  const tick = document.createElement("button");
  const xBtn = document.createElement("button");

  card.className = "card";
  inner.className = "inner";
  front.className = "side front";
  back.className = "side back";
  tick.className = "tick";
  xBtn.className = "unlearn";

  front.textContent = norm(q);

  // ✅ Kartta cevap göstermiyoruz (modalda göstereceğiz)
  back.innerHTML = "";

  tick.textContent = "✔";
  xBtn.textContent = "✘";

  if (opts.progressText) addProgressBadge(card, opts.progressText);

  tick.onclick = (e) => {
    e.stopPropagation();
    markLearned(key);

    if (showRandom) {
      bumpRandomSeen?.(opts.selectedPages || []);
      advanceRandomDeck?.();
    } else {
      card.remove();
      updateStrike();
    }
  };

  xBtn.onclick = (e) => {
    e.stopPropagation();
    markUnlearned(key);

    if (showRandom) {
      advanceRandomDeck?.();
    } else {
      card.remove();
      updateStrike();
    }
  };

  // ✅ Karta tıklayınca modal aç
  card.onclick = () => {
    openModal(q, a);
  };

  // ✅ Random modda swipe
  if (typeof attachSwipeHandlers === "function") {
    attachSwipeHandlers(card, key, opts.selectedPages || []);
  }

  inner.append(front, back);
  card.append(xBtn, tick, inner);
  return card;
}

function renderCards() {
  if (paginationSection) paginationSection.style.display = "";

  const randomControls = document.getElementById("randomControls");
  const randomPagesPopover = document.getElementById("randomPagesPopover");
  if (randomControls) randomControls.hidden = true;
  if (randomPagesPopover) randomPagesPopover.hidden = true;

  container.classList.remove("random-mode");
  container.classList.remove("swiping-stack");
  container.innerHTML = "";

  const hidden = getLS("hiddenWords");
  const unlearn = getLS("unlearnedWords");

  const pagesToFetch = showUnlearned ? pageButtons.map((p) => p.page) : [currentPage];

  fetchPages(pagesToFetch).then((items) => {
    shuffle(items);

    items.forEach((it) => {
      const key = keyOf(it.page, it.q);

      if (!showUnlearned && (hidden.includes(key) || unlearn.includes(key))) return;
      if (showUnlearned && !unlearn.includes(key)) return;

      container.append(makeCard(it));
    });

    updateStrike();

    pageButtons.forEach(({ btn, page }) =>
      btn.classList.toggle("active", !showUnlearned && !showRandom && page === currentPage)
    );
    unlearnBtn.classList.toggle("active", showUnlearned);
    randomBtn.classList.toggle("active", showRandom);
  });
}

resetBtn.onclick = () => {
  localStorage.removeItem("hiddenWords");
  localStorage.removeItem("unlearnedWords");
  localStorage.removeItem("randomSelectedPages");
  clearRandomProgress?.();

  showUnlearned = false;
  showRandom = false;

  window.resetRandomDeck?.();

  pageButtons.forEach(({ btn }) => btn.classList.remove("completed"));
  renderCards();
};

unlearnBtn.onclick = () => {
  showUnlearned = !showUnlearned;
  showRandom = false;
  renderCards();
};

randomBtn.onclick = () => {
  showRandom = true;
  showUnlearned = false;
  renderRandom?.();
};

renderCards();

// Expose shared utilities/state to global scope
window.getLS = getLS;
window.setLS = setLS;
window.norm = norm;
window.keyOf = keyOf;
window.shuffle = shuffle;
window.fetchPages = fetchPages;
window.markLearned = markLearned;
window.markUnlearned = markUnlearned;
window.makeCard = makeCard;
window.renderCards = renderCards;
window.totalPages = totalPages;
window.pageButtons = pageButtons;
window.container = container;
window.paginationSection = paginationSection;
window.unlearnBtn = unlearnBtn;
window.randomBtn = randomBtn;

Object.defineProperty(window, "showRandom", {
  get: () => showRandom,
  set: (v) => (showRandom = v),
});
Object.defineProperty(window, "showUnlearned", {
  get: () => showUnlearned,
  set: (v) => (showUnlearned = v),
});
Object.defineProperty(window, "currentPage", {
  get: () => currentPage,
  set: (v) => (currentPage = v),
});
