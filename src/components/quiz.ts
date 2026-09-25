export function setText(element: HTMLElement | null, value: string): void {
  if (element) element.textContent = value;
}
