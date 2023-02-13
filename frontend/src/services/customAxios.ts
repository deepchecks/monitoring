import Axios, { AxiosError, AxiosRequestConfig } from 'axios';
import logger from 'helpers/logger';
import qs from 'qs';

export const AXIOS_INSTANCE = Axios.create({ baseURL: process.env.REACT_APP_BASE_API, withCredentials: true });

AXIOS_INSTANCE.defaults.paramsSerializer = params => qs.stringify(params, { arrayFormat: 'repeat' });

// Adding an axios interceptor that will handle unauthorized users & users with incomplete details:
AXIOS_INSTANCE.interceptors.response.use(
  response => response,
  error => {
    const { response } = error;

    if (response.status === 401) {
      let redirectLocation = `${process.env.REACT_APP_BASE_API}/api/v1/auth/login/auth0`;
      if (process.env.REACT_APP_LOCAL_URL) {
        redirectLocation += `?return_uri=${encodeURIComponent(process.env.REACT_APP_LOCAL_URL)}`;
      }
      window.location.href = redirectLocation;
    } else if (response.status === 403 && response.headers['x-substatus'] === '10') {
      // Complete details...
      window.location.href = '/complete-details';
    } else if (response.status === 451 && window.location.pathname !== '/license-agreement') {
      window.location.href = '/license-agreement';
    }

    return;
  }
);

let cancelTokenSource = Axios.CancelToken.source();

export const cancelPendingRequests = () => {
  cancelTokenSource.cancel();
  cancelTokenSource = Axios.CancelToken.source();
};

export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  const promise = AXIOS_INSTANCE({ ...config, cancelToken: cancelTokenSource.token })
    .then(({ data }) => data)
    .catch(e => logger.error('Error occurred in Axios -', e));
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  promise.cancel = () => {
    cancelTokenSource.cancel('Query was cancelled by React Query');
  };

  return promise;
};

// In some case with react-query and swr you want to be able to override the return error type so you can also do it here like this
export type ErrorType<Error> = AxiosError<Error>;
