import { executable, processHost } from './executable.ts';
import { releaseDependencies } from './release-dependencies.ts';
// Apply only under the consolidated pilot execution approval.
try {
  executable(process.env, {
    dependencies: releaseDependencies((url, init) => fetch(url, init)),
    host: processHost(process),
  });
} catch {
  process.stderr.write('Application configuration-failed\n');
  process.exitCode = 1;
}
