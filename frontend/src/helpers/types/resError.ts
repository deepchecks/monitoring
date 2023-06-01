export interface resError {
  error_message: string;
  additional_information?: { errors?: { loc: string[]; msg: string; type: string }[] };
}
