// lib/taxas-mercado-pago.ts

// Métodos que você quer controlar
export type MetodoPagamento =
  | "pix"
  | "credito"
  | "saldo_mp"
  | "boleto";

// Parcelas de 1 a 12
export type Parcelas = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

// 🔹 Taxa fixa por método (processamento)
// use em forma decimal -> 4,98% = 0.0498
export const taxasProcessamento: Record<MetodoPagamento, number> = {
  credito: 0.0498,      // 4,98%
  saldo_mp: 0.0499,     // 4,99%
  pix: 0.0099,          // 0,99%
  boleto: 3.49 / 100,   // R$ 3,49 (~3,49%)
};

// 🔹 Taxa extra por parcelamento (apenas crédito, exemplo)
// se não quiser taxa em Xx, deixa 0
export const taxasParcelamento: Record<Parcelas, number> = {
  1: 0,
  2: 0.02,
  3: 0.03,
  4: 0.04,
  5: 0.05,
  6: 0.06,
  7: 0.07,
  8: 0.08,
  9: 0.09,
  10: 0.10,
  11: 0.11,
  12: 0.12,
};

// 🔹 Função principal: recebe valor base (sem taxas) e devolve:
//   - quanto o cliente vai pagar (com taxa)
//   - quanto foi de taxa em R$
//   - % total de taxa
export function calcularTotalComTaxas(
  valorBase: number,
  metodoPagamento: MetodoPagamento,
  parcelas: Parcelas = 1
) {
  if (valorBase <= 0) {
    return {
      totalConsumidor: 0,
      taxaTotal: 0,
      taxaPercentual: 0,
    };
  }

  const taxaMetodo = taxasProcessamento[metodoPagamento] ?? 0;

  const taxaParcela =
    metodoPagamento === "credito"
      ? taxasParcelamento[parcelas] ?? 0
      : 0;

  const taxaPercentual = taxaMetodo + taxaParcela;

  const totalConsumidor = Number(
    (valorBase * (1 + taxaPercentual)).toFixed(2)
  );

  const taxaTotal = Number((totalConsumidor - valorBase).toFixed(2));

  return {
    totalConsumidor, // valor final pro consumidor
    taxaTotal,       // quanto é só de taxa
    taxaPercentual,  // % total (ex: 0.0598 = 5,98 %)
  };
}
