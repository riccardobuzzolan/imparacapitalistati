export function replaceMap(container: HTMLElement, svg: string): void {
  const documentSvg = new DOMParser().parseFromString(
    svg.trim(),
    "image/svg+xml",
  );
  const root = documentSvg.documentElement;
  if (
    root.nodeName.toLowerCase() !== "svg" ||
    documentSvg.querySelector("parsererror")
  ) {
    throw new Error("Mappa SVG non valida");
  }
  container.replaceChildren(document.importNode(root, true));
}
