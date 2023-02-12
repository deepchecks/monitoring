export const getParams = () => {
  const urlSearchParams = new URLSearchParams(location.search);
  const params = Object.fromEntries(urlSearchParams.entries());
  return params;
};

export const setParams = (key: string, value?: any) => {
  const urlSearchParams = new URLSearchParams(location.search);
  const params = Object.fromEntries(urlSearchParams.entries());
  if (value != undefined) {
    params[key] = '' + value;
  } else {
    delete params[key]
  }
  location.search = new URLSearchParams(params).toString()

  return params;
};
