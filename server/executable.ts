import { platformProductionConfig } from './runtime-config.ts';
import { startIntegratedApplication } from './application.ts';
import { prepareProcess } from './process-preparation.ts';
import type { ProcessHost } from './process-preparation.ts';

/** No environment switch enables live execution. Rehearsals inject every effect. */
export function executable(env: NodeJS.ProcessEnv, wiring?: {
  dependencies: Parameters<typeof startIntegratedApplication>[1];
  host: ProcessHost;
  start?: typeof startIntegratedApplication;
}) {
  platformProductionConfig(env);
  if (!wiring) throw Error('Production activation requires the separate S04c operational gate.');
  return prepareProcess(() => (wiring.start ?? startIntegratedApplication)(env, wiring.dependencies), wiring.host);
}

/** Host adapter is inert until explicitly supplied to executable. Fixed status text only. */
export function processHost(target: Pick<NodeJS.Process, 'on' | 'off' | 'exit' | 'stdout'>): ProcessHost {
  return {
    on: (signal, listener) => { target.on(signal, listener); },
    off: (signal, listener) => { target.off(signal, listener); },
    report: status => { target.stdout.write(`Application ${status}\n`); },
    exit: code => { target.exit(code); },
    deadline: (callback, milliseconds) => {
      const timer = setTimeout(callback, milliseconds);
      return () => clearTimeout(timer);
    },
  };
}
