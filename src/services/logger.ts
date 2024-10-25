import {blue, gray, green, red, white, yellow} from 'kleur'
import {Logger as WinstonLogger, createLogger, format, transports} from 'winston'

type LogLevel = 'debug' | 'error' | 'info' | 'success' | 'warn'
type ColorFunction = (str: string) => string

// Define custom log levels including 'success'
const customLevels = {
  colors: {
    debug: 'gray',
    error: 'red',
    info: 'blue',
    success: 'green',
    warn: 'yellow',
  },
  levels: {
    debug: 4,
    error: 0,
    info: 3,
    success: 2,
    warn: 1,
  },
}

export class Logger {
  private logger: WinstonLogger

  constructor() {
    // Create Winston logger instance with custom levels
    this.logger = createLogger({
      format: format.combine(
        format.timestamp(),
        format.printf(({level, message, timestamp}) => {
          const color = this.getColorForLevel(level as LogLevel)
          const prefix = this.getLevelPrefix(level as LogLevel)
          return `${gray(timestamp as string)} ${color(prefix)} ${message}`
        }),
      ),
      level: 'debug', // Allow all log levels
      levels: customLevels.levels,
      transports: [new transports.Console()],
    })
  }

  public debug(message: string): void {
    this.logger.debug(message)
  }

  public error(message: string, error?: Error): void {
    this.logger.error(message)
    if (error) {
      this.logger.error(error.stack || error.message)
    }
  }

  public info(message: string): void {
    this.logger.info(message)
  }

  public success(message: string): void {
    this.logger.log('success', message)
  }

  public warn(message: string): void {
    this.logger.warn(message)
  }

  private getColorForLevel(level: LogLevel): ColorFunction {
    switch (level) {
      case 'error': {
        return red
      }

      case 'warn': {
        return yellow
      }

      case 'info': {
        return blue
      }

      case 'debug': {
        return gray
      }

      case 'success': {
        return green
      }

      default: {
        return white
      }
    }
  }

  private getLevelPrefix(level: LogLevel): string {
    switch (level) {
      case 'error': {
        return '✖'
      }

      case 'warn': {
        return '⚠'
      }

      case 'info': {
        return 'ℹ'
      }

      case 'debug': {
        return '🔍'
      }

      case 'success': {
        return '✔'
      }

      default: {
        return '•'
      }
    }
  }
}
