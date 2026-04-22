'use client';

import CartDrawer from '../../../components/cart-drawer';

export default function CartDrawerPage() {
  return (
    <div className="h-screen w-full">
      <CartDrawer open standalone />
    </div>
  );
}
