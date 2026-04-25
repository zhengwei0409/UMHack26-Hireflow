import { spawn } from 'child_process';
import path from 'path';

const CRAWL_SCRIPT = path.resolve(__dirname, '../../scripts/crawl_url.py');
const PYTHON_COMMAND = process.platform === 'win32' ? 'python' : 'python3';

export async function crawlUrl(url: string, timeout = 30): Promise<string | null> {
  return new Promise((resolve) => {
    const proc = spawn(PYTHON_COMMAND, [CRAWL_SCRIPT, url], {
      timeout: timeout * 1000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        console.error(`Crawl4AI exited with code ${code}: ${stderr.slice(0, 200)}`);
        resolve(null);
        return;
      }

      try {
        const result = JSON.parse(stdout.trim().split('\n').pop() || '{}');
        if (result.success) {
          resolve(result.content);
        } else {
          console.error(`Crawl4AI error: ${result.error}`);
          resolve(null);
        }
      } catch (e) {
        console.error(`Crawl4AI parse error: ${e}`);
        resolve(null);
      }
    });

    proc.on('error', (err) => {
      console.error(`Crawl4AI spawn error: ${err}`);
      resolve(null);
    });
  });
}
