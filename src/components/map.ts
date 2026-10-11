export function replaceMap(container: HTMLElement, svg: string): void {
  const parser = new DOMParser(),
    namespace = "http://www.w3.org/2000/svg";
  let documentSvg = parser.parseFromString(svg.trim(), "image/svg+xml"),
    root = documentSvg.documentElement;
  if (
    root.nodeName.toLowerCase() !== "svg" ||
    documentSvg.querySelector("parsererror")
  ) {
    throw new Error("Mappa SVG non valida");
  }
  // Legacy map strings omitted xmlns. Parsing those as XML creates generic
  // elements without SVG geometry or dataset; reparse with the SVG namespace.
  if (root.namespaceURI === null) {
    root.removeAttribute("xmlns");
    const markup = new XMLSerializer()
      .serializeToString(root)
      .replace(/^<svg(?=[\s>])/, `<svg xmlns="${namespace}"`);
    documentSvg = parser.parseFromString(markup, "image/svg+xml");
    root = documentSvg.documentElement;
  }
  if (
    root.namespaceURI !== namespace ||
    documentSvg.querySelector("parsererror")
  )
    throw new Error("Mappa SVG non valida");
  container.replaceChildren(document.importNode(root, true));
}
