import UAParser from 'ua-parser-js';

export const userAgent = UAParser({
  browser: [
    [/(jamwebview)\/(ios|android)/i],
    [UAParser.BROWSER.NAME, UAParser.OS.NAME],
  ],
});
