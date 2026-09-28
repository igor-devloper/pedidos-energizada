// lib/cart-types.ts
export type ProdutoId =
  | "KIT_UNIFORME"
  | "CAMISA"
  | "CANECA"
  | "TIRANTE"
  | "KIT_CANECA";

export type Modelo = "BRANCA" | "AZUL" | "AZUL_SEM_MANGA";
export type Tamanho = "PP" | "P" | "M" | "G" | "GG" | "XG";

type CartBase = {
  id: string;
  productId: ProdutoId;
  label: string;
  unitPrice: number;
  quantity: number;
};

export type CartUniformeItem = CartBase & {
  kind: "UNIFORME";
  tipoPedido: "KIT" | "BLUSA";
  modelo?: Modelo;
  tamanho?: Tamanho;
  nomeCamisa?: string;
  numeroCamisa?: string;
  jaTemCamisa?: boolean;        // se já possui camisa
  numeroCamisaAtual?: string;   // número que já usa HOJE

  // quando ainda não tem camisa: até 3 opções
  numeroOpcao1?: string;
  numeroOpcao2?: string;
  numeroOpcao3?: string;
};

export type CartCanecaItem = CartBase & {
  kind: "CANECA";
  tipoProduto: "CANECA" | "TIRANTE" | "KIT";
};

export type CartItem = CartUniformeItem | CartCanecaItem;

// ✨ tipo específico para "novo item" (sem id)
export type NewCartItem =
  | Omit<CartUniformeItem, "id">
  | Omit<CartCanecaItem, "id">;

export type CartPayload = {
  items: CartItem[];
  nome: string;
  email: string;
  telefone: string;
  total: number;
};
