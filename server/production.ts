import { processHost } from './executable.ts';
import { prepareProcess } from './process-preparation.ts';
import { releaseDependencies } from './release-dependencies.ts';
import { hostedConfig } from './hosted-config.ts';
import { startHosted } from './hosted.ts';
try {
  hostedConfig(process.env);
  prepareProcess(()=>startHosted(process.env,releaseDependencies((url,init)=>fetch(url,init))),processHost(process));
} catch {process.stderr.write('Application configuration-failed\n');process.exitCode=1;}
