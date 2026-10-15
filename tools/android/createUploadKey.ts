/**
 * Creates the Google Play upload key and hands it to the Android workflow (docs/PLAY_STORE.md §2,
 * TECH_SPEC §16). Run it once: `npm run android:key`.
 *
 * - The key is written outside the repository, to `~/maneki-merge-upload-key/upload-key.p12`, with
 *   its password in `password.txt` beside it. Both must be backed up; they never enter the repo.
 *   (Play signs the app with its own key; losing the upload key means asking Play for a reset.)
 * - The keystore and its password become the repository secrets the workflow signs with, through
 *   the GitHub CLI.
 * - It prints the key's SHA-256 fingerprint (the Android workflow's summary shows it too).
 *
 * It needs `keytool` (any Java) and a logged-in `gh`. It never overwrites an existing key.
 */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const KEY_DIR = join(homedir(), 'maneki-merge-upload-key');
const KEYSTORE = join(KEY_DIR, 'upload-key.p12');
const PASSWORD_FILE = join(KEY_DIR, 'password.txt');
/** The alias the workflow signs with (.github/workflows/android.yml). */
const KEY_ALIAS = 'upload';
const SECRET_KEYSTORE = 'ANDROID_UPLOAD_KEYSTORE_BASE64';
const SECRET_PASSWORD = 'ANDROID_UPLOAD_KEYSTORE_PASSWORD';
/** keytool reads the password from this variable, so it never shows in a process list. */
const PASSWORD_ENV = 'MANEKI_UPLOAD_KEY_PASSWORD';
/** Play asks for an upload key valid well past the app's life: 30 years. */
const VALIDITY_DAYS = 10950;

/** `keytool` from JAVA_HOME, the PATH, or the usual Windows Java folders. */
function findKeytool(): string {
  const exe = process.platform === 'win32' ? 'keytool.exe' : 'keytool';
  const javaHome = process.env['JAVA_HOME'];
  if (javaHome && existsSync(join(javaHome, 'bin', exe))) return join(javaHome, 'bin', exe);
  if (spawnSync(exe, ['-help'], { stdio: 'ignore' }).status === 0) return exe;
  const roots = [
    'C:\\Program Files\\Java',
    'C:\\Program Files (x86)\\Java',
    'C:\\Program Files\\Eclipse Adoptium',
    'C:\\Program Files\\Microsoft',
    'C:\\Program Files\\Android\\Android Studio',
  ];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    const homes = [root, ...readdirSync(root).map((name) => join(root, name))];
    for (const home of homes) {
      for (const bin of [join(home, 'bin'), join(home, 'jbr', 'bin')]) {
        if (existsSync(join(bin, exe))) return join(bin, exe);
      }
    }
  }
  throw new Error('keytool not found: install a Java runtime or set JAVA_HOME.');
}

function run(
  command: string,
  args: string[],
  options: { input?: string; env?: NodeJS.ProcessEnv } = {},
) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    input: options.input,
    env: options.env ?? process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args[0] ?? ''} failed:\n${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function main(): void {
  if (existsSync(KEYSTORE)) {
    throw new Error(`${KEYSTORE} already exists. Delete it yourself if you really want a new key.`);
  }
  run('gh', ['auth', 'status']);
  const keytool = findKeytool();

  mkdirSync(KEY_DIR, { recursive: true });
  const password = randomBytes(18).toString('base64url');
  const env = { ...process.env, [PASSWORD_ENV]: password };
  run(
    keytool,
    [
      '-genkeypair',
      '-keystore',
      KEYSTORE,
      '-storetype',
      'PKCS12',
      '-alias',
      KEY_ALIAS,
      '-keyalg',
      'RSA',
      '-keysize',
      '2048',
      '-validity',
      String(VALIDITY_DAYS),
      '-dname',
      'CN=Maneki Merge, O=sekerderya',
      '-storepass:env',
      PASSWORD_ENV,
      '-keypass:env',
      PASSWORD_ENV,
    ],
    { env },
  );
  writeFileSync(PASSWORD_FILE, `${password}\n`);

  const listing = run(
    keytool,
    [
      '-list',
      '-v',
      '-keystore',
      KEYSTORE,
      '-storetype',
      'PKCS12',
      '-alias',
      KEY_ALIAS,
      '-storepass:env',
      PASSWORD_ENV,
    ],
    { env },
  );
  const fingerprint = /SHA256:\s*([0-9A-F:]+)/.exec(listing)?.[1];
  if (!fingerprint) throw new Error('Could not read the key fingerprint from keytool.');

  run('gh', ['secret', 'set', SECRET_KEYSTORE], {
    input: readFileSync(KEYSTORE).toString('base64'),
  });
  run('gh', ['secret', 'set', SECRET_PASSWORD], { input: password });

  console.log(`Upload key created: ${KEYSTORE}`);
  console.log(`Its password:       ${PASSWORD_FILE}`);
  console.log('Back up both files (a password manager or a private cloud folder).');
  console.log(`Repository secrets set: ${SECRET_KEYSTORE}, ${SECRET_PASSWORD}`);
  console.log(`Upload key SHA-256 fingerprint: ${fingerprint}`);
}

main();
