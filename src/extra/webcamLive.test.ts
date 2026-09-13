import { describe, expect, it, vi } from "vitest";
import {
  createWebcamStarter,
  needsWebcamStart,
  shouldClearWebcamBgOnFailure,
} from "./webcamLive";

type FakeStream = MediaStream & { id: string };

function fakeStream(id: string): FakeStream {
  const track = {
    stop: vi.fn(),
    id,
  } as unknown as MediaStreamTrack;
  return {
    id,
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as FakeStream;
}

describe("webcam live start guards", () => {
  it("needs a start only when no stream and no in-flight prompt", () => {
    expect(needsWebcamStart(null, null)).toBe(true);
    expect(needsWebcamStart(fakeStream("a"), null)).toBe(false);
    const prompt = Promise.resolve();
    expect(needsWebcamStart(null, prompt)).toBe(false);
    expect(needsWebcamStart(fakeStream("a"), prompt)).toBe(false);
  });

  it("clears webcamBg on failure only when no stream is live", () => {
    expect(shouldClearWebcamBgOnFailure(null)).toBe(true);
    expect(shouldClearWebcamBgOnFailure(fakeStream("live"))).toBe(false);
  });
});

describe("webcam single-flight starter", () => {
  it("double start while enabling yields a single getUserMedia", async () => {
    let gumCalls = 0;
    let enabled = true;
    let hardFails = 0;
    let attachedId = "";
    const deferred: { resolve?: (s: MediaStream) => void } = {};
    const gum = new Promise<MediaStream>((resolve) => {
      deferred.resolve = resolve;
    });

    const starter = createWebcamStarter({
      getUserMedia: async () => {
        gumCalls += 1;
        return gum;
      },
      isEnabled: () => enabled,
      onHardFailure: () => {
        hardFails += 1;
        enabled = false;
      },
      attach: (s) => {
        attachedId = (s as FakeStream).id;
      },
      stopTracks: (s) => {
        for (const t of s.getTracks()) t.stop();
      },
    });

    // Mirror double applyThemeMedia while webcam on → only one start opens GUM.
    expect(needsWebcamStart(starter.getStream(), starter.getPrompt())).toBe(true);
    const a = starter.start();
    expect(needsWebcamStart(starter.getStream(), starter.getPrompt())).toBe(false);
    const b = starter.start();

    deferred.resolve?.(fakeStream("cam-1"));
    await Promise.all([a, b]);

    expect(gumCalls).toBe(1);
    expect(attachedId).toBe("cam-1");
    expect(enabled).toBe(true);
    expect(hardFails).toBe(0);
  });

  it("failed second start does not clear the flag if a stream is already live", async () => {
    let enabled = true;
    let hardFails = 0;
    const live = fakeStream("winner");

    // Catch path with a live stream must not clear the setting.
    expect(shouldClearWebcamBgOnFailure(live)).toBe(false);

    const lonely = createWebcamStarter({
      getUserMedia: async () => {
        throw new DOMException("Permission denied", "NotAllowedError");
      },
      isEnabled: () => true,
      onHardFailure: () => {
        hardFails += 1;
        enabled = false;
      },
      attach: () => undefined,
      stopTracks: (s) => {
        for (const t of s.getTracks()) t.stop();
      },
    });
    await lonely.start();
    expect(hardFails).toBe(1);
    expect(enabled).toBe(false);
  });

  it("race: late reject after winner keeps enabled flag", async () => {
    let enabled = true;
    let hardFails = 0;
    let attachedId = "";

    let resolveWin: ((s: MediaStream) => void) | undefined;
    let rejectLose: ((e: Error) => void) | undefined;
    const winGum = new Promise<MediaStream>((resolve) => {
      resolveWin = resolve;
    });
    const loseGum = new Promise<MediaStream>((_resolve, reject) => {
      rejectLose = reject;
    });

    // Harness mirrors module-level webcamStream / webcamPrompt.
    let stream: MediaStream | null = null;
    let prompt: Promise<void> | null = null;
    let gumN = 0;

    async function startLikeMain(attach: (s: MediaStream) => void): Promise<void> {
      if (stream) {
        attach(stream);
        return;
      }
      if (prompt) {
        await prompt;
        if (stream) attach(stream);
        return;
      }
      prompt = (async () => {
        try {
          gumN += 1;
          const next = gumN === 1 ? await winGum : await loseGum;
          if (!enabled) {
            for (const t of next.getTracks()) t.stop();
            return;
          }
          stream = next;
          attach(next);
        } catch {
          if (shouldClearWebcamBgOnFailure(stream)) {
            hardFails += 1;
            enabled = false;
          }
        } finally {
          prompt = null;
        }
      })();
      await prompt;
    }

    // With the applyThemeMedia gate, only the first schedules start.
    const tasks: Promise<void>[] = [];
    if (needsWebcamStart(stream, prompt)) {
      tasks.push(startLikeMain((s) => {
        attachedId = (s as FakeStream).id;
      }));
    }
    if (needsWebcamStart(stream, prompt)) {
      tasks.push(startLikeMain((s) => {
        attachedId = (s as FakeStream).id;
      }));
    }
    expect(tasks).toHaveLength(1);

    // Late reject after winner must not clear the flag.
    prompt = (async () => {
      try {
        await loseGum;
      } catch {
        if (shouldClearWebcamBgOnFailure(stream)) {
          hardFails += 1;
          enabled = false;
        }
      } finally {
        prompt = null;
      }
    })();
    const late = prompt;

    resolveWin?.(fakeStream("winner"));
    await tasks[0];
    expect(attachedId).toBe("winner");
    expect((stream as FakeStream | null)?.id).toBe("winner");

    rejectLose?.(new DOMException("Device in use", "NotReadableError"));
    await late.catch(() => undefined);

    expect(enabled).toBe(true);
    expect(hardFails).toBe(0);
    expect(gumN).toBe(1);
  });
});
