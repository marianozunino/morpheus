import {blue, gray, red, yellow} from 'kleur'

type LogLevel = 'debug' | 'error' | 'info' | 'warn'
type LogMessage = Error | string

export class Logger {
  private static logLevel: LogLevel = 'info'
  private static useJson: boolean = false

  static debug(message: LogMessage): void {
    if (!this.shouldLog('debug')) return
    const timestamp = new Date().toISOString()
    console.debug(this.formatMessage('debug', message, timestamp))
  }

  static error(message: LogMessage, error?: Error): void {
    if (!this.shouldLog('error')) return
    const timestamp = new Date().toISOString()
    const logMessage = this.formatMessage('error', message, timestamp)
    console.error(logMessage)

    if (error) {
      console.error(this.formatMessage('error', error.stack || error.message, timestamp))
    }
  }

  static info(message: LogMessage): void {
    if (!this.shouldLog('info')) return
    const timestamp = new Date().toISOString()
    console.log(this.formatMessage('info', message, timestamp))
  }

  static initialize(useJson: boolean = false, debug: boolean = false) {
    this.logLevel = debug ? 'debug' : 'info'
    this.useJson = useJson
  }

  static isDebugEnabled(): boolean {
    return this.logLevel === 'debug'
  }

  static warn(message: LogMessage): void {
    if (!this.shouldLog('warn')) return
    const timestamp = new Date().toISOString()
    console.warn(this.formatMessage('warn', message, timestamp))
  }

  private static formatMessage(level: LogLevel, message: LogMessage, timestamp: string): string {
    if (this.useJson) {
      return JSON.stringify({
        level,
        message: message instanceof Error ? message.message : message,
        timestamp,
      })
    }

    const prefix = this.getLevelPrefix(level)
    const color = this.getColorForLevel(level)
    return `${gray(timestamp)} ${color(prefix)} ${message}`
  }

  private static getColorForLevel(level: LogLevel) {
    const colors = {
      debug: gray,
      default: gray,
      error: red,
      info: blue,
      warn: yellow,
    }
    return colors[level] || colors.default
  }

  private static getLevelPrefix(level: LogLevel): string {
    const prefixes = {
      debug: 'DEBUG',
      default: '•',
      error: '✖',
      info: 'ℹ',
      warn: '⚠',
    }
    return prefixes[level] || prefixes.default
  }

  private static shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.logLevel)
  }
}
