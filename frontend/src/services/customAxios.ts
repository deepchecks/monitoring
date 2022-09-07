import Axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { APP_URL, BASE_API } from '../config';

export const AXIOS_INSTANCE = Axios.create({ baseURL: BASE_API, withCredentials: true });

// Adding an axios interceptor that will handle unauthorized users & users with incomplete details:
AXIOS_INSTANCE.interceptors.response.use(
  response => response,
  error => {
    const { response } = error;
    if (response.status === 401) {
      window.location.href = `${BASE_API}/api/v1/auth/login/auth0?return_uri=${encodeURIComponent(APP_URL!)}`;
    } else if (response.status === 403 && response.headers['x-substatus'] === '10') {
      // Complete details...
      window.location.href = '/complete-details';
    }
    return;
  }
);

export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  const source = Axios.CancelToken.source();
  const promise = AXIOS_INSTANCE({ ...config, cancelToken: source.token }).then(({ data }) => data);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  promise.cancel = () => {
    source.cancel('Query was cancelled by React Query');
  };

  return promise;
};

// In some case with react-query and swr you want to be able to override the return error type so you can also do it here like this
export type ErrorType<Error> = AxiosError<Error>;
