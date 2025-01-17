export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG'
}

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: LogLevel, message: string): string {
    return `[${level}][${this.context}] ${message}`;
  }

  public info(message: string, ...args: any[]) {
    console.log(this.formatMessage(LogLevel.INFO, message), ...args);
  }

  public warn(message: string, ...args: any[]) {
    console.warn(this.formatMessage(LogLevel.WARN, message), ...args);
  }

  public error(message: string, error?: any) {
    console.error(this.formatMessage(LogLevel.ERROR, message), error);
  }

  public debug(message: string, ...args: any[]) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage(LogLevel.DEBUG, message), ...args);
    }
  }
}