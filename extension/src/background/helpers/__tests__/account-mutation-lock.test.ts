import { withAccountMutationLock } from "background/helpers/account-mutation-lock";

const deferred = () => {
  let resolve!: () => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("withAccountMutationLock", () => {
  it("starts the next holder only after the previous one settles", async () => {
    const first = deferred();
    const events: string[] = [];

    const a = withAccountMutationLock(async () => {
      events.push("a:start");
      await first.promise;
      events.push("a:end");
      return "a";
    });
    const b = withAccountMutationLock(async () => {
      events.push("b:start");
      return "b";
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(events).toEqual(["a:start"]);

    first.resolve();

    expect(await Promise.all([a, b])).toEqual(["a", "b"]);
    expect(events).toEqual(["a:start", "a:end", "b:start"]);
  });

  it("releases the lock when a holder rejects", async () => {
    const failing = withAccountMutationLock(async () => {
      throw new Error("boom");
    });
    const next = withAccountMutationLock(async () => "next");

    await expect(failing).rejects.toThrow("boom");
    await expect(next).resolves.toBe("next");
  });
});
