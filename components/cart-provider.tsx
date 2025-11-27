"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CartItem, NewCartItem } from "@/lib/cart-types";
import { v4 as uuid } from "uuid";

type CartContextValue = {
  items: CartItem[];
  total: number;
  addItem: (item: NewCartItem) => void;  // 👈 aqui
  removeItem: (id: string) => void;
  clearCart: () => void;
  updateItem: (id: string, patch: Partial<CartItem>) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "energizada-cart-v1";
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // carrega do localStorage
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  // salva no localStorage
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      }
    } catch {
      // ignore
    }
  }, [items]);

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    [items]
  );

  const addItem: CartContextValue["addItem"] = (item) => {
    setItems((curr) => [
      ...curr,
      {
        ...item,
        id: uuid(),
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((curr) => curr.filter((i) => i.id !== id));
  };

  const clearCart = () => setItems([]);

  const updateItem: CartContextValue["updateItem"] = (id, patch) => {
    setItems((curr) =>
      curr.map((i) => (i.id === id ? ({ ...i, ...patch } as CartItem) : i))
    );
  };

  const value: CartContextValue = {
    items,
    total,
    addItem,
    removeItem,
    clearCart,
    updateItem,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de <CartProvider />");
  return ctx;
}
