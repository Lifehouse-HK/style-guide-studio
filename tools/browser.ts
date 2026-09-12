import puppeteer, { type LaunchOptions } from 'puppeteer';
/** CI runs trusted generated specimens on an ephemeral runner without user namespaces. */
export const launchBrowser = (options: LaunchOptions = {}) =>
  puppeteer.launch({
    ...options,
    args: [...(process.env.CI ? ['--no-sandbox'] : []), ...(options.args ?? [])],
  });
