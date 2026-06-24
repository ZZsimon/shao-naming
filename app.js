/* 邵氏取名 · 交互逻辑 */

const STORE_KEY = "shao_naming_favs";

const state = {
  gender: "boy",
  source: "chuci_shijing",
  style: STYLES.boy[0],
  current: null,        // 当前展示的名字对象
  favs: loadFavs(),     // 收藏的 id 列表（有序）
  selected: new Set(),  // 收藏夹中勾选用于对比的 id
};

const LABELS = {
  gender: { boy: "男孩", girl: "女孩" },
  source: { chuci_shijing: "楚辞诗经", tang_song: "唐诗宋词", zhongyao: "中药名" },
};
function labelOf(group, value) {
  return (LABELS[group] && LABELS[group][value]) || value;
}

const els = {
  poolHint: document.getElementById("poolHint"),
  result: document.getElementById("result"),
  nameVertical: document.getElementById("nameVertical"),
  pingzeRow: document.getElementById("pingzeRow"),
  line: document.getElementById("line"),
  book: document.getElementById("book"),
  meaning: document.getElementById("meaning"),
  favToggle: document.getElementById("favToggle"),
  styleSeg: document.getElementById("styleSeg"),
  allList: document.getElementById("allList"),
  listGrid: document.getElementById("listGrid"),
  // 收藏
  favOpenBtn: document.getElementById("favOpenBtn"),
  favCount: document.getElementById("favCount"),
  favCount2: document.getElementById("favCount2"),
  drawerMask: document.getElementById("drawerMask"),
  favDrawer: document.getElementById("favDrawer"),
  favCloseBtn: document.getElementById("favCloseBtn"),
  favList: document.getElementById("favList"),
  favEmpty: document.getElementById("favEmpty"),
  compareBtn: document.getElementById("compareBtn"),
  selCount: document.getElementById("selCount"),
  clearFavBtn: document.getElementById("clearFavBtn"),
  // 对比
  compareMask: document.getElementById("compareMask"),
  compareCloseBtn: document.getElementById("compareCloseBtn"),
  compareTable: document.getElementById("compareTable"),
};

/* ---------- 工具 ---------- */
function idOf(item) {
  return `${item.gender}_${item.source}_${item.name}`;
}
function findById(id) {
  return NAMES.find((n) => idOf(n) === id);
}
function loadFavs() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveFavs() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state.favs));
  } catch {}
}
/* ---------- 取名核心 ---------- */
function getPool() {
  return NAMES.filter(
    (n) =>
      n.gender === state.gender &&
      n.source === state.source &&
      n.style === state.style
  );
}

function updateHint() {
  const n = getPool().length;
  els.poolHint.textContent = `当前「${labelOf("gender", state.gender)} · ${labelOf("source", state.source)} · ${state.style}」共有 ${n} 个佳名候选`;
}

/* ---------- 风格分段（随性别变化） ---------- */
function renderStyleSeg() {
  const list = STYLES[state.gender] || [];
  if (!list.includes(state.style)) state.style = list[0];
  els.styleSeg.innerHTML = list
    .map(
      (st) =>
        `<button class="seg-btn ${st === state.style ? "active" : ""}" data-value="${st}">${st}</button>`
    )
    .join("");
  els.styleSeg.querySelectorAll(".seg-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      els.styleSeg.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.style = btn.dataset.value;
      updateHint();
      if (!els.allList.hidden) renderAll();
    });
  });
}

function renderName(item) {
  state.current = item;
  const chars = [
    { hz: SURNAME.char, py: SURNAME.pinyin, surname: true },
    { hz: item.name[0], py: item.pinyin[0] },
    { hz: item.name[1], py: item.pinyin[1] },
  ];
  els.nameVertical.innerHTML = chars
    .map(
      (c) => `
      <div class="nv-char ${c.surname ? "is-surname" : ""}">
        <span class="py">${c.py}</span>
        <span class="hz">${c.hz}</span>
      </div>`
    )
    .join("");

  const tones = [
    { ch: SURNAME.char, tone: SURNAME.tone },
    { ch: item.name[0], tone: item.tones[0] },
    { ch: item.name[1], tone: item.tones[1] },
  ];
  els.pingzeRow.innerHTML = tones
    .map(
      (t) =>
        `<span class="pz-tag ${t.tone === "平" ? "ping" : "ze"}">${t.ch} · ${t.tone}</span>`
    )
    .join("");

  els.line.textContent = item.line;
  els.book.textContent = `—— ${item.book}`;
  els.meaning.textContent = item.meaning;

  syncFavToggle();

  els.result.hidden = false;
  const card = document.getElementById("nameCard");
  card.style.animation = "none";
  void card.offsetWidth;
  card.style.animation = "";
}

let lastId = null;
function drawOne() {
  const pool = getPool();
  if (pool.length === 0) return;
  let pick = pool[Math.floor(Math.random() * pool.length)];
  if (pool.length > 1) {
    let guard = 0;
    while (idOf(pick) === lastId && guard < 20) {
      pick = pool[Math.floor(Math.random() * pool.length)];
      guard++;
    }
  }
  lastId = idOf(pick);
  renderName(pick);
  els.result.scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderAll() {
  const pool = getPool();
  els.listGrid.innerHTML = pool
    .map((n) => {
      const fav = state.favs.includes(idOf(n));
      return `
      <div class="list-item" data-id="${idOf(n)}">
        <span class="li-fav ${fav ? "active" : ""}" data-fav="${idOf(n)}" title="收藏">${fav ? "♥" : "♡"}</span>
        <div class="li-name"><b>邵</b>${n.name}</div>
        <div class="li-py">shào ${n.pinyin[0]} ${n.pinyin[1]}</div>
        <div class="li-book">${n.book}</div>
      </div>`;
    })
    .join("");

  els.listGrid.querySelectorAll(".list-item").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.closest(".li-fav")) return; // 点心形不触发详情
      const item = findById(el.dataset.id);
      if (item) {
        lastId = el.dataset.id;
        renderName(item);
        els.result.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  });
  els.listGrid.querySelectorAll(".li-fav").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFav(el.dataset.fav);
      const isFav = state.favs.includes(el.dataset.fav);
      el.classList.toggle("active", isFav);
      el.textContent = isFav ? "♥" : "♡";
    });
  });

  els.allList.hidden = false;
  els.allList.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------- 收藏 ---------- */
function toggleFav(id) {
  const i = state.favs.indexOf(id);
  if (i >= 0) {
    state.favs.splice(i, 1);
    state.selected.delete(id);
  } else {
    state.favs.push(id);
  }
  saveFavs();
  refreshFavUI();
}

function syncFavToggle() {
  if (!state.current) return;
  const fav = state.favs.includes(idOf(state.current));
  els.favToggle.classList.toggle("active", fav);
  els.favToggle.textContent = fav ? "♥" : "♡";
  els.favToggle.title = fav ? "取消收藏" : "收藏此名";
}

function refreshFavUI() {
  const n = state.favs.length;
  els.favCount.textContent = n;
  els.favCount2.textContent = n;
  syncFavToggle();
  // 同步候选列表里的心形
  els.listGrid.querySelectorAll(".li-fav").forEach((el) => {
    const isFav = state.favs.includes(el.dataset.fav);
    el.classList.toggle("active", isFav);
    el.textContent = isFav ? "♥" : "♡";
  });
  renderFavList();
}

function renderFavList() {
  const items = state.favs.map(findById).filter(Boolean);
  els.favEmpty.hidden = items.length > 0;
  els.favList.innerHTML = items
    .map((n) => {
      const id = idOf(n);
      const checked = state.selected.has(id);
      return `
      <div class="fav-row ${checked ? "selected" : ""}" data-id="${id}">
        <input type="checkbox" ${checked ? "checked" : ""} data-sel="${id}" />
        <div class="fr-main" data-open="${id}">
          <div class="fr-name"><b>邵</b>${n.name}　<span style="font-size:12px;color:var(--gold)">${n.pinyin[0]} ${n.pinyin[1]}</span></div>
          <div class="fr-book">${n.book}</div>
        </div>
        <button class="fr-del" data-del="${id}" title="移除">✕</button>
      </div>`;
    })
    .join("");

  els.favList.querySelectorAll("[data-sel]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const id = cb.dataset.sel;
      if (cb.checked) {
        if (state.selected.size >= 4) {
          cb.checked = false;
          return;
        }
        state.selected.add(id);
      } else {
        state.selected.delete(id);
      }
      cb.closest(".fav-row").classList.toggle("selected", cb.checked);
      updateCompareBtn();
    });
  });
  els.favList.querySelectorAll("[data-del]").forEach((b) => {
    b.addEventListener("click", () => toggleFav(b.dataset.del));
  });
  els.favList.querySelectorAll("[data-open]").forEach((d) => {
    d.addEventListener("click", () => {
      const item = findById(d.dataset.open);
      if (item) {
        setControls(item.gender, item.source, item.style);
        renderName(item);
        closeDrawer();
        els.result.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  });

  updateCompareBtn();
}

function updateCompareBtn() {
  const k = state.selected.size;
  els.selCount.textContent = k;
  els.compareBtn.disabled = k < 2;
}

/* ---------- 抽屉开关 ---------- */
function openDrawer() {
  refreshFavUI();
  els.drawerMask.hidden = false;
  els.favDrawer.hidden = false;
}
function closeDrawer() {
  els.drawerMask.hidden = true;
  els.favDrawer.hidden = true;
}

/* ---------- 对比 ---------- */
function openCompare() {
  const items = [...state.selected].map(findById).filter(Boolean);
  if (items.length < 2) return;

  const head = `<tr><th class="row-label">项目</th>${items
    .map(() => `<th></th>`)
    .join("")}</tr>`;

  const rowName = `<tr><th class="row-label">姓名</th>${items
    .map((n) => `<td><div class="cmp-name"><b>邵</b>${n.name}</div><div class="cmp-py">shào ${n.pinyin[0]} ${n.pinyin[1]}</div></td>`)
    .join("")}</tr>`;

  const rowPingze = `<tr><th class="row-label">平仄</th>${items
    .map((n) => {
      const tones = [
        { ch: "邵", tone: SURNAME.tone },
        { ch: n.name[0], tone: n.tones[0] },
        { ch: n.name[1], tone: n.tones[1] },
      ];
      return `<td><div class="cmp-pingze">${tones
        .map((t) => `<span class="${t.tone === "平" ? "ping" : "ze"}">${t.ch}·${t.tone}</span>`)
        .join("")}</div></td>`;
    })
    .join("")}</tr>`;

  const rowLine = `<tr><th class="row-label">出处</th>${items
    .map((n) => `<td><div class="cmp-line">${n.line}</div><div class="cmp-book">${n.book}</div></td>`)
    .join("")}</tr>`;

  const rowMeaning = `<tr><th class="row-label">寓意</th>${items
    .map((n) => `<td class="cmp-meaning">${n.meaning}</td>`)
    .join("")}</tr>`;

  els.compareTable.innerHTML = head + rowName + rowPingze + rowLine + rowMeaning;
  els.compareMask.hidden = false;
}
function closeCompare() {
  els.compareMask.hidden = true;
}

/* ---------- 控件同步 ---------- */
function setControls(gender, source, style) {
  state.gender = gender;
  state.source = source;
  document.querySelectorAll('.seg[data-group="gender"] .seg-btn').forEach((b) =>
    b.classList.toggle("active", b.dataset.value === gender)
  );
  document.querySelectorAll('.seg[data-group="source"] .seg-btn').forEach((b) =>
    b.classList.toggle("active", b.dataset.value === source)
  );
  renderStyleSeg();
  if (style && STYLES[gender].includes(style)) {
    state.style = style;
    els.styleSeg.querySelectorAll(".seg-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.value === style)
    );
  }
  updateHint();
}

/* ---------- 事件绑定 ---------- */
document.querySelectorAll('.seg[data-group="gender"], .seg[data-group="source"]').forEach((seg) => {
  const group = seg.dataset.group;
  seg.querySelectorAll(".seg-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      seg.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state[group] = btn.dataset.value;
      if (group === "gender") renderStyleSeg(); // 性别变 → 风格选项随之更新
      updateHint();
      if (!els.allList.hidden) renderAll();
    });
  });
});

document.getElementById("drawBtn").addEventListener("click", drawOne);
document.getElementById("againBtn").addEventListener("click", drawOne);
document.getElementById("listBtn").addEventListener("click", renderAll);

els.favToggle.addEventListener("click", () => {
  if (state.current) toggleFav(idOf(state.current));
});

els.favOpenBtn.addEventListener("click", openDrawer);
els.favCloseBtn.addEventListener("click", closeDrawer);
els.drawerMask.addEventListener("click", closeDrawer);
els.clearFavBtn.addEventListener("click", () => {
  if (state.favs.length === 0) return;
  if (confirm("确定清空全部收藏吗？")) {
    state.favs = [];
    state.selected.clear();
    saveFavs();
    refreshFavUI();
  }
});
els.compareBtn.addEventListener("click", openCompare);
els.compareCloseBtn.addEventListener("click", closeCompare);
els.compareMask.addEventListener("click", (e) => {
  if (e.target === els.compareMask) closeCompare();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeCompare();
    closeDrawer();
  }
});

renderStyleSeg();
updateHint();
refreshFavUI();
