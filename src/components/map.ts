export function replaceMap(container: HTMLElement, svg: string): void {
  const template = document.createElement("template");
  template.innerHTML = svg.trim();
  container.replaceChildren(template.content.cloneNode(true));
}
