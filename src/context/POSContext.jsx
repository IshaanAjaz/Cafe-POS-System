import React, {createContext, useState} from 'react';

export const POSContext = createContext();

export const POSProvider = ({children}) => {
  const [cart, setCart] = useState([]);

  // Add item to cart - Handles Variants
  const addToCart = item => {
    setCart(prev => {
      // Create a unique Cart ID to distinguish variants
      // If item has a variantName, cartId is "ID-Variant". Else just "ID"
      const variantSuffix = item.variantName ? `-${item.variantName}` : '';
      const uniqueId = `${item.id}${variantSuffix}`;

      const existing = prev.find(i => i.cartId === uniqueId);

      if (existing) {
        return prev.map(i =>
          i.cartId === uniqueId ? {...i, qty: i.qty + 1} : i,
        );
      }

      return [
        ...prev,
        {
          ...item,
          cartId: uniqueId, // New internal ID for cart tracking
          qty: 1,
          // If it's a variant, append the name to display name for the bill
          name: item.variantName
            ? `${item.name} (${item.variantName})`
            : item.name,
        },
      ];
    });
  };

  // Update quantity - Uses cartId
  const updateQty = (cartId, delta) => {
    setCart(prev =>
      prev.map(item => {
        if (item.cartId === cartId) {
          const newQty = Math.max(1, item.qty + delta);
          return {...item, qty: newQty};
        }
        return item;
      }),
    );
  };

  // Remove - Uses cartId
  const removeFromCart = cartId =>
    setCart(prev => prev.filter(item => item.cartId !== cartId));

  const clearCart = () => setCart([]);
  const loadCart = items => setCart(items);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <POSContext.Provider
      value={{
        cart,
        addToCart,
        updateQty,
        removeFromCart,
        clearCart,
        loadCart,
        cartTotal,
      }}>
      {children}
    </POSContext.Provider>
  );
};
