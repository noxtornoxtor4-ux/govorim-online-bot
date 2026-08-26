export interface Application {
  name: string;
  age: number;
  location: string;
  contact: string;
  /** Telegram user who submitted the form. */
  telegramId: number;
  telegramUsername: string;
  submittedAt: string;
}
