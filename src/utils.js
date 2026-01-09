export function fmtUAH(n) {
    const x = Math.round(n);
    const s = String(x);
    let out = "";
    for (let i = 0; i < s.length; i++) {
      const idx = s.length - i;
      out += s[i];
      if (idx > 1 && idx % 3 === 1) out += " ";
    }
    return out + " грн";
  }
  
  export function mhzToHuman(mhz) {
    if (mhz >= 1000) {
      const ghz = mhz / 1000;
      const txt = (Math.round(ghz * 100) / 100).toString().replace(".", ",");
      return txt + " ГГц";
    }
    return mhz + " МГц";
  }
  
  export function bandLabel(a, b) {
    return `${mhzToHuman(a)} – ${mhzToHuman(b)}`;
  }
  
  export function hoursToHM(h) {
    if (!Number.isFinite(h) || h <= 0) return "—";
    const totalMin = Math.max(1, Math.round(h * 60));
    const hh = Math.floor(totalMin / 60);
    const mm = totalMin % 60;
    return `${hh} год ${String(mm).padStart(2, "0")} хв`;
  }
  
  export async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    }
  }
  
  function isIOS() {
    const ua = navigator.userAgent || "";
    const platform = navigator.platform || "";
    const iOSLike = /iPad|iPhone|iPod/i.test(ua) || /iPad|iPhone|iPod/i.test(platform);
    const iPadOS13Plus = platform === "MacIntel" && navigator.maxTouchPoints > 1;
    return iOSLike || iPadOS13Plus;
  }
  
  function openAppLink(appUrl, fallbackUrl) {
    // На iOS custom-scheme краще відкривати через location.href, а не window.open
    // + робимо fallback (якщо додатка нема або Safari заблокував)
    const useIOS = isIOS();
  
    if (useIOS) {
      const t = setTimeout(() => {
        if (fallbackUrl) window.open(fallbackUrl, "_blank");
      }, 900);
  
      window.location.href = appUrl;
  
      // якщо одразу перейшло — таймер не критичний
      setTimeout(() => clearTimeout(t), 1200);
      return;
    }
  
    // Android/desktop: можна пробувати нову вкладку або self
    try {
      window.open(appUrl, "_blank");
    } catch {
      window.location.href = appUrl;
    }
  
    if (fallbackUrl) {
      setTimeout(() => {
        try {
          window.open(fallbackUrl, "_blank");
        } catch {
          /* ignore */
        }
      }, 900);
    }
  }
  
  export function openWhatsApp(phone, text) {
    const clean = String(phone || "").replace(/[^\d]/g, "");
    const url = `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }
  
  /**
   * Telegram:
   * - app deep link: tg://msg_url?text=...
   * - web fallback: https://t.me/share/url?text=...
   *
   * (Примітка: "в конкретний чат" з підстановкою тексту Telegram не дає стабільно.
   * Тому відкриваємо compose/share з готовим текстом.)
   */
  export function openTelegram(text) {
    const enc = encodeURIComponent(text || "");
    const appUrl = `tg://msg_url?text=${enc}`;
    const webUrl = `https://t.me/share/url?text=${enc}`;
    openAppLink(appUrl, webUrl);
  }
  
  /**
   * Signal:
   * - app deep link: signal://send?phone=...&text=...
   * - web fallback: https://signal.org/download/
   */
  export function openSignal(phone, text) {
    const clean = String(phone || "").replace(/[^\d]/g, "");
    const phoneE164 = clean ? `+${clean}` : "";
    const enc = encodeURIComponent(text || "");
    const appUrl = `signal://send${phoneE164 ? `?phone=${encodeURIComponent(phoneE164)}&text=${enc}` : `?text=${enc}`}`;
    const webUrl = `https://signal.org/download/`;
    openAppLink(appUrl, webUrl);
  }
  