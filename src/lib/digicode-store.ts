
import fs from 'fs/promises';
import path from 'path';

export type DigicodeEntry = {
    code: string;
    expires: number;
};

// Use a temporary directory which is writable in most serverless environments
const storePath = path.join('/tmp', 'digicode-store.json');

async function readStore(): Promise<Record<string, DigicodeEntry>> {
    try {
        const data = await fs.readFile(storePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // If the file doesn't exist, return an empty object
        return {};
    }
}

async function writeStore(data: Record<string, DigicodeEntry>): Promise<void> {
    await fs.writeFile(storePath, JSON.stringify(data, null, 2));
}

export const digicodeStore = {
  async set(key: string, value: DigicodeEntry): Promise<void> {
    const store = await readStore();
    store[key] = value;
    await writeStore(store);
  },
  async get(key: string): Promise<DigicodeEntry | null> {
    const store = await readStore();
    return store[key] || null;
  },
  async delete(key: string): Promise<void> {
    const store = await readStore();
    delete store[key];
    await writeStore(store);
  },
};
