/**
 * Live webcam background start helpers.
 * Mirrors the tab-cast single-flight pattern so concurrent applyThemeMedia
 * calls cannot stack getUserMedia or clear webcamBg after a good stream wins.
 */

export function needsWebcamStart(
  stream: MediaStream | null,
  prompt: Promise<unknown> | null,
): boolean {
  return !stream && !prompt;
}

/** Only hard-fail (clear webcamBg) when no stream is already live. */
export function shouldClearWebcamBgOnFailure(stream: MediaStream | null): boolean {
  return !stream;
}

export type WebcamStartHooks = {
  getUserMedia: () => Promise<MediaStream>;
  isEnabled: () => boolean;
  onHardFailure: () => void;
  attach: (stream: MediaStream) => void;
  stopTracks: (stream: MediaStream) => void;
};

/**
 * Single-flight webcam start. Concurrent callers await the in-flight prompt
 * instead of opening another getUserMedia. A late reject does not clear the
 * enabled flag when another attempt already produced a live stream.
 */
export function createWebcamStarter(hooks: WebcamStartHooks): {
  start: () => Promise<void>;
  getStream: () => MediaStream | null;
  getPrompt: () => Promise<void> | null;
  setStream: (stream: MediaStream | null) => void;
  reset: () => void;
} {
  let stream: MediaStream | null = null;
  let prompt: Promise<void> | null = null;

  async function start(): Promise<void> {
    if (stream) {
      hooks.attach(stream);
      return;
    }
    if (prompt) {
      await prompt;
      if (stream) hooks.attach(stream);
      return;
    }
    prompt = (async () => {
      try {
        const next = await hooks.getUserMedia();
        if (!hooks.isEnabled()) {
          hooks.stopTracks(next);
          return;
        }
        if (stream) hooks.stopTracks(stream);
        stream = next;
        hooks.attach(next);
      } catch {
        if (shouldClearWebcamBgOnFailure(stream)) hooks.onHardFailure();
      } finally {
        prompt = null;
      }
    })();
    await prompt;
  }

  return {
    start,
    getStream: () => stream,
    getPrompt: () => prompt,
    setStream: (s) => {
      stream = s;
    },
    reset: () => {
      stream = null;
      prompt = null;
    },
  };
}
