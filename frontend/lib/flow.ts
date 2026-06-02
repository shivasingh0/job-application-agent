export type FlowStepId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export function stepForPath(pathname: string): FlowStepId {
  if (pathname.startsWith("/job")) return 1;
  if (pathname.startsWith("/resume")) return 3;
  if (pathname.startsWith("/fit")) return 4;
  if (pathname.startsWith("/email")) return 5;
  if (pathname.startsWith("/scheduled") || pathname.startsWith("/history")) return 7;
  return 1;
}
