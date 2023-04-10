export const getParams = () => {
  const urlSearchParams = new URLSearchParams(window.location.search);
  const params = Object.fromEntries(urlSearchParams.entries());
  return params;
};

export const setParams = (key: string, value?: any, updateSearch = true) => {
  const urlSearchParams = new URLSearchParams(window.location.search);
  const params = Object.fromEntries(urlSearchParams.entries());

  if (value) {
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

const MODEL_ID_PARAM = 'modelId';

export const handleSetParams = (key: string, value?: any, updateSearch = true) => {
  if (key === MODEL_ID_PARAM) {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const url = new URL(window.location.toString());

    Object.keys(urlSearchParams.keys()).forEach(p => {
      if (p !== MODEL_ID_PARAM) url.searchParams.delete(key);
    });
  }

  return setParams(key, value, updateSearch);
};
