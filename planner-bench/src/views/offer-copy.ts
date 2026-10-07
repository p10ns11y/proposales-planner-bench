export function gapLabel(gap: string): string {
  if (gap === "foodAndBeverage") {
    return "No food";
  }
  if (gap === "expired") {
    return "Expired";
  }
  if (gap === "space") {
    return "No meeting space";
  }
  if (gap === "rooms") {
    return "No rooms";
  }
  return gap;
}
