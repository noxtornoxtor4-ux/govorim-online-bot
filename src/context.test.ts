import { describe, expect, mock, test } from "bun:test";
import { GrammyError } from "grammy";
import type { BotContext } from "./context";
import { acknowledge } from "./context";

function grammyError(description: string): GrammyError {
  return new GrammyError(
    "Call to 'answerCallbackQuery' failed!",
    { ok: false, error_code: 400, description },
    "answerCallbackQuery",
    {},
  );
}

function ctxWith(answerCallbackQuery: () => Promise<unknown>): BotContext {
  return { answerCallbackQuery } as unknown as BotContext;
}

describe("acknowledge", () => {
  test("confirms a fresh button press", async () => {
    const answer = mock(() => Promise.resolve(true));

    await acknowledge(ctxWith(answer));

    expect(answer).toHaveBeenCalledTimes(1);
  });

  test("stays silent when the query expired while the bot was down", async () => {
    const expired = grammyError("Bad Request: query is too old and response timeout expired");

    expect(acknowledge(ctxWith(() => Promise.reject(expired)))).resolves.toBeUndefined();
  });

  test("still reports any other failure", async () => {
    const other = grammyError("Bad Request: chat not found");

    expect(acknowledge(ctxWith(() => Promise.reject(other)))).rejects.toThrow("chat not found");
  });
});
