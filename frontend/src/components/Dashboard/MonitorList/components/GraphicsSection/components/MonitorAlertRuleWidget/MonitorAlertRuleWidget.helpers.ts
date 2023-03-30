import { AlertRuleSchema, AlertSeverity } from 'api/generated';

function filterAlertRulesBySeverity(alertRules: AlertRuleSchema[], severity: AlertSeverity) {
  return [...alertRules].filter(ar => ar.alert_severity === severity);
}

function getMostRecentAlertRule(alertRules: AlertRuleSchema[]) {
  let result = alertRules[0];

  alertRules.forEach(ar => {
    if (new Date(ar.start_time || '').getTime() > new Date(result.start_time || '').getTime()) result = ar;
  });

  return result;
}

const severityArray = [AlertSeverity.critical, AlertSeverity.high, AlertSeverity.medium, AlertSeverity.low];

export function getHighestPriorityAlertRule(alertRules: AlertRuleSchema[]) {
  let highestSeverityAlertRules: AlertRuleSchema[] = [];
  let i = 0;

  do {
    highestSeverityAlertRules = filterAlertRulesBySeverity(alertRules, severityArray[i]);
    i++;
  } while (!highestSeverityAlertRules.length);

  const filteredAlertRules = [...highestSeverityAlertRules].filter(ar => ar.start_time);

  if (!filteredAlertRules.length || filteredAlertRules.length === 1) return highestSeverityAlertRules[0];

  return getMostRecentAlertRule(highestSeverityAlertRules);
}
