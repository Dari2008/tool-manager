/**
 * ShopProductImage plugin sidebar loader.
 * Renders each item with a thumbnail and a short UUID label.
 */
export function render(item) {
  const wrap = document.createElement("div");
  wrap.className = "list-item shop-item";

  if (item.thumbnail) {
    const imgWrap = document.createElement("div");
    imgWrap.style.cssText = "position:relative;width:100%;";

    const img = document.createElement("img");
    img.src = item.thumbnail;
    img.alt = item.label ?? item.uuid;
    img.loading = "lazy";
    img.draggable = false;
    imgWrap.appendChild(img);

    // "PRODUCT" badge
    const badge = document.createElement("span");
    badge.style.cssText =
      "position:absolute;top:4px;right:4px;background:#6c63ff;color:#fff;" +
      "font-size:9px;padding:1px 5px;border-radius:3px;pointer-events:none;";
    badge.textContent = "IMG";
    imgWrap.appendChild(badge);

    wrap.appendChild(imgWrap);
  }

  const label = document.createElement("span");
  label.textContent = item.label ?? item.uuid.slice(0, 8);
  wrap.appendChild(label);

  return wrap;
}
