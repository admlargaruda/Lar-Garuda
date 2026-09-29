"use client";

import { useState } from "react";

type CartButtonProps = {
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
  };
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
};

export default function CartButton({
  product,
}: CartButtonProps) {
  const [added, setAdded] = useState(false);

  const addToCart = () => {
    const savedCart = localStorage.getItem("lar-garuda-cart");

    let cart: CartItem[] = [];

    try {
      cart = savedCart ? JSON.parse(savedCart) : [];
    } catch {
      cart = [];
    }

    const index = cart.findIndex(
      (item) => item.id === product.id
    );

    if (index !== -1) {
      cart[index] = {
        ...cart[index],
        quantity: cart[index].quantity + 1,
      };
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
      });
    }

    localStorage.setItem(
      "lar-garuda-cart",
      JSON.stringify(cart)
    );

    setAdded(true);

    setTimeout(() => {
      setAdded(false);
    }, 1000);
  };

  return (
    <button
      type="button"
      onClick={addToCart}
      className="mt-4 flex w-full items-center justify-center rounded-full border border-[#2f241c] px-8 py-4 font-medium text-[#2f241c] transition hover:bg-[#e5ded3]"
    >
      {added
        ? "✓ Berhasil Ditambahkan"
        : "🛒 Tambah ke Keranjang"}
    </button>
  );
}