export const config = {
  isDev: false
};

export const APP_URL = config.isDev ? process.env.REACT_APP_LOCAL_URL : window.location.origin;
export const BASE_API = config.isDev ? process.env.REACT_APP_BASE_API : 'https://staging-v2.deepchecks.com';
