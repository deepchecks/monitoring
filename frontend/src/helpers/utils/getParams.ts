export const getParams = () => {
  const urlSearchParams = new URLSearchParams(window.location.search);
  const params = Object.fromEntries(urlSearchParams.entries());
  return params;
};

export const setParams = (key: string, value?: any, updateSearch = true) => {
  const urlSearchParams = new URLSearchParams(window.location.search);
  const params = Object.fromEntries(urlSearchParams.entries());
  if (value != undefined) {
    params[key] = '' + value;
    if (updateSearch) {
      const url = new URL(window.location.toString());
      url.searchParams.set(key, value);
      window.history.pushState(null, '', url.toString());
    }
  } else {
    delete params[key];
    if (updateSearch) {
      const url = new URL(window.location.toString());
      url.searchParams.delete(key);
      window.history.pushState(null, '', url.toString());
    }
  }
  const searchStr = new URLSearchParams(params).toString();

  return searchStr;
};
