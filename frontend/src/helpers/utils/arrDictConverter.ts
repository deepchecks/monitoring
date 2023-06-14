export const convertDictionaryToArray = (dictionary: Record<string, string>): any[] => {
  const headers: any[] = [];
  for (const [name, value] of Object.entries(dictionary)) {
    name !== '' && headers.push({ name, value });
  }
  return headers;
};

export const convertArrayToDictionary = (headers: any): Record<string, string> => {
  const dictionary: Record<string, string> = {};
  headers.forEach((header: any) => {
    const { name, value } = header;
    dictionary[name] = value;
  });
  return dictionary;
};
