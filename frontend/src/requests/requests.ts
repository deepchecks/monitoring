import axios from "axios";

export const instance = axios.create({
  baseURL: "http://api-v2-mon-1978135218.eu-west-1.elb.amazonaws.com",
});
