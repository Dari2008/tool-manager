/**
 * Raw plugin sidebar loader.
 * Called by app.js to render each item returned by /api/listItems/get?folder=raw
 */
export function render(item) {
  const wrap = document.createElement("div");
  wrap.className = "list-item raw-item";

  if (item.thumbnail) {
    const img = document.createElement("img");
    img.src = item.thumbnail;
    img.alt = item.label ?? item.uuid;
    img.loading = "lazy";
    img.draggable = false; // prevent browser default image drag
    wrap.appendChild(img);
  }

  const label = document.createElement("span");
  label.textContent = item.label ?? item.uuid.slice(0, 8);
  wrap.appendChild(label);

  return wrap;
}
