import * as Sentry from '@sentry/react';

import pino from 'pino';

const logger = (() =>
  pino({
    level: 'silent',
    browser: {
      asObject: true,
      transmit: {
        level: 'debug',
        send: async (level: pino.Level, logEvent: pino.LogEvent) => {
          const { messages } = logEvent;
          const translatedLevel = level === 'fatal' ? 'error' : level;
          const isDebug = window.location.host.includes('local');

          if (isDebug) {
            console[translatedLevel](...messages);
          } else if (translatedLevel === 'error') {
            Sentry.captureException(messages);
          } else {
            Sentry.captureMessage(translatedLevel, ...messages);
          }
        }
      }
    }
  }))();

export default logger;
