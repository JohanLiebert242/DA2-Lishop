const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export async function addToCart(productId: string, quantity: number): Promise<void> {
  const m = typeof window !== 'undefined' ? document.cookie.match(/(?:^|;\s*)lishop_at=([^;]*)/) : null;
  const token = m?.[1] ? decodeURIComponent(m[1]) : null;
  if (!token) {
    window.location.href = 'http://localhost:3001/login';
    return;
  }
  const res = await fetch(`${API_URL}/cart/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productId, quantity }),
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.message ?? 'Failed to add to cart');
  }
  // Bump the cart badge count in localStorage so the shell can read it
  const json = await res.json();
  const cart = json.data ?? json;
  if (typeof cart.items === 'object') {
    const count = String((cart.items as unknown[]).length);
    window.localStorage.setItem('lishop_cart_count', count);
    window.dispatchEvent(new StorageEvent('storage', { key: 'lishop_cart_count', newValue: count }));
  }
}

export function flyToCart(sourceRect: DOMRect): void {
  const target = document.querySelector<HTMLElement>('[data-cart-fly-target]');
  if (!target) return;
  const targetRect = target.getBoundingClientRect();

  const SIZE = 28;
  const startX = sourceRect.left + sourceRect.width / 2 - SIZE / 2;
  const startY = sourceRect.top + sourceRect.height / 2 - SIZE / 2;
  const endX = targetRect.left + targetRect.width / 2 - SIZE / 2;
  const endY = targetRect.top + targetRect.height / 2 - SIZE / 2;

  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;z-index:9999;pointer-events:none;
    width:${SIZE}px;height:${SIZE}px;
    background:#7c3aed;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    color:white;font-size:14px;
    left:${startX}px;top:${startY}px;
    will-change:transform,opacity;
  `;
  el.textContent = '🛒';
  document.body.appendChild(el);

  el.animate(
    [
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${(endX - startX) * 0.4}px, ${Math.min(startY, endY) - startY - 60}px) scale(1.1)`, opacity: 1, offset: 0.4 },
      { transform: `translate(${endX - startX}px, ${endY - startY}px) scale(0.3)`, opacity: 0 },
    ],
    { duration: 650, easing: 'cubic-bezier(0.25,0.46,0.45,0.94)', fill: 'forwards' },
  ).onfinish = () => el.remove();
}
