/* ============================================================
   HyprrIQ prototype — light interaction layer.
   PLAN CONSTANTS mirror lib/constants/plans.ts — the law is
   "numbers from constants, never hardcoded": page markup uses
   data-bind attributes and is hydrated from here, so a plan
   change is a one-line edit at conversion time too.
   ============================================================ */

const PLANS = {
  single_99: { name: "Single Report", price: "$99",  cadence: "one-time", credits: 1,  brands: 5, slaDays: 5 },
  growth_279: { name: "Growth",       price: "$279", cadence: "/mo",      credits: 5,  brands: 5, slaDays: 5 },
  scale_499: { name: "Scale",         price: "$499", cadence: "/mo",      credits: 12, brands: 5, slaDays: 3 },
};

/* The signed-in sample account (honest credits framing — never "7 of 5") */
const ACCOUNT = {
  name: "Gautam",
  initial: "G",
  email: "you@example.com",
  plan: "growth_279",
  creditsAvailable: 3,
  creditsUsedThisCycle: 2,
  renewsInDays: 12,
};

/* ---- hydrate data-bind markers ---- */
(function hydrate() {
  const p = PLANS[ACCOUNT.plan];
  const pct = Math.min(100, Math.round((ACCOUNT.creditsAvailable / p.credits) * 100));
  const map = {
    "plan-name": p.name,
    "plan-price": p.price + p.cadence,
    "plan-credits": String(p.credits),
    "plan-brands": String(p.brands),
    "plan-sla": String(p.slaDays),
    "credits-available": String(ACCOUNT.creditsAvailable),
    "credits-detail": `plan includes ${p.credits}/cycle`,
    "credits-renews": `renews in ${ACCOUNT.renewsInDays} days`,
    "account-name": ACCOUNT.name,
    "account-initial": ACCOUNT.initial,
    "account-email": ACCOUNT.email,
  };
  document.querySelectorAll("[data-bind]").forEach((el) => {
    const k = el.getAttribute("data-bind");
    if (k in map) el.textContent = map[k];
  });
  document.querySelectorAll("[data-bind-width='credits-pct']").forEach((el) => {
    el.style.width = pct + "%";
  });
})();

/* ---- mobile drawer (interim nav — founder rules A/B/C) ---- */
function drawerOpen() { document.body.classList.add("drawer-open"); }
function drawerClose() { document.body.classList.remove("drawer-open"); }
document.addEventListener("keydown", (e) => { if (e.key === "Escape") drawerClose(); });

/* ---- toast ---- */
let toastTimer;
function toast(msg) {
  let t = document.querySelector(".toast");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast";
    t.setAttribute("role", "status");
    t.setAttribute("aria-live", "polite");
    document.body.appendChild(t);
  }
  t.textContent = msg;
  requestAnimationFrame(() => t.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3800);
}

/* ---- accordion: keep only siblings-exclusive behavior opt-in via data-exclusive ---- */
document.querySelectorAll("[data-exclusive] details").forEach((d) => {
  d.addEventListener("toggle", () => {
    if (!d.open) return;
    d.closest("[data-exclusive]").querySelectorAll("details[open]").forEach((o) => {
      if (o !== d) o.open = false;
    });
  });
});

/* ---- dashboard empty-state preview (?empty=1) ---- */
(function emptyToggle() {
  const params = new URLSearchParams(location.search);
  if (params.get("empty") === "1") {
    document.querySelectorAll("[data-when='has-cases']").forEach((el) => (el.hidden = true));
    document.querySelectorAll("[data-when='empty']").forEach((el) => (el.hidden = false));
  }
})();

/* ---- submit form: brand repeater (cap = plan brands), dropzone, confirm state ---- */
function initSubmitForm() {
  const p = PLANS[ACCOUNT.plan];
  const container = document.getElementById("brandRows");
  const addBtn = document.getElementById("addBrand");
  if (!container || !addBtn) return;

  const capNote = document.getElementById("brandCap");
  if (capNote) capNote.textContent = `Up to ${p.brands} brands per case on your ${p.name} plan — one credit covers them all.`;

  function rowCount() { return container.querySelectorAll(".brand-row").length; }
  function renumber() {
    container.querySelectorAll(".brand-row").forEach((row, i) => {
      row.querySelector("label").textContent = `Brand ${i + 1}`;
      const rm = row.querySelector(".rm");
      if (rm) rm.hidden = rowCount() === 1;
    });
    addBtn.hidden = rowCount() >= p.brands;
  }
  addBtn.addEventListener("click", () => {
    if (rowCount() >= p.brands) return;
    const first = container.querySelector(".brand-row");
    const row = first.cloneNode(true);
    row.querySelector("input").value = "";
    wireRow(row);
    container.appendChild(row);
    renumber();
    row.querySelector("input").focus();
  });
  function wireRow(row) {
    const rm = row.querySelector(".rm");
    if (rm) rm.addEventListener("click", () => { row.remove(); renumber(); });
  }
  container.querySelectorAll(".brand-row").forEach(wireRow);
  renumber();

  // dropzone (visual only — static prototype)
  const dz = document.getElementById("dropzone");
  const fi = document.getElementById("fileInput");
  const list = document.getElementById("fileList");
  if (dz && fi) {
    dz.addEventListener("click", () => fi.click());
    dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("drag"); });
    dz.addEventListener("dragleave", () => dz.classList.remove("drag"));
    dz.addEventListener("drop", (e) => { e.preventDefault(); dz.classList.remove("drag"); addFiles(e.dataTransfer.files); });
    fi.addEventListener("change", () => addFiles(fi.files));
    function addFiles(files) {
      [...files].forEach((f) => {
        const chip = document.createElement("span");
        chip.className = "file-chip";
        chip.innerHTML = `<span></span><button type="button" aria-label="Remove file">×</button>`;
        chip.querySelector("span").textContent = f.name;
        chip.querySelector("button").addEventListener("click", () => chip.remove());
        list.appendChild(chip);
      });
    }
  }

  // submit → inline confirmation state (prototype)
  const form = document.getElementById("submitForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const supplier = document.getElementById("supplierName");
    if (!supplier.value.trim()) {
      supplier.closest(".field").classList.add("invalid");
      supplier.focus();
      return;
    }
    document.getElementById("submitView").hidden = true;
    const done = document.getElementById("confirmView");
    done.hidden = false;
    const echo = document.getElementById("confirmSupplier");
    if (echo) echo.textContent = supplier.value.trim();
    window.scrollTo({ top: 0 });
  });
}
initSubmitForm();

/* ---- reports list: client-side filter chips + search ---- */
function initCaseFilters() {
  const chipRow = document.getElementById("caseFilters");
  if (!chipRow) return;
  const rows = document.querySelectorAll("[data-case-status]");
  const search = document.getElementById("caseSearch");
  let active = "all";

  function apply() {
    const q = (search?.value || "").toLowerCase();
    rows.forEach((r) => {
      const okFilter =
        active === "all" ||
        (active === "active" && r.dataset.caseStatus === "active") ||
        (active === "completed" && r.dataset.caseStatus === "completed") ||
        (active === "action" && r.dataset.caseAction === "1");
      const okSearch = !q || r.dataset.caseText.includes(q);
      r.hidden = !(okFilter && okSearch);
    });
    const empty = document.getElementById("filterEmpty");
    if (empty) {
      const visible = [...rows].some((r) => !r.hidden);
      empty.hidden = visible;
    }
  }
  chipRow.querySelectorAll("[data-filter]").forEach((c) => {
    c.addEventListener("click", () => {
      active = c.dataset.filter;
      chipRow.querySelectorAll("[data-filter]").forEach((x) => x.setAttribute("aria-pressed", x === c ? "true" : "false"));
      apply();
    });
  });
  search?.addEventListener("input", apply);
}
initCaseFilters();

/* ---- report tabs (direction C) ---- */
function initTabs() {
  document.querySelectorAll("[data-tabs]").forEach((wrap) => {
    const tabs = wrap.querySelectorAll("[role='tab']");
    tabs.forEach((t) => {
      t.addEventListener("click", () => {
        tabs.forEach((x) => {
          x.setAttribute("aria-selected", x === t ? "true" : "false");
          document.getElementById(x.getAttribute("aria-controls")).hidden = x !== t;
        });
      });
    });
  });
}
initTabs();

/* ---- auth: magic-link sent state ---- */
function initAuth() {
  const form = document.getElementById("magicForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("authEmail");
    if (!email.value.trim()) { email.focus(); return; }
    form.hidden = true;
    const sent = document.getElementById("magicSent");
    sent.hidden = false;
    document.getElementById("sentTo").textContent = email.value.trim();
  });
}
initAuth();
