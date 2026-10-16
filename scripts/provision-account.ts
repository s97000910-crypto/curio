import { emitKeypressEvents } from 'node:readline';
import { stdin, stdout } from 'node:process';
import { getDb } from '../src/lib/db';
import { provisionAccountPassword } from '../src/lib/services/auth';

function readMasked(prompt: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    return Promise.reject(new Error('Run this command in an interactive terminal.'));
  }

  emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  stdout.write(prompt);

  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error?: Error) => {
      stdin.off('keypress', onKeypress);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    };
    const onKeypress = (character: string, key: { name?: string; ctrl?: boolean; meta?: boolean }) => {
      if (key.ctrl && key.name === 'c') {
        finish(new Error('Password provisioning cancelled.'));
      } else if (key.name === 'return' || key.name === 'enter') {
        finish();
      } else if (key.name === 'backspace') {
        if (value.length > 0) {
          value = value.slice(0, -1);
          stdout.write('\b \b');
        }
      } else if (character && !key.ctrl && !key.meta) {
        value += character;
        stdout.write('*');
      }
    };
    stdin.on('keypress', onKeypress);
  });
}

async function main() {
  const email = process.argv[2];
  const allowReset = process.argv.includes('--reset');
  if (!email || email.startsWith('--')) {
    throw new Error('Usage: npm run account:provision -- <email> [--reset]');
  }

  getDb();
  const password = await readMasked('New password (12-128 characters): ');
  const confirmation = await readMasked('Confirm new password: ');
  if (password !== confirmation) {
    throw new Error('Passwords do not match.');
  }

  await provisionAccountPassword(email, password, allowReset);
  console.log('Password set. Any existing sessions for this account were revoked.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Could not provision account password.');
  process.exitCode = 1;
});
