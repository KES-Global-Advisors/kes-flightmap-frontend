 /**
 * Determines color for status indicators.
 */
 export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return '#22c55e';
    case 'in_progress':
      return '#f97316';
    default:
      return '#9ca3af';
  }
}