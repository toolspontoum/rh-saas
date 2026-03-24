/**
 * Converte telefone extraído de texto/IA para apenas dígitos nacionais (DDD + número),
 * sem código do país (55). Aceita 10 (fixo) ou 11 (celular) dígitos.
 *
 * - Remove +55 / 55 à esquerda quando há mais de 11 dígitos.
 * - Se ainda sobrar mais de 11 dígitos, usa os últimos 11 (evita prefixos estranhos).
 * - Caso típico internacional: 5511999999999 → 11999999999.
 * - Se após remover 55 restarem 9 dígitos começando com 9 (celular sem DDD), prefixa o DDD
 *   do telefone já cadastrado ou "11".
 */
export function normalizeBrazilPhoneDigitsFromExtract(
  raw: string | null | undefined,
  existingPhoneForDdd: string | null | undefined
): string | null {
  let d = (raw ?? "").replace(/\D/g, "");
  if (!d) return null;

  while (d.startsWith("0")) d = d.slice(1);

  while (d.length > 11 && d.startsWith("55")) {
    d = d.slice(2);
  }
  if (d.length > 11) {
    d = d.slice(-11);
  }

  if (d.length === 11 && d.startsWith("55")) {
    d = d.slice(2);
  }

  const dddFallback = (existingPhoneForDdd ?? "").replace(/\D/g, "").slice(0, 2);

  if (d.length === 9 && d[0] === "9") {
    const ddd = dddFallback.length === 2 ? dddFallback : "11";
    d = ddd + d;
  }

  if (d.length < 10 || d.length > 11) {
    return null;
  }

  return d;
}
