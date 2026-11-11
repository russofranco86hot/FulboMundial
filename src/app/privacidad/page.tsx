import Link from "next/link";
import { Shield, Lock, Trash2, Mail, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Política de Privacidad y Eliminación de Datos — FulboMundial",
  description:
    "Política de privacidad, protección de datos personales y procedimiento de eliminación de cuenta de FulboMundial.",
};

export default function PrivacidadPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-14 animate-fade-in">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-pitch-600 dark:text-pitch-400 hover:underline mb-3"
        >
          <ArrowLeft size={14} /> Volver al inicio
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-pitch-800 dark:text-zinc-100 flex items-center gap-2.5">
          <Shield className="text-pitch-600 dark:text-pitch-400 shrink-0" size={28} />
          Política de Privacidad
        </h1>
        <p className="text-xs text-pitch-900/60 dark:text-zinc-400 mt-1">
          Última actualización: Noviembre 2026 — FulboMundial (fulbomundial.com.ar)
        </p>
      </div>

      <div className="card space-y-4 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
        <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Lock size={18} className="text-pitch-600" />
          1. Información que recopilamos
        </h2>
        <p>
          <strong>FulboMundial</strong> recopila únicamente los datos mínimos necesarios para
          organizar partidos de fútbol entre amigos, gestionar grupos deportivos y llevar
          estadísticas de juego:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Datos de cuenta e inicio de sesión:</strong> Nombre o apodo, dirección de correo
            electrónico e identificador de autenticación (mediante Google OAuth o credenciales de
            correo).
          </li>
          <li>
            <strong>Perfil deportivo:</strong> Posición preferida en cancha, pierna hábil, historial
            de partidos jugados, resultados, votaciones (MVP) y membresía en grupos.
          </li>
          <li>
            <strong>Notificaciones Push (opcional):</strong> Token de suscripción Web Push del
            dispositivo únicamente cuando el usuario acepta recibir avisos de convocatorias o
            resultados.
          </li>
          <li>
            <strong>Pagos:</strong> Las suscripciones al Pase Capitán / PRO se procesan de forma
            externa y segura a través de <strong>Mercado Pago</strong>. FulboMundial no almacena
            números de tarjetas de crédito ni débito.
          </li>
        </ul>
      </div>

      <div className="card space-y-4 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
        <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
          2. Uso de la información
        </h2>
        <p>Los datos recopilados se utilizan exclusivamente para:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Permitirte crear grupos o unirte a grupos existentes mediante código de invitación.</li>
          <li>Armar equipos equilibrados y calcular estadísticas históricas dentro de tu grupo.</li>
          <li>Enviar recordatorios de partidos y notificaciones de solicitudes de ingreso.</li>
          <li>Brindar soporte técnico y administrar las funciones PRO contratadas por el grupo.</li>
        </ul>
        <p>
          <strong>No vendemos, alquilamos ni compartimos tus datos personales</strong> con terceros
          con fines publicitarios.
        </p>
      </div>

      <div
        id="eliminacion-de-datos"
        className="card space-y-4 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed border-red-500/30"
      >
        <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Trash2 size={18} className="text-red-500" />
          3. Eliminación de cuenta y datos personales
        </h2>
        <p>
          En cumplimiento con las políticas de Google Play y Apple App Store, todo usuario puede
          solicitar en cualquier momento la baja definitiva de su cuenta y la eliminación de sus
          datos personales asociados (correo electrónico, vinculación de cuenta Google y
          suscripciones push).
        </p>
        <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800/70 p-4 space-y-2">
          <p className="font-bold text-zinc-900 dark:text-zinc-100">
            ¿Cómo solicitar la eliminación de tu cuenta?
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              Enviá un correo electrónico a{" "}
              <a
                href="mailto:russofranco86@gmail.com?subject=Solicitud%20de%20eliminaci%C3%B3n%20de%20cuenta%20FulboMundial"
                className="font-bold text-pitch-600 dark:text-pitch-400 underline"
              >
                russofranco86@gmail.com
              </a>{" "}
              desde la dirección de email registrada en la aplicación con el asunto{" "}
              <em>&quot;Eliminar mi cuenta de FulboMundial&quot;</em>.
            </li>
            <li>
              Procesaremos la baja y desvinculación completa de tus credenciales, correo y tokens de
              notificación en un plazo máximo de <strong>72 horas hábiles</strong>.
            </li>
          </ol>
        </div>
      </div>

      <div className="card space-y-3 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
        <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Mail size={18} className="text-pitch-600" />
          4. Contacto
        </h2>
        <p>
          Ante cualquier consulta sobre privacidad o tratamiento de datos en{" "}
          <strong>FulboMundial</strong>, podés escribirnos a:{" "}
          <a
            href="mailto:russofranco86@gmail.com"
            className="font-bold text-pitch-600 dark:text-pitch-400 underline"
          >
            russofranco86@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
