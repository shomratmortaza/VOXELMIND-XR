const origin = "https://voxelmind-xr.lovable.app";
export function pageHead(path: string, name: string, description: string) {
  const title = `${name} — VOXELMIND XR`;
  return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { property: "og:url", content: origin + path }], links: [{ rel: "canonical", href: origin + path }] };
}