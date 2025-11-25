import Image from "next/image";
import Link from "next/link";

export default function FinalPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-yellow-300 via-blue-800 to-blue-950 px-4 py-12 flex items-center justify-center">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 text-center p-6 bg-blue-900/40 backdrop-blur-xl rounded-3xl border border-blue-700 shadow-2xl">

        {/* LOGO GRANDE */}
        <div className="relative w-60 h-28 md:w-80 md:h-36 drop-shadow-[0_0_18px_rgba(0,0,0,0.8)]">
          <Image
            src="/energizada-logo.png"
            alt="Atlética Energizada"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* TÍTULO */}
        <h1 className="text-3xl font-extrabold text-yellow-300 drop-shadow">
          Pedido Confirmado! ⚡
        </h1>

        {/* TEXTO */}
        <p className="text-sm md:text-base text-blue-100 leading-relaxed max-w-sm">
          Seu pagamento foi enviado e estamos verificando tudo certinho.  
          Assim que confirmarmos, você receberá um aviso pelo WhatsApp ou e-mail.
        </p>

        {/* BOTÃO */}
        <Link
          href="/"
          className="
            mt-2 inline-flex items-center justify-center 
            rounded-full bg-yellow-400 px-8 py-3 
            text-blue-900 font-bold text-sm md:text-base
            hover:bg-yellow-500 transition
            shadow-md
          "
        >
          Fazer outro pedido
        </Link>
      </div>
    </main>
  );
}
