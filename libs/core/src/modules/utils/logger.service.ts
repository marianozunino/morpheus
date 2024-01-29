import { ConsoleLogger, LogLevel } from '@nestjs/common';

export class Logger extends ConsoleLogger {
  protected formatMessage(logLevel: LogLevel, message: string): string {
    const colorMessage = this.colorize(message, logLevel);
    const morpheus = this.colorize('[Morpheus]', 'warn');
    return `${morpheus} ${colorMessage}\n`;
  }
}
