/** Result of checking one answer of the /join form. */
export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

export const MIN_AGE = 3;
export const MAX_AGE = 25;

const NAME_MIN = 2;
const NAME_MAX = 64;
const LOCATION_MIN = 2;
const LOCATION_MAX = 128;

/** Telegram usernames are 5-32 characters and may contain letters, digits and underscores. */
const USERNAME_PATTERN = /^@[A-Za-z0-9_]{4,31}$/;

/** Digits, spaces, brackets and dashes, optionally starting with a plus. */
const PHONE_PATTERN = /^\+?[\d\s()-]+$/;
const PHONE_MIN_DIGITS = 7;
const PHONE_MAX_DIGITS = 15;

function countDigits(value: string): number {
  return (value.match(/\d/g) ?? []).length;
}

export function validateName(raw: string): Validated<string> {
  const value = raw.trim().replace(/\s+/g, " ");

  if (value.length < NAME_MIN || value.length > NAME_MAX) {
    return { ok: false, error: `Напиши имя ученика — от ${NAME_MIN} до ${NAME_MAX} символов.` };
  }

  // A name made only of digits or punctuation is almost certainly a mistake.
  if (!/\p{L}/u.test(value)) {
    return { ok: false, error: "Кажется, это не имя. Напиши, как зовут ученика." };
  }

  return { ok: true, value };
}

export function validateAge(raw: string): Validated<number> {
  const value = Number(raw.trim().replace(",", "."));

  if (!Number.isInteger(value)) {
    return { ok: false, error: "Напиши возраст числом. Например: 10" };
  }

  if (value < MIN_AGE || value > MAX_AGE) {
    return { ok: false, error: `Возраст должен быть от ${MIN_AGE} до ${MAX_AGE} лет.` };
  }

  return { ok: true, value };
}

export function validateLocation(raw: string): Validated<string> {
  const value = raw.trim().replace(/\s+/g, " ");

  if (value.length < LOCATION_MIN || value.length > LOCATION_MAX) {
    return { ok: false, error: "Напиши страну и населённый пункт. Например: Казахстан, Алматы" };
  }

  if (!/\p{L}/u.test(value)) {
    return { ok: false, error: "Напиши название словами. Например: Кыргызстан, село Кой-Таш" };
  }

  return { ok: true, value };
}

export function validateContact(raw: string): Validated<string> {
  const value = raw.trim();

  if (USERNAME_PATTERN.test(value)) {
    return { ok: true, value };
  }

  // A username typed without the leading @ is a common slip worth accepting.
  if (/^[A-Za-z][A-Za-z0-9_]{4,30}$/.test(value)) {
    return { ok: true, value: `@${value}` };
  }

  if (PHONE_PATTERN.test(value)) {
    const digits = countDigits(value);

    if (digits >= PHONE_MIN_DIGITS && digits <= PHONE_MAX_DIGITS) {
      return { ok: true, value };
    }
  }

  return {
    ok: false,
    error: "Не похоже на контакт. Пришли номер телефона или @username — либо нажми кнопку ниже.",
  };
}
