/** Preparation only. No process handlers, exit, database or network access on import. */
type Running = { close: () => Promise<void> };
type Signal = 'SIGINT' | 'SIGTERM';
type Status = 'ready' | 'stopped' | 'startup-failed' | 'shutdown-failed' | 'shutdown-timeout';
export type ProcessHost = {
  on: (signal: Signal, listener: () => void) => void;
  off: (signal: Signal, listener: () => void) => void;
  report: (status: Status) => void;
  exit: (code: 0 | 1) => void;
  deadline: (callback: () => void, milliseconds: number) => () => void;
};
/** Future executable supplies the approved factory and host; no operational defaults. */
export function prepareProcess(start: () => Promise<Running>, host: ProcessHost) {
  let running: Running | undefined, stopping = false, finished = false;
  let cancelDeadline: (() => void) | undefined, closing: Promise<void> | undefined;
  function finish(status: Status, code: 0 | 1) {
    if (finished) return;
    finished = true;
    cancelDeadline?.();
    host.off('SIGINT', stop); host.off('SIGTERM', stop);
    host.report(status); host.exit(code);
  }
  function close() {
    if (!closing && running) closing = Promise.resolve().then(() => running!.close()).then(
      () => finish('stopped', 0), () => finish('shutdown-failed', 1),
    );
    return closing;
  }
  function stop() {
    if (stopping || finished) return;
    stopping = true;
    cancelDeadline = host.deadline(() => finish('shutdown-timeout', 1), 10000);
    void close();
  }
  host.on('SIGINT', stop); host.on('SIGTERM', stop);
  const started = Promise.resolve().then(start).then(async app => {
    running = app;
    // A late factory result is disposed even when a mocked host has already exited.
    if (stopping || finished) await close();
    else host.report('ready');
  }, () => finish('startup-failed', 1));
  return { started, stop };
}
