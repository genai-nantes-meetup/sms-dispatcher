const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = "^{}\\[~]|€\f";

export function isGsm7(text: string): boolean {
  for (const ch of text) if (!GSM_BASIC.includes(ch) && !GSM_EXT.includes(ch)) return false;
  return true;
}

export function smsStats(text: string) {
  const gsm = isGsm7(text);
  let units = 0;
  if (gsm) for (const ch of text) units += GSM_EXT.includes(ch) ? 2 : 1;
  else units = [...text].reduce((n, ch) => n + (ch.codePointAt(0)! > 0xffff ? 2 : 1), 0);
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  const segments = units === 0 ? 0 : units <= single ? 1 : Math.ceil(units / multi);
  return { chars: [...text].length, units, encoding: gsm ? ("GSM-7" as const) : ("Unicode" as const), segments };
}
