import getAgent from '@egjs/agent';
const agent = getAgent();
export const isChrome = agent.browser.name === 'chrome' ||  agent.browser.name === 'chromium';
export const isFirefox = typeof InstallTrigger !== 'undefined';
export const isIE = /*@cc_on!@*/false || !!document.documentMode;
export const isEdge = !isIE && !!window && !!window.StyleMedia;
