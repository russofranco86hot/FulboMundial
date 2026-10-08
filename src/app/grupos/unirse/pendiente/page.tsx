import Link from "next/link";
import { Clock, Home } from "lucide-react";

export default async function UnirsePendientePage({
  searchParams,
}: {
  searchParams: Promise<{ grupo?: string; nombre?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6 animate-fade-in text-center">
      <div className="text-5xl animate-bounce-in">⏳</div>
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold text-pitch-700 dark:text-zinc-100">Solicitud enviada</h1>
        <p className="text-pitch-900/70 dark:text-zinc-400 max-w-xs">
          Tu solicitud para unirte a{" "}
          <strong className="text-pitch-700 dark:text-pitch-400">
            {params.nombre ? decodeURIComponent(params.nombre) : "el grupo"}
          </strong>{" "}
          fue enviada. El admin la revisará pronto.
        </p>
      </div>

      <div className="card w-full max-w-xs space-y-3">
        <div className="flex items-center gap-3 text-sm text-pitch-900/70 dark:text-zinc-400">
          <Clock size={18} className="text-amber-500 shrink-0" />
          <span>Vas a recibir acceso una vez que el admin lo apruebe.</span>
        </div>
      </div>

      <Link href="/grupos" className="btn-ghost flex items-center gap-2">
        <Home size={16} /> Volver al inicio
      </Link>
    </div>
  );
}
