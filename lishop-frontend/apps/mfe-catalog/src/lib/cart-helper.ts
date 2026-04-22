const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export async function addToCart(productId: string, quantity: number): Promise<void> {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('lishop_at') : null;
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
    window.localStorage.setItem('lishop_cart_count', String((cart.items as unknown[]).length));
  }
}
