"use client";

import {
  useRef,
  useState,
  useMemo,
  ChangeEvent,
  DragEvent,
} from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import {
  Copy,
  Check,
  Download,
  UploadCloud,
  Image as ImageIcon,
  FileText,
} from "lucide-react";

import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface PixPaymentProps {
  amount: number;
  orderId: string; // txid
  pixPayload: string;
}

export function PixPayment({ amount, orderId, pixPayload }: PixPaymentProps) {
  const [copied, setCopied] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // 🔵🟡 PALETA ENERGIZADA
  const COLOR_PRIMARY = "#0034A3"; // azul forte
  const COLOR_SECONDARY = "#F2C300"; // amarelo
  const COLOR_BG = "#0A0A13"; // preto/navy

  const PIX_KEY = "atleticaenergizada@cear.ufpb.br";
  const ACCOUNT_HOLDER = "Ana Clara Vilar Bandeira";
  const BANK_NAME = "Pic Pay";

  const isPDF = useMemo(
    () =>
      proofFile
        ? proofFile.type === "application/pdf" ||
          proofFile.name.toLowerCase().endsWith(".pdf")
        : false,
    [proofFile]
  );

  const handleCopy = async (text: string, isKey = false) => {
    await navigator.clipboard.writeText(text);
    if (isKey) {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadQRCode = () => {
    const svg = svgRef.current;
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);

    const img = new Image();
    const blob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 512;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);

        const pngUrl = canvas
          .toDataURL("image/png")
          .replace("image/png", "image/octet-stream");

        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `pix-qrcode-${orderId}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }

      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileChoose = async (file?: File) => {
    if (!file) return;
    setProofFile(file);

    if (file.type.startsWith("image/")) {
      const preview = await fileToBase64(file);
      setProofPreview(preview);
    } else {
      setProofPreview("");
    }
  };

  const onInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileChoose(f);
  };

  const onDrop = async (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileChoose(f);
  };

  const router = useRouter();

  const handleSendProof = async () => {
    if (!proofFile) {
      toast.error("Envie o comprovante para confirmar o pedido.");
      return;
    }

    try {
      setIsSending(true);
      const proofBase64 = await fileToBase64(proofFile);

      const res = await fetch("/api/pedidos/upload-comprovante", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txid: orderId,
          comprovanteBase64: proofBase64,
          valorPago: amount,
        }),
      });

      if (!res.ok) {
        toast.error("Erro ao enviar comprovante. Tente novamente.");
        return;
      }

      toast.success("Comprovante enviado com sucesso!");
      router.push("/final");
    } catch (err) {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card
        className="shadow-xl border-blue-900 bg-gradient-to-b from-blue-950 via-blue-900 to-blue-800 text-white"
        style={{ borderColor: COLOR_PRIMARY }}
      >
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-yellow-400">
            Pagamento via PIX ⚡
          </CardTitle>
          <p className="text-sm text-blue-200">Pedido #{orderId}</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Valor */}
          <div className="text-center">
            <p className="text-sm text-blue-200 mb-1">Valor a pagar agora</p>
            <p className="text-4xl font-extrabold text-yellow-400 drop-shadow">
              R$ {amount.toFixed(2)}
            </p>
          </div>

          <Separator className="bg-blue-700" />

          {/* Dados bancários */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-yellow-400">
              Dados Bancários
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg p-3 bg-blue-800 border border-blue-700">
                <Label className="text-xs text-blue-300">Banco</Label>
                <p className="font-medium text-white">{BANK_NAME}</p>
              </div>

              <div className="rounded-lg p-3 bg-blue-800 border border-blue-700">
                <Label className="text-xs text-blue-300">Titular</Label>
                <p className="font-medium text-white">{ACCOUNT_HOLDER}</p>
              </div>

              <div className="sm:col-span-2 rounded-lg p-3 bg-blue-800 border border-blue-700">
                <Label className="text-xs text-blue-300">Chave PIX</Label>

                <div className="flex items-center gap-2 mt-1">
                  <p className="break-all font-medium text-white flex-1">
                    {PIX_KEY}
                  </p>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(PIX_KEY, true)}
                    className="hover:bg-blue-700"
                  >
                    {copiedKey ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4 text-yellow-400" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-blue-700" />

          {/* PIX copia e cola */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-yellow-400">PIX</h3>

            <div className="flex flex-col gap-6 sm:flex-row">
              <div className="flex-1 space-y-2">
                <Label className="text-xs text-blue-300">Copia e Cola</Label>

                <div className="rounded-lg p-3 bg-blue-800 border border-blue-700">
                  <div className="flex items-start gap-2">
                    <p className="break-all font-mono text-xs text-white flex-1">
                      {pixPayload}
                    </p>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-blue-700"
                      onClick={() => handleCopy(pixPayload)}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-yellow-400" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 rounded-lg bg-white border border-blue-600">
                  <QRCodeSVG
                    value={pixPayload}
                    size={160}
                    level="H"
                    includeMargin
                    ref={svgRef}
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadQRCode}
                  className="border-yellow-400 text-yellow-400 hover:bg-yellow-400/20"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Baixar QR Code
                </Button>
              </div>
            </div>
          </div>

          <Separator className="bg-blue-700" />

          {/* Upload comprovante */}
          <div className="space-y-3">
            <Label className="text-xs text-blue-300">
              Comprovante de Pagamento (obrigatório)
            </Label>

            <label
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={[
                "flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed p-4 transition",
                isDragging
                  ? "border-green-400 bg-blue-700"
                  : "border-blue-700 bg-blue-800 hover:bg-blue-700",
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-blue-900 p-2">
                  {isPDF ? (
                    <FileText className="h-5 w-5 text-yellow-400" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-yellow-400" />
                  )}
                </div>

                <div>
                  <p className="text-sm text-white font-medium">
                    Arraste e solte o arquivo ou clique para selecionar
                  </p>
                  <p className="text-xs text-blue-300">
                    PNG, JPG ou PDF — até ~10MB
                  </p>
                </div>
              </div>

              <div className="shrink-0 rounded-md bg-yellow-400/20 px-3 py-2 text-xs font-medium text-yellow-400">
                <UploadCloud className="mr-1 inline-block h-4 w-4" />
                Upload
              </div>

              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={onInputChange}
              />
            </label>

            {proofFile && (
              <div className="rounded-lg border border-blue-700 bg-blue-800 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-blue-900 p-2">
                      {isPDF ? (
                        <FileText className="h-5 w-5 text-yellow-400" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-yellow-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">
                        {proofFile.name}
                      </p>
                      <p className="text-xs text-blue-300">
                        {(proofFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  {!isPDF && proofPreview && (
                    <img
                      src={proofPreview}
                      alt="Prévia do comprovante"
                      className="h-16 w-16 rounded-md object-cover ring-1 ring-blue-700"
                    />
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={handleSendProof}
              disabled={!proofFile || isSending}
              className="w-full bg-yellow-400 text-blue-900 hover:bg-yellow-500 font-bold"
            >
              {isSending ? "Enviando comprovante..." : "Enviar comprovante"}
            </Button>
          </div>

          <div className="bg-blue-800 border border-blue-700 rounded-lg p-4 space-y-2">
            <p className="font-semibold text-yellow-400">Instruções:</p>

            <ol className="text-sm space-y-1 list-decimal list-inside text-blue-200">
              <li>Acesse o app do seu banco.</li>
              <li>Escolha pagamento PIX.</li>
              <li>Use o QR Code ou Copia e Cola.</li>
              <li>Envie o comprovante acima.</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
