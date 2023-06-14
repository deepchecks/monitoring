export const storageKeys = {
  dataIngestionTimeFilter: 'data_ingestion_time_filter',
  analysisFrequency: 'analysis_frequency',
  analysisPeriod: 'analysis_period',
  environment: 'environment',
  user: 'user',
  loggedIn: 'logged_in',
  is_onboarding: 'is_onboarding'
};

export const getStorageItem = (key: string) => {
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : null;
};

export const setStorageItem = <T>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const removeStorageItem = (key: string) => {
  localStorage.removeItem(key);
};
