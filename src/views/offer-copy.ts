export function neutralChipName(mark: string): string {
  if (mark === "breakout") {
    return "Breakout not stated";
  }
  if (mark === "diet") {
    return "Diet not stated";
  }
  return "Not stated";
}

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
  if (gap === "breakout") {
    return "No breakout";
  }
  if (gap === "budget") {
    return "Over budget";
  }
  if (gap === "vegetarian") {
    return "Vegetarian";
  }
  if (gap === "vegan") {
    return "Vegan";
  }
  if (gap === "gluten-free") {
    return "Gluten-free";
  }
  if (gap === "dairy-free") {
    return "Dairy-free";
  }
  if (gap === "nut-free") {
    return "Nut-free";
  }
  if (gap === "halal") {
    return "Halal";
  }
  if (gap === "kosher") {
    return "Kosher";
  }
  if (gap === "pescatarian") {
    return "Pescatarian";
  }
  return gap;
}
