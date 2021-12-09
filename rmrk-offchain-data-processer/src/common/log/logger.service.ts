import { Logger } from '@nestjs/common';

export class MyLogger extends Logger {
  debug(message: string) {
    // add your tailored logic here
    super.debug(message, '');
  }
  warn(message: string) {
    super.warn(message, '');
  }
  verbose(message: string) {
    super.verbose(message, '');
  }
  error(message: string) {
    super.error(message, '');
  }
  log(message: string) {
    super.log(message, '');
  }
}
