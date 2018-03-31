import pino from 'pino';
import get from 'lodash/get';

const isDev   = () => /^(dev|test)/i.test(process.env.NODE_ENV);
const isProd  = () => /^prod/i.test(process.env.NODE_ENV);
/* istanbul ignore next  */
const level   = get(process.env, 'LOG_LEVEL', isDev() ? 'debug' : 'info');
const enabled = /^(silent|test)/i.test(level);

const Logger = pino({
  name: 'stale-multi-cache',
  safe: true,
  extreme: isProd(),
  prettyPrint: isDev(),
  level,
  enabled,
}, process.stdout);

export default Logger;
export {
  Logger
}
