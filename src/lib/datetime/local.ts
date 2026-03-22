function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function getLocalDateISO(value: string | Date) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }

  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  if (!match) throw new Error(`Invalid date value: ${value}`);

  return match[0];
}

export function getLocalTimeHHmm(value: string | Date) {
  if (value instanceof Date) {
    return `${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
  }

  const match = value.match(/\d{2}:\d{2}/);
  if (!match) throw new Error(`Invalid time value: ${value}`);

  return match[0];
}

export function parseLocalDateTime(dateValue: string | Date, timeValue: string | Date) {
  const dateISO = getLocalDateISO(dateValue);
  const timeHHmm = getLocalTimeHHmm(timeValue);
  const [year, month, day] = dateISO.split("-").map(Number);
  const [hours, minutes] = timeHHmm.split(":").map(Number);

  return new Date(year, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0, 0, 0);
}

export function getTodayLocalDateISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
