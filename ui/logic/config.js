const staticConfig = window.jamConfig || {};
staticConfig.isEmbedded = false;

export {staticConfig};
export const DEV = staticConfig.development;
