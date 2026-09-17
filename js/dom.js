// Brief Lab — dom.js
// Tiny helpers for building page elements. Text always goes through textContent,
// never innerHTML, so model output and student text are never treated as HTML.

export function $(id) {
  return document.getElementById(id);
}

// el('button', { class: 'x', text: 'Go', 'aria-pressed': 'true' }, [child, 'text'])
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') throw new Error('innerHTML is not allowed');
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function svgEl(tag, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined) continue;
    node.setAttribute(k, v);
  }
  return node;
}

export function setText(idOrNode, text) {
  const node = typeof idOrNode === 'string' ? $(idOrNode) : idOrNode;
  if (node) node.textContent = text;
}

export function show(node, visible) {
  if (!node) return;
  if (visible) node.removeAttribute('hidden');
  else node.setAttribute('hidden', '');
}

// Run fn after `ms` of quiet. Used to save the draft while typing.
export function debounce(fn, ms) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
