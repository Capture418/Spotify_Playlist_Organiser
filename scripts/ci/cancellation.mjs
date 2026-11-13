import { setTimeout as delay } from 'node:timers/promises';

export const holdMilliseconds = 120000;

// Test-only checkpoint: never runs integration scenarios or reports scenario success.
export async function cancellationProbe(job, { signal, report = () => {}, wait = delay }) {
  try {
    signal.throwIfAborted();
    await job.setup();
    signal.throwIfAborted();
    report('READY cancellation hold: synthetic resources live; waiting at most 120 seconds');
    await wait(holdMilliseconds, undefined, { signal });
    throw Error('Cancellation hold expired without cancellation');
  } catch (error) {
    if (signal.aborted) report('CANCELLED hold: signal received; beginning scoped cleanup');
    throw error;
  } finally {
    await job.cleanup();
  }
}

// Listen only during the probe; normal runs retain their existing signal behaviour.
export async function withCancellationSignals(source, work) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  source.on('SIGINT', cancel); source.on('SIGTERM', cancel);
  try { return await work(controller.signal); }
  finally { source.off('SIGINT', cancel); source.off('SIGTERM', cancel); }
}
