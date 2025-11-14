/* eslint-disable prefer-const */
interface PixData {
  amount: number;               // valor (ex.: 25)
  pixKey?: string;              // opcional – default 11398391441
  merchantName?: string;        // opcional – default "IGOR WAGNER"
  city?: string;                // opcional – default "BRASIL"
}

/**
 * Gera BR Code exatamente como o banco aceitou:
 * - GUI: br.gov.bcb.pix (minúsculo)
 * - Chave: 11398391441 (default)
 * - Nome: IGOR WAGNER (default)
 * - Cidade: BRASIL (default)
 * - TXID: sempre "***"
 * - Campos e comprimentos idênticos ao exemplo
 */
export function generatePixQRCode({
  amount,
  pixKey = "51801311000190",
  merchantName = "IGOR WAGNER",
  city = "BRASIL",
}: PixData): string {
  const formattedAmount = Number(amount).toFixed(2);

  const cleanName = merchantName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s]/gi, "")
    .substring(0, 25)
    .trim()
    .toUpperCase();

  const cleanCity = city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s]/gi, "")
    .substring(0, 15)
    .trim()
    .toUpperCase();

  const pixDomain = "br.gov.bcb.pix";   // minúsculo
  const txid = "***";                   // fixo, igual ao seu exemplo

  function pad2(n: number | string) {
    return String(n).padStart(2, "0");
  }

  // 26 (Merchant Account Information): 00 GUI + 01 CHAVE
  const merchantAccInfo = [
    "00", pad2(pixDomain.length), pixDomain,
    "01", pad2(pixKey.length),    pixKey,
  ].join("");
  const merchantField = `26${pad2(merchantAccInfo.length)}${merchantAccInfo}`;

  // 62 (Additional Data): 05 + len(txid) + txid
  // no seu exemplo: 62 07 0503 ***
  const txidField = `62${pad2(txid.length + 4)}0503${txid}`;

  // payload no mesmo layout do exemplo
  let payload = [
    "000201",
    merchantField,
    "52040000",
    "5303986",
    `54${pad2(formattedAmount.length)}${formattedAmount}`,
    "5802BR",
    `59${pad2(cleanName.length)}${cleanName}`,
    `60${pad2(cleanCity.length)}${cleanCity}`,
    txidField,
    "6304",
  ].join("");

  const crc16 = calculateCRC16(payload);
  return payload + crc16;
}

function calculateCRC16(str: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;
  for (let pos = 0; pos < str.length; pos++) {
    crc ^= str.charCodeAt(pos) << 8;
    for (let i = 0; i < 8; i++) {
      crc = ((crc << 1) ^ (crc & 0x8000 ? polynomial : 0)) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function generateTxId(): string {
  return Math.random().toString(36).substring(2, 14).toUpperCase()
}
