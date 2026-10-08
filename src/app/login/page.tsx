import { signIn } from "@/auth";
import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  return (
    <div className="space-y-8 pt-16 flex flex-col items-center">
      <div className="text-center">
        <div className="text-7xl animate-float">⚽</div>
        <h1 className="mt-4 text-3xl font-extrabold text-pitch-700 tracking-tight">
          Fútbol de los Miércoles
        </h1>
        <p className="text-base text-pitch-900/60 mt-2 font-medium">
          5 vs 5, todos los miércoles 22:00.
        </p>
        <p className="text-sm text-pitch-900/50 mt-1 italic">
          Organizá, anotate y jugá.
        </p>
      </div>
      <div className="card w-full max-w-sm p-6 flex flex-col items-center">
        <form
          className="w-full"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button className="btn-primary w-full text-lg flex items-center justify-center gap-3 py-3">
            <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Entrar con Google
          </button>
        </form>
      </div>
    </div>
  );
}
