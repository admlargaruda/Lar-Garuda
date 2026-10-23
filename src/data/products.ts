export type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  description: string;
  stock: number;
  category: string;
};

export type CategoryPreview = {
  category: string;
  products: Product[];
};