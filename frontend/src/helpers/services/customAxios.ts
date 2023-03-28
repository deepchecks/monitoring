import Axios, { AxiosError, AxiosRequestConfig } from 'axios';

import logger from 'helpers/services/logger';

import qs from 'qs';

export const AXIOS_INSTANCE = Axios.create({ baseURL: process.env.REACT_APP_BASE_API, withCredentials: true });

AXIOS_INSTANCE.defaults.paramsSerializer = params => qs.stringify(params, { arrayFormat: 'repeat' });

// Adding an axios interceptor that will handle unauthorized users & users with incomplete details:
AXIOS_INSTANCE.interceptors.response.use(
  response => response,
  error => {
    const { response } = error;
    const logErr = () => error && logger.error('Error occurred in Axios -', error);

    if (response) {
      if (response.status === 401) {
        let redirectLocation = `${process.env.REACT_APP_BASE_API}/api/v1/auth/login/auth0`;

        if (window.location.href.includes('localhost')) {
          const localUrl = 'https://localhost:3000';
          redirectLocation += `?return_uri=${encodeURIComponent(localUrl)}`;
        }

        window.location.href = redirectLocation;
      } else if (response.status === 403 && response.headers['x-substatus'] === '10') {
        window.location.href = '/complete-details';
      } else if (response.status === 451 && window.location.pathname !== '/license-agreement') {
        window.location.href = '/license-agreement';
      } else {
        logErr();

        return response;
      }
    }

    return logErr();
  }
);

let cancelTokenSource = Axios.CancelToken.source();

export const cancelPendingRequests = () => {
  cancelTokenSource.cancel();
  cancelTokenSource = Axios.CancelToken.source();
};

export const customInstance = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const promise = await AXIOS_INSTANCE({ ...config, cancelToken: cancelTokenSource.token }).then(({ data }) => data);

  return promise;
};

export type ErrorType<Error> = AxiosError<Error>;
