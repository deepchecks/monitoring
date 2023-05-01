import { AlertSeverity } from 'api/generated';
import { theme } from 'components/lib/theme';

const { low, medium, high, critical } = AlertSeverity;

export function severityColor(severity: AlertSeverity) {
  switch (severity) {
    case low:
      return theme.palette.severity.low;

    case medium:
      return theme.palette.severity.medium;

    case high:
      return theme.palette.severity.high;

    case critical:
      return theme.palette.severity.critical;

    default:
      return theme.palette.severity.critical;
  }
}
