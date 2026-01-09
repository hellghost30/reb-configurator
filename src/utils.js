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
  
  export function openWhatsApp(phone, text) {
    const clean = String(phone || "").replace(/[^\d]/g, "");
    const url = `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }
  