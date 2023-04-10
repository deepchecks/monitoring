import { handleSetParams } from 'helpers/utils/getParams';

export function getAlertFilters() {
  const urlSearchParams = new URLSearchParams(window.location.search);
  const params = Object.fromEntries(urlSearchParams.entries());
  const modelId = +params?.modelId;
  const severity = params?.severity;
  const alertFilters = { models: [] as number[], severity: [] as string[] };
  if (severity) alertFilters['severity'] = [severity];
  if (modelId) alertFilters['models'] = [modelId];
  return alertFilters;
}

export function resetAlertFilters(setAlertFilters: any) {
  setAlertFilters({ models: [], severity: [] });
  handleSetParams('modelId');
  handleSetParams('severity');
}
