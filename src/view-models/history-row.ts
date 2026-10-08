const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatHistoryWhen(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const weekday = part(parts, "weekday");
  const day = part(parts, "day");
  const month = part(parts, "month");
  const hour = part(parts, "hour");
  const minute = part(parts, "minute");
  if (weekday === "" || day === "" || month === "" || hour === "" || minute === "") {
    return fallbackWhen(date);
  }
  return `${weekday} ${day} ${month}, ${hour === "24" ? "00" : hour}:${minute}`;
}

export function historyMeta(input: {
  venueCount: number;
  filedCount: number;
  savedAt: string;
  timeZone: string;
}): string {
  const parts = [venuePhrase(input.venueCount)];
  const filed = filedPhrase(input.filedCount);
  if (filed !== "") {
    parts.push(filed);
  }
  parts.push(formatHistoryWhen(input.savedAt, input.timeZone));
  return parts.join(" · ");
}

export function venuePhrase(count: number): string {
  if (count === 1) {
    return "1 venue";
  }
  return `${count} venues`;
}

export function filedPhrase(count: number): string {
  if (count === 2) {
    return "Filed twice";
  }
  if (count > 2) {
    return `Filed ${count} times`;
  }
  return "";
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((item) => item.type === type)?.value ?? "";
}

function fallbackWhen(date: Date): string {
  const weekday = weekdays[date.getDay()] ?? "";
  const month = months[date.getMonth()] ?? "";
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${weekday} ${date.getDate()} ${month}, ${hour}:${minute}`;
}
