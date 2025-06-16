export function slugifyWithCounter() {
  const counter = new Map<string, number>();
  return (text: string) => {
    const count = counter.get(text) ?? 0;
    counter.set(text, count + 1);
    return count === 0 ? text : `${text}-${count}`;
  }
}

export function toTitleCase(text: string) {
  return text.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}