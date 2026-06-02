import { constants } from 'node:fs';
import pathModule from 'node:path';
import fs from 'fs-extra';
import { execa } from 'execa';

import type { Executor, RunOptions } from './types.js';

export class RealExecutor implements Executor {
  async run(command: string, args: string[], options: RunOptions = {}) {
    await execa(command, args, {
      cwd: options.cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
  }

  async ensureDir(path: string) {
    await fs.ensureDir(path);
  }

  async pathExists(path: string) {
    return fs.pathExists(path);
  }

  async readFile(path: string) {
    return fs.readFile(path, 'utf8');
  }

  async writeFile(path: string, content: string) {
    await fs.ensureDir(pathModule.dirname(path));
    await fs.outputFile(path, content);
  }

  async writeJson(path: string, value: unknown) {
    await fs.outputJson(path, value, { spaces: 2 });
  }

  async remove(path: string) {
    await fs.remove(path);
  }

  async symlinkOrJunction(target: string, linkPath: string) {
    await fs.remove(linkPath);
    try {
      await fs.symlink(target, linkPath, 'dir');
      return;
    } catch (error) {
      if (process.platform !== 'win32') {
        throw error;
      }
    }

    await fs.access(target, constants.R_OK);
    await fs.symlink(target, linkPath, 'junction');
  }
}

export class DryRunExecutor implements Executor {
  readonly operations: string[] = [];

  async run(command: string, args: string[], options: RunOptions = {}) {
    this.operations.push(`run ${command} ${args.join(' ')}${options.cwd ? ` (cwd ${options.cwd})` : ''}`);
  }

  async ensureDir(path: string) {
    this.operations.push(`mkdir ${path}`);
  }

  async pathExists() {
    return false;
  }

  async readFile(path: string) {
    this.operations.push(`read ${path}`);
    return '';
  }

  async writeFile(path: string) {
    this.operations.push(`write ${path}`);
  }

  async writeJson(path: string) {
    this.operations.push(`write-json ${path}`);
  }

  async remove(path: string) {
    this.operations.push(`remove ${path}`);
  }

  async symlinkOrJunction(target: string, linkPath: string) {
    this.operations.push(`link ${linkPath} -> ${target}`);
  }
}
