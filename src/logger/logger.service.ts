import { Injectable, ConsoleLogger } from '@nestjs/common';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';

@Injectable()
export class MyLoggerService extends ConsoleLogger {
  async logToFile(entry: string) {
    const formattedEntry = `${Intl.DateTimeFormat('en-US', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Africa/Lagos',
    }).format(new Date())}\t${entry}\n`;

    try {
      if (!fs.existsSync(path.join(__dirname, '..', '..', 'logs'))) {
        await fsPromises.mkdir(path.join(__dirname, '..', '..', 'logs'));
      }
      await fsPromises.appendFile(
        path.join(__dirname, '..', '..', 'logs', 'myLogFile.log'),
        formattedEntry,
      );
    } catch (e) {
      if (e instanceof Error) console.error(e.message);
    }
  }

  log(message: unknown, context?: string) {
    const entry = `${context}\t${String(message)}`;
    this.logToFile(entry).catch(() => console.error('Logging to file failed'));
    super.log(message, context);
  }

  error(message: unknown, stackOrContext?: string) {
    const entry = `${stackOrContext}\t${String(message)}`;
    this.logToFile(entry).catch(() => console.error('Logging to file failed'));
    super.error(message, stackOrContext);
  }
}
