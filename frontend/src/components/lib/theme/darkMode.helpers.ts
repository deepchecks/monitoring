export const setPaletteModeToStorage = (darkMode?: boolean) => {
  window.localStorage.setItem('darkMode', darkMode ? 'on' : 'off');
};

export const isDarkMode = window.localStorage.getItem('darkMode') === 'on';
