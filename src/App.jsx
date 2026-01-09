import React, { useMemo, useState } from "react";
import { PRICING } from "./pricing";
import {
  bandLabel,
  copyToClipboard,
  fmtUAH,
  hoursToHM,
  mhzToHuman,
  openWhatsApp
} from "./utils";

function buildBands() {
  const bands = [];
  for (
    let start = PRICING.rangeMinMHz;
    start < PRICING.rangeMaxMHz;
    start += PRICING.uiStepMHz
  ) {
    const end = Math.min(PRICING.rangeMaxMHz, start + PRICING.uiStepMHz);
    bands.push({ id: `${start}-${end}`, start, end, title: bandLabel(start, end) });
    if (end >= PRICING.rangeMaxMHz) break;
  }
  return bands;
}

const MAX_MODULES = 10;

export default function App() {
  const bands = useMemo(() => buildBands(), []);

  // id -> "none" | "50W" | "100W"
  const [sel, setSel] = useState(() => {
    const m = {};
    for (const b of bands) m[b.id] = "none";
    return m;
  });

  // корпус обовʼязковий
  const [caseType, setCaseType] = useState("auto");

  const [battery, setBattery] = useState("none");
  const [magQty, setMagQty] = useState(0);

  // лишаємо тільки те, що реально є на сайті
  const [opt, setOpt] = useState({
    charger220: false,
    charger12_24: false
  });

  const [toast, setToast] = useState("");

  const counts = useMemo(() => {
    let c50 = 0,
      c100 = 0;
    for (const k in sel) {
      if (sel[k] === "50W") c50++;
      if (sel[k] === "100W") c100++;
    }
    return { c50, c100, total: c50 + c100 };
  }, [sel]);

  const canAddMore = counts.total < MAX_MODULES;

  // ===== Coverage segments (visual) =====
  const coverageSegments = useMemo(() => {
    const segs = [];
    for (const b of bands) {
      const v = sel[b.id];
      if (v === "none") continue;

      const start = b.start;
      const width = PRICING.modules[v].bandwidthMHz; // 100 або 170
      const end = Math.min(PRICING.rangeMaxMHz, start + width);

      segs.push({
        id: b.id,
        type: v, // "50W" | "100W"
        start,
        end
      });
    }
    segs.sort((a, b) => a.start - b.start);
    return segs;
  }, [bands, sel]);

  function mhzToPct(mhz) {
    const min = PRICING.rangeMinMHz;
    const max = PRICING.rangeMaxMHz;
    const p = ((mhz - min) / (max - min)) * 100;
    return Math.max(0, Math.min(100, p));
  }

  // ===== Extra price rule: start >= 2000 MHz => +4000 per selected module =====
  const hiBandExtraCost = useMemo(() => {
    let n = 0;
    for (const b of bands) {
      const v = sel[b.id];
      if (v === "none") continue;
      if (b.start >= 2000) n++;
    }
    return n * 4000;
  }, [bands, sel]);

  const runtime = useMemo(() => {
    const b = PRICING.batteries[battery];
    if (!b || b.energyWh <= 0 || counts.total === 0) return null;

    const V = PRICING.nominalVoltage;
    const Imin =
      counts.c50 * PRICING.modules["50W"].Imin +
      counts.c100 * PRICING.modules["100W"].Imin;
    const Imax =
      counts.c50 * PRICING.modules["50W"].Imax +
      counts.c100 * PRICING.modules["100W"].Imax;

    const best = b.energyWh / (V * Imin);
    const worst = b.energyWh / (V * Imax);

    return { best, worst, Imin, Imax };
  }, [battery, counts]);

  const finalPrice = useMemo(() => {
    if (counts.total === 0) return 0;

    const modulesCost =
      counts.c50 * PRICING.modules["50W"].price +
      counts.c100 * PRICING.modules["100W"].price +
      hiBandExtraCost;

    const caseCost = PRICING.cases[caseType].price;
    const battCost = PRICING.batteries[battery].price;

    const chargerCost =
      (opt.charger220 ? PRICING.options.charger220.price : 0) +
      (opt.charger12_24 ? PRICING.options.charger12_24.price : 0);

    const mq = Number.isFinite(magQty)
      ? Math.max(0, Math.min(999, Math.trunc(magQty)))
      : 0;
    const magCost = mq * PRICING.options.magneticFeet.price;

    const cost =
      modulesCost +
      battCost +
      caseCost +
      PRICING.baseIncludedCost +
      chargerCost +
      magCost;

    // робота/прибуток включаємо, але окремо не показуємо
    const work = counts.total <= 7 ? PRICING.work.upTo7 : PRICING.work.over7;
    const profit = cost * PRICING.profitCoef;

    return Math.round(cost + work + profit);
  }, [counts, caseType, battery, opt, magQty, hiBandExtraCost]);

  const runtimeHint = useMemo(() => {
    if (counts.total === 0)
      return "Спочатку обери хоча б 1 модуль — потім підберемо акум і порахуємо час роботи.";
    if (battery === "none") return "Орієнтовний час роботи зʼявиться після вибору акума.";
    if (!runtime) return "";
    return `Орієнтовний час роботи (28В): ${hoursToHM(runtime.worst)} – ${hoursToHM(
      runtime.best
    )} (струм ~${Math.round(runtime.Imin)}–${Math.round(runtime.Imax)} А)`;
  }, [battery, counts, runtime]);

  const summaryText = useMemo(() => {
    if (counts.total === 0) return "";

    const chosen50 = [];
    const chosen100 = [];

    for (const b of bands) {
      const v = sel[b.id];
      if (v === "50W") chosen50.push(b.title);
      if (v === "100W") chosen100.push(b.title);
    }

    const optLines = [];
    if (opt.charger220) optLines.push("• Зарядний пристрій 220В");
    if (opt.charger12_24) optLines.push("• Зарядний пристрій 12/24В");

    const mq = Number.isFinite(magQty)
      ? Math.max(0, Math.min(999, Math.trunc(magQty)))
      : 0;
    if (mq > 0) optLines.push(`• Магнітні ніжки: ${mq} шт`);

    const rtLine = runtime
      ? `• Орієнтовний час роботи (28В): ${hoursToHM(runtime.worst)} – ${hoursToHM(runtime.best)}`
      : "• Орієнтовний час роботи: —";

    const lines = [];
    lines.push("Заявка (конструктор РЕБ):");
    lines.push(`• Модулі: всього ${counts.total} (50 Вт: ${counts.c50} • 100 Вт: ${counts.c100})`);
    lines.push(`• Діапазони 50 Вт (≈100 МГц): ${chosen50.length ? chosen50.join(", ") : "не обрано"}`);
    lines.push(`• Діапазони 100 Вт (≈170 МГц): ${chosen100.length ? chosen100.join(", ") : "не обрано"}`);

    if (coverageSegments.length) {
      lines.push("• Покриття (за вибором):");
      for (const s of coverageSegments) {
        const pwr = s.type === "100W" ? "100 Вт" : "50 Вт";
        lines.push(`  - ${pwr}: ${s.start}–${s.end} МГц`);
      }
    }

    lines.push(`• Корпус/монтаж: ${PRICING.cases[caseType].label}`);
    lines.push(`• Акумулятор: ${PRICING.batteries[battery].label}`);
    lines.push(rtLine);

    lines.push("• Комплект: пульт керування + кабель до акумулятора (за замовчуванням)");
    lines.push(`• Опції: ${optLines.length ? "\n" + optLines.join("\n") : "немає"}`);
    lines.push(`• Орієнтовна вартість: ${fmtUAH(finalPrice)}`);

    return lines.join("\n");
  }, [bands, sel, caseType, battery, counts, runtime, opt, magQty, finalPrice, coverageSegments]);

  function setBand(id, val) {
    setSel((prev) => {
      const curr = prev[id];
      if (curr === val) return prev;

      // порахувати скільки вже вибрано у prev (щоб не залежати від stale counts)
      let total = 0;
      for (const k in prev) if (prev[k] !== "none") total++;

      const isAdding = curr === "none" && val !== "none";

      if (isAdding && total >= MAX_MODULES) {
        setToast(`Максимум ${MAX_MODULES} модулів. Зніми один діапазон, щоб додати новий.`);
        setTimeout(() => setToast(""), 1800);
        return prev;
      }

      return { ...prev, [id]: val };
    });
  }

  function resetAll() {
    const m = {};
    for (const b of bands) m[b.id] = "none";
    setSel(m);

    setCaseType("auto");
    setBattery("none");
    setMagQty(0);
    setOpt({ charger220: false, charger12_24: false });

    setToast("");
  }

  // ===== Messenger helpers (без utils.js) =====
  function openTelegram(target, text) {
    const t = String(target || "").trim();
    const enc = encodeURIComponent(text || "");
    if (!t) return false;

    let url = "";
    if (t.startsWith("http://") || t.startsWith("https://") || t.startsWith("tg://")) {
      url = t.includes("?") ? `${t}&text=${enc}` : `${t}?text=${enc}`;
    } else {
      const u = t.replace(/^@/, "");
      url = `https://t.me/${u}?text=${enc}`;
    }

    try {
      window.open(url, "_blank", "noopener,noreferrer");
      return true;
    } catch {
      return false;
    }
  }

  // ✅ FIX: Signal через signal.me (працює стабільніше на мобільних, ніж signal:// з браузера)
  // Текст ми вже кладемо в буфер через onCopy(), тому тут просто відкриваємо чат/контакт.
  function openSignal(phone) {
    const p = String(phone || "").trim();
    if (!p) return false;

    // приводимо до E.164: +380...
    let clean = p.replace(/[^\d+]/g, "");
    if (clean && clean[0] !== "+") clean = "+" + clean;

    // signal.me/#p/+E164
    const url = `https://signal.me/#p/${encodeURIComponent(clean)}`;

    try {
      window.open(url, "_blank", "noopener,noreferrer");
      return true;
    } catch {
      try {
        window.location.href = url;
        return true;
      } catch {
        return false;
      }
    }
  }

  async function onCopy() {
    if (counts.total === 0) return;
    const ok = await copyToClipboard(summaryText);
    setToast(ok ? "Текст скопійовано. Якщо месенджер не підставив — встав вручну (Paste)." : "Не вдалося скопіювати");
    setTimeout(() => setToast(""), 1600);
  }

  async function onOrderWA() {
    if (counts.total === 0) return;
    await onCopy();
    const phone = import.meta.env.VITE_WA_PHONE || "380000000000";
    openWhatsApp(phone, summaryText);
  }

  async function onOrderTG() {
    if (counts.total === 0) return;
    await onCopy();
    const tg = import.meta.env.VITE_TG_USERNAME || "";
    const ok = openTelegram(tg, summaryText);
    if (!ok) {
      setToast("Не задано Telegram. Додай VITE_TG_USERNAME у Render/ENV.");
      setTimeout(() => setToast(""), 2200);
    }
  }

  async function onOrderSignal() {
    if (counts.total === 0) return;
    await onCopy();
    const phone = import.meta.env.VITE_SIGNAL_PHONE || "";
    const ok = openSignal(phone);
    if (!ok) {
      setToast("Не задано Signal. Додай VITE_SIGNAL_PHONE у Render/ENV.");
      setTimeout(() => setToast(""), 2200);
    } else {
      // підказка тільки якщо Signal відкрився: текст уже в буфері
      setToast("Signal відкрито. Встав текст у чат (Paste).");
      setTimeout(() => setToast(""), 2000);
    }
  }

  return (
    <div className="wrap">
      <h1>Конструктор РЕБ</h1>
      <p className="sub">
        Обери діапазони <b>{mhzToHuman(PRICING.rangeMinMHz)}–{mhzToHuman(PRICING.rangeMaxMHz)}</b> і потужність для кожного (можна змішувати 50/100 Вт).
      </p>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="small">
            Модулі: <b>{counts.total}</b> (50 Вт: <b>{counts.c50}</b> • 100 Вт: <b>{counts.c100}</b>)
          </div>
          <button className="btnDanger" onClick={resetAll}>Скинути все</button>
        </div>

        <div className="hr" />

        <span className="label">Діапазони (для кожного обери потужність)</span>
        <div className="ranges">
          {bands.map((b) => (
            <div key={b.id} className="rangeItem">
              <div className="rangeLeft">
                <div className="rangeTitle">{b.title}</div>
                <div className="rangeSub">50W≈100МГц • 100W≈170МГц</div>
              </div>
              <select value={sel[b.id]} onChange={(e) => setBand(b.id, e.target.value)} style={{ minWidth: 130 }}>
                <option value="none">— не потрібно</option>
                <option value="50W" disabled={sel[b.id] === "none" && !canAddMore}>50 Вт</option>
                <option value="100W" disabled={sel[b.id] === "none" && !canAddMore}>100 Вт</option>
              </select>
            </div>
          ))}
        </div>

        {/* ===== Frequency coverage visualization ===== */}
        <div className="freqCardTitle">Покриття частот (візуально)</div>
        <div className="freqWrap">
          <div className="freqBar">
            {coverageSegments.map((s) => {
              const left = mhzToPct(s.start);
              const right = mhzToPct(s.end);
              const width = Math.max(0.8, right - left);
              return (
                <div
                  key={s.id}
                  className={"freqSeg " + (s.type === "100W" ? "w100" : "")}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`${s.type === "100W" ? "100 Вт" : "50 Вт"} • ${s.start}–${s.end} МГц`}
                />
              );
            })}
          </div>

          <div className="freqTicks">
            <span>{PRICING.rangeMinMHz} МГц</span>
            <span>{PRICING.rangeMaxMHz} МГц</span>
          </div>

          <div className="freqList">
            {coverageSegments.length === 0 ? (
              <div className="small">Поки не обрано жодного модуля — шкала порожня.</div>
            ) : (
              coverageSegments.map((s) => (
                <div key={s.id} className="freqItem">
                  <span>
                    {s.type === "100W" ? "100 Вт" : "50 Вт"}: <b>{s.start}–{s.end} МГц</b>
                  </span>
                  <span className="mut">{s.type === "100W" ? "≈170 МГц" : "≈100 МГц"}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="hr" />

        {/* ===== Config after modules ===== */}
        <div className="row">
          <div className="col">
            <span className="label">Корпус / монтаж (обовʼязково)</span>
            <select value={caseType} onChange={(e) => setCaseType(e.target.value)}>
              <option value="auto">{PRICING.cases.auto.label} — {fmtUAH(PRICING.cases.auto.price)}</option>
              <option value="portable">{PRICING.cases.portable.label} — {fmtUAH(PRICING.cases.portable.price)}</option>
            </select>
          </div>

          <div className="col">
            <span className="label">Акумулятор (LiFePO4)</span>
            <select value={battery} onChange={(e) => setBattery(e.target.value)}>
              {Object.entries(PRICING.batteries).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}{k === "none" ? "" : ` — ${fmtUAH(v.price)}`}
                </option>
              ))}
            </select>
            <div className="small" style={{ marginTop: 6 }}>{runtimeHint}</div>
          </div>
        </div>

        <div className="hr" />

        <div className="row">
          <div className="col">
            <span className="label">Тип зарядного пристрою</span>
            <div className="row">
              <label className="chk">
                <input
                  type="checkbox"
                  checked={opt.charger220}
                  onChange={(e) => setOpt((p) => ({ ...p, charger220: e.target.checked }))}
                />
                {PRICING.options.charger220.label} (+{fmtUAH(PRICING.options.charger220.price)})
              </label>

              <label className="chk">
                <input
                  type="checkbox"
                  checked={opt.charger12_24}
                  onChange={(e) => setOpt((p) => ({ ...p, charger12_24: e.target.checked }))}
                />
                {PRICING.options.charger12_24.label} (+{fmtUAH(PRICING.options.charger12_24.price)})
              </label>
            </div>
          </div>

          <div className="col">
            <span className="label">Магнітні ніжки (1300 грн / шт)</span>
            <input
              type="number"
              min="0"
              max="999"
              value={magQty}
              onChange={(e) => setMagQty(e.target.valueAsNumber || 0)}
            />
          </div>
        </div>

        <div className="small" style={{ marginTop: 10 }}>
          До комплекту <b>за замовчуванням</b> додається <b>пульт керування</b> та <b>кабель до акумулятора</b>.
        </div>

        {toast ? <div className="toast">{toast}</div> : null}
      </div>

      {/* ===== Price & messenger buttons only when modules selected ===== */}
      {counts.total > 0 ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="small">Орієнтовна вартість</div>
          <div className="big">{fmtUAH(finalPrice)}</div>
          <div className="small" style={{ marginTop: 6 }}>
            {runtime ? `Орієнтовний час роботи (28В): ${hoursToHM(runtime.worst)} – ${hoursToHM(runtime.best)}` : ""}
          </div>

          <div className="hr" />

          <div className="small" style={{ marginBottom: 8 }}>Текст для месенджерів</div>
          <textarea readOnly value={summaryText} />

          <div className="row" style={{ justifyContent: "space-between", marginTop: 12 }}>
            <button onClick={onCopy}>Скопіювати текст</button>

            <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
              <button onClick={onOrderTG}>Замовити (Telegram)</button>
              <button onClick={onOrderSignal}>Замовити (Signal)</button>
              <button className="btn2" onClick={onOrderWA}>Замовити (WhatsApp)</button>
            </div>
          </div>

          {toast ? <div className="toast">{toast}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
