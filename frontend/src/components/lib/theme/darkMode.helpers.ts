export const setPaletteModeToStorage = (darkMode?: boolean) => {
  window.localStorage.setItem('darkMode', darkMode ? 'on' : 'off');
};

export const isDarkMode = false; // window.localStorage.getItem('darkMode') === 'on';
