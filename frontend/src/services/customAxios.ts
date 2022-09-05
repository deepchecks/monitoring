import axios from 'axios';
import Axios, { AxiosError, AxiosRequestConfig } from 'axios';
// export const AXIOS_INSTANCE = Axios.create({ baseURL: 'https://mon-demo-083122.deepchecks.com/' });
// export const AXIOS_INSTANCE = Axios.create({ baseURL: 'http://mon-commercial-283366795.eu-west-1.elb.amazonaws.com/' });
export const AXIOS_INSTANCE = Axios.create({ baseURL: process.env.REACT_APP_BASE_API , withCredentials: true});
// Adding an axios interceptor that will handle unauthorized users & users with incomplete details:
AXIOS_INSTANCE.interceptors.response.use(
  response => response,
  error => {
    const { response } = error;
    if (response.status === 401) {
      window.location.href = 'https://staging-v2.deepchecks.com/api/v1/auth/login/auth0?return_uri=https://localhost:3000';
    } else if (response.status === 403 && response.headers['x-substatus'] === '10') {
      console.log('le response::', response);
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

const _handleRedirectByStatus = (status: number) => {
  console.log('inside redirection handler');
  switch (status) {
    case 401:
      console.log('TODO: Redirect to Login!!!');
      break;
    case 403:
      console.log('TODO: handle status 403 with special header');
      break;
    default:
      return;
  }
};
