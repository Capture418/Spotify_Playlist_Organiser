// Separate explicit loopback development entry; never selected by production settings.
import { processHost } from './executable.ts';
import { prepareProcess } from './process-preparation.ts';
import { releaseDependencies } from './release-dependencies.ts';
import { hostedConfig } from './hosted-config.ts';
import { startHosted } from './hosted.ts';
try {
  hostedConfig(process.env,true);
  prepareProcess(()=>startHosted(process.env,releaseDependencies((url,init)=>fetch(url,init)),true),processHost(process));
} catch {process.stderr.write('Local configuration-failed\n');process.exitCode=1;}
