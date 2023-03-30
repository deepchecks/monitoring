export function truncateString(str: string, limit: number) {
  return str.slice(0, limit) + '...';
}
