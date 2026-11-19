"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Trophy, Calendar, Users, Bell, Flag, ArrowUp, ArrowDown, ListOrdered, RotateCcw } from "lucide-react";
import { adminGroupSaveSettings, adminGroupStartNewChampionship } from "../actions";
import { ProCard } from "@/components/pro-card";
import { useApiData, useRouteParams } from "@/lib/client-api";
import {
  DEFAULT_SIGNUP_PRIORITY_ORDER,
  SIGNUP_CRITERIA_META,
  parseSignupPriorityOrder,
  type SignupCriterion,
} from "@/lib/selection";

type ConfigData = {
  allowed: boolean;
  group?: {
    id: number;
    name: string;
    slug: string;
    format: string;
    defaultCapacity: number;
    defaultDayOfWeek: number | null;
    defaultTime: string | null;
    ptsWin: number;
    ptsDraw: number;
    ptsLoss: number;
    teamAName: string | null;
    teamBName: string | null;
    adminNotifyPreference?: string | null;
    signupPriorityOrder?: string | null;
    championshipName?: string | null;
    championshipEndDate?: string | null;
    championshipSummary?: string | null;
  };
  isPro?: boolean;
};

function GroupAdminConfigContent() {
  const { groupSlug } = useRouteParams();
  const searchParams = useSearchParams();
  const saved = searchParams.get("saved");

  const { data, loading } = useApiData<ConfigData>(
    groupSlug ? `/api/page-data/group/${encodeURIComponent(groupSlug)}/admin/configuracion` : null
  );

  const [criteriaOrder, setCriteriaOrder] = useState<SignupCriterion[]>(
    () => [...DEFAULT_SIGNUP_PRIORITY_ORDER]
  );

  useEffect(() => {
    if (data?.group) {
      setCriteriaOrder(parseSignupPriorityOrder(data.group.signupPriorityOrder));
    }
  }, [data?.group?.id, data?.group?.signupPriorityOrder]);

  if (!groupSlug || (loading && !data) || !data?.allowed || !data.group) {
    return <div className="pt-8 text-center text-sm text-zinc-500">Cargando configuración...</div>;
  }

  const { group, isPro = false } = data;
  const disabledCriteria = DEFAULT_SIGNUP_PRIORITY_ORDER.filter(
    (c) => !criteriaOrder.includes(c)
  );

  const moveCriterion = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= criteriaOrder.length) return;
    setCriteriaOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const makeFirstCriterion = (idx: number) => {
    if (idx <= 0) return;
    setCriteriaOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.unshift(item);
      return next;
    });
  };

  const toggleCriterion = (c: SignupCriterion, enable: boolean) => {
    setCriteriaOrder((prev) => {
      if (enable) {
        return prev.includes(c) ? prev : [...prev, c];
      }
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item !== c);
    });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <ProCard groupName={group.name} groupSlug={group.slug} isPro={isPro} />

      {saved === "1" && (
        <div className="rounded-2xl bg-green-500/15 p-4 text-sm font-semibold text-green-800 dark:text-green-300 border border-green-500/30 flex items-center gap-3 shadow-glow-green">
          <CheckCircle2 className="text-green-600 dark:text-green-400 shrink-0" size={24} />
          <span>¡Configuración guardada correctamente! La tabla histórica y el cronograma ya usan estos valores.</span>
        </div>
      )}

      <form action={adminGroupSaveSettings} className="space-y-5">
        <input type="hidden" name="groupId" value={group.id} />
        <input type="hidden" name="groupSlug" value={group.slug} />

        <div className="card space-y-4 border-pitch-200/80 dark:border-zinc-800">
          <div className="flex items-center gap-2 border-b border-pitch-100/60 dark:border-zinc-800 pb-2">
            <Trophy size={20} className="text-amber-500" />
            <h2 className="font-bold text-pitch-800 dark:text-zinc-100">Sistema de Puntos (Tabla Histórica)</h2>
          </div>

          <p className="text-xs text-pitch-900/60 dark:text-zinc-400">
            Elegí cuántos puntos suma cada jugador según el resultado del partido.
            Los cambios se aplican automáticamente a la tabla histórica del grupo.
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-pitch-50/50 dark:bg-zinc-800/50 border border-pitch-100 dark:border-zinc-700 text-center">
              <label className="block text-xs font-bold text-pitch-700 dark:text-pitch-400 mb-1">Victoria (G)</label>
              <input type="number" name="ptsWin" defaultValue={group.ptsWin ?? 3} min={0} max={10} className="input text-center font-extrabold text-xl py-1.5 w-full" required />
              <span className="text-[10px] text-pitch-900/40 dark:text-zinc-500 mt-1 block">pts</span>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-zinc-700 text-center">
              <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">Empate (E)</label>
              <input type="number" name="ptsDraw" defaultValue={group.ptsDraw ?? 2} min={0} max={10} className="input text-center font-extrabold text-xl py-1.5 w-full" required />
              <span className="text-[10px] text-amber-900/40 dark:text-zinc-500 mt-1 block">pts</span>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-center">
              <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">Derrota (P)</label>
              <input type="number" name="ptsLoss" defaultValue={group.ptsLoss ?? 1} min={0} max={10} className="input text-center font-extrabold text-xl py-1.5 w-full" required />
              <span className="text-[10px] text-zinc-400 mt-1 block">pts</span>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-3 text-xs space-y-1.5 text-pitch-900/70 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
            <p className="font-semibold text-pitch-800 dark:text-zinc-200">Ejemplos comunes:</p>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li><strong>3 - 2 - 1 (Amateur / Asistencia):</strong> Premia venir a jugar aunque se pierda (3 por ganar, 2 por empatar, 1 por asistir y perder).</li>
              <li><strong>3 - 1 - 0 (Fútbol Tradicional):</strong> Sistema estándar de ligas (3 victoria, 1 empate, 0 derrota).</li>
              <li><strong>2 - 1 - 0 (Clásico Antiguo):</strong> El formato histórico tradicional (2 victoria, 1 empate, 0 derrota).</li>
            </ul>
          </div>
        </div>

        <div className="card space-y-4 border-pitch-200/80 dark:border-zinc-800">
          <div className="flex items-center gap-2 border-b border-pitch-100/60 dark:border-zinc-800 pb-2">
            <Calendar size={20} className="text-pitch-600" />
            <h2 className="font-bold text-pitch-800 dark:text-zinc-100">Día y Horario Habitual del Partido</h2>
          </div>

          <p className="text-xs text-pitch-900/60 dark:text-zinc-400">
            Se utiliza para sugerir la fecha y hora al abrir un nuevo partido.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-pitch-900/70 dark:text-zinc-300">Día habitual de juego</label>
              <select
                name="defaultDayOfWeek"
                defaultValue={group.defaultDayOfWeek !== null && group.defaultDayOfWeek !== undefined ? String(group.defaultDayOfWeek) : ""}
                className="input w-full"
              >
                <option value="">Sin día fijo (se define por partido)</option>
                <option value="1">Lunes</option>
                <option value="2">Martes</option>
                <option value="3">Miércoles</option>
                <option value="4">Jueves</option>
                <option value="5">Viernes</option>
                <option value="6">Sábado</option>
                <option value="0">Domingo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-pitch-900/70 dark:text-zinc-300">Hora habitual</label>
              <input type="time" name="defaultTime" defaultValue={group.defaultTime ?? "21:00"} className="input w-full" required />
            </div>
          </div>
        </div>

        <div className="card space-y-4 border-amber-200/80 dark:border-amber-900/40">
          <div className="flex items-center gap-2 border-b border-amber-100/60 dark:border-zinc-800 pb-2">
            <Flag size={20} className="text-amber-500" />
            <h2 className="font-bold text-pitch-800 dark:text-zinc-100">Campeonato en Curso</h2>
          </div>

          <p className="text-xs text-pitch-900/60 dark:text-zinc-400">
            Asignale un nombre al torneo vigente (se mostrará de forma discreta en el inicio del grupo para distinguirlo) y definí su fecha de cierre (ej: <em>Miércoles 30 de Diciembre</em>).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-pitch-900/70 dark:text-zinc-300">
                Nombre del campeonato
              </label>
              <input
                type="text"
                name="championshipName"
                defaultValue={group.championshipName ?? ""}
                placeholder="Ej: Torneo Clausura 2026"
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-pitch-900/70 dark:text-zinc-300">
                Fecha fin de campeonato (opcional)
              </label>
              <input
                type="date"
                name="championshipEndDate"
                defaultValue={group.championshipEndDate ?? ""}
                className="input w-full"
              />
            </div>
          </div>
        </div>

        <div className="card space-y-4 border-pitch-200/80 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-2 border-b border-pitch-100/60 dark:border-zinc-800 pb-2 flex-wrap">
            <div className="flex items-center gap-2">
              <ListOrdered size={20} className="text-emerald-600 dark:text-emerald-400" />
              <h2 className="font-bold text-pitch-800 dark:text-zinc-100">
                Orden de Prioridad de Jugadores (Cupo y Suplentes)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setCriteriaOrder([...DEFAULT_SIGNUP_PRIORITY_ORDER])}
              className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={12} /> Restablecer 1→2→3→4
            </button>
          </div>

          <input type="hidden" name="signupPriorityOrder" value={criteriaOrder.join(",")} />

          <p className="text-xs text-pitch-900/60 dark:text-zinc-400">
            Cuando se anotan más jugadores que el cupo del partido, se evalúan en este orden (de arriba hacia abajo). Podés reordenar o alternar qué criterios usar y en cada partido seguís teniendo el ajuste manual si hace falta.
          </p>

          <div className="space-y-2">
            {criteriaOrder.map((c, idx) => {
              const meta = SIGNUP_CRITERIA_META[c];
              return (
                <div
                  key={c}
                  className="p-3 rounded-2xl bg-pitch-50/60 dark:bg-zinc-800/50 border border-pitch-200/70 dark:border-zinc-700 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-pitch-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-pitch-900 dark:text-zinc-100">
                        {meta.title}
                      </p>
                      <p className="text-[11px] text-pitch-900/60 dark:text-zinc-400 leading-snug">
                        {meta.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveCriterion(idx, -1)}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 disabled:opacity-30 hover:bg-zinc-50"
                      title="Subir prioridad"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCriterion(idx, 1)}
                      disabled={idx === criteriaOrder.length - 1}
                      className="p-1.5 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 disabled:opacity-30 hover:bg-zinc-50"
                      title="Bajar prioridad"
                    >
                      <ArrowDown size={13} />
                    </button>
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => makeFirstCriterion(idx)}
                        className="text-[10px] font-extrabold px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
                        title="Poner como 1° criterio principal"
                      >
                        1°
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleCriterion(c, false)}
                      disabled={criteriaOrder.length <= 1}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-zinc-200/70 hover:bg-red-100 text-zinc-700 hover:text-red-700 dark:bg-zinc-700 dark:text-zinc-300 disabled:opacity-30"
                      title="Desactivar este criterio"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {disabledCriteria.length > 0 && (
            <div className="pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-700 space-y-2">
              <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                Criterios desactivados (podés volver a activarlos):
              </p>
              <div className="flex flex-wrap gap-2">
                {disabledCriteria.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCriterion(c, true)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-pitch-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700"
                  >
                    + {SIGNUP_CRITERIA_META[c].title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl text-[11px] text-zinc-500 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60 space-y-1">
            <p>⏱️ <strong>Cierre 24 hs antes:</strong> los jugadores anotados hasta 24 hs antes del partido tienen prioridad sobre quienes se anoten luego del cierre.</p>
            <p>✋ <strong>Ajuste manual:</strong> en la pestaña <em>Partido</em> podés subir, bajar o pasar de titular a suplente manualmente en cualquier momento.</p>
          </div>
        </div>

        <div className="card space-y-4 border-pitch-200/80 dark:border-zinc-800">
          <div className="flex items-center gap-2 border-b border-pitch-100/60 dark:border-zinc-800 pb-2">
            <Users size={20} className="text-blue-600" />
            <h2 className="font-bold text-pitch-800 dark:text-zinc-100">Formato y Cupos por Defecto</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-pitch-900/70 dark:text-zinc-300">Formato de juego</label>
              <select name="format" defaultValue={group.format} className="input w-full">
                <option value="F5">Fútbol 5</option>
                <option value="F6">Fútbol 6</option>
                <option value="F7">Fútbol 7</option>
                <option value="F8">Fútbol 8</option>
                <option value="F11">Fútbol 11</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-pitch-900/70 dark:text-zinc-300">Capacidad total de titulares</label>
              <input type="number" name="defaultCapacity" defaultValue={group.defaultCapacity} min={4} max={30} className="input w-full" required />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-pitch-900/70 dark:text-zinc-300">Nombre del grupo</label>
            <input name="name" defaultValue={group.name} className="input w-full" required />
          </div>
        </div>

        <div className="card space-y-4 border-pitch-200/80 dark:border-zinc-800">
          <div className="flex items-center gap-2 border-b border-pitch-100/60 dark:border-zinc-800 pb-2">
            <span className="text-xl">👕</span>
            <h2 className="font-bold text-pitch-800 dark:text-zinc-100">Nombres de los Equipos (Por Defecto)</h2>
          </div>

          <p className="text-xs text-pitch-900/60 dark:text-zinc-400">
            Personalizá cómo se llaman los 2 bandos de tu grupo en lugar del clásico Claro vs Oscuro.
            Por ejemplo: <em>"Pechera" vs "Sin pechera"</em>, <em>"Blancas" vs "Negras"</em>, o los nombres que ustedes usen.
            Se aplicará en toda la app: Cancha 2D, Equipos, Resultado, Historial y WhatsApp.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-pitch-50/50 dark:bg-zinc-800/40 border border-pitch-200 dark:border-zinc-700">
              <label className="block text-xs font-bold text-pitch-700 dark:text-pitch-400 mb-1 flex items-center gap-1.5">
                <span>⚪</span> Nombre Equipo A
              </label>
              <input type="text" name="teamAName" defaultValue={group.teamAName ?? "Claro"} placeholder="Ej: Pechera, Blancas, Claro..." className="input w-full font-bold" required />
              <span className="text-[11px] text-pitch-900/50 dark:text-zinc-400 mt-1 block">
                Bando titular A (habitualmente camisetas claras / con pechera)
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-zinc-800/40 border border-blue-200 dark:border-zinc-700">
              <label className="block text-xs font-bold text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1.5">
                <span>⚫</span> Nombre Equipo B
              </label>
              <input type="text" name="teamBName" defaultValue={group.teamBName ?? "Oscuro"} placeholder="Ej: Sin pechera, Negras, Oscuro..." className="input w-full font-bold" required />
              <span className="text-[11px] text-blue-900/50 dark:text-zinc-400 mt-1 block">
                Bando rival B (habitualmente camisetas oscuras / sin pechera)
              </span>
            </div>
          </div>
        </div>

        <div className="card space-y-4 border-pitch-200/80 dark:border-zinc-800">
          <div className="flex items-center gap-2 border-b border-pitch-100/60 dark:border-zinc-800 pb-2">
            <Bell size={20} className="text-pitch-600 dark:text-pitch-400" />
            <h2 className="font-bold text-pitch-800 dark:text-zinc-100">Notificaciones para el Administrador</h2>
          </div>

          <p className="text-xs text-pitch-900/60 dark:text-zinc-400">
            Elegí cómo querés que te avisemos cuando un jugador solicita unirse al grupo mediante tu código de invitación.
          </p>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-pitch-900/70 dark:text-zinc-300">
              Canal de notificación preferido
            </label>
            <select name="adminNotifyPreference" defaultValue={group.adminNotifyPreference ?? "both"} className="input w-full font-medium">
              <option value="both">🔔 Notificación Push en el celular + ✉️ Correo electrónico (Recomendado)</option>
              <option value="push">🔔 Solo Notificación Push (en el navegador o celular)</option>
              <option value="email">✉️ Solo Correo electrónico</option>
              <option value="none">🔕 Desactivadas (solo revisar manualmente en el panel)</option>
            </select>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1 border border-zinc-200/60 dark:border-zinc-700/60">
            <p>💡 <strong>Al aceptar o rechazar:</strong></p>
            <p>El jugador que solicitó unirse recibirá siempre un correo con estilo épico y futbolístico confirmando si ya tiene la camiseta puesta o la decisión del cuerpo técnico.</p>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full py-3 font-bold text-base shadow-glow-green">
          💾 Guardar configuración
        </button>
      </form>

      <form
        action={adminGroupStartNewChampionship}
        onSubmit={(e) => {
          if (
            !window.confirm(
              "¿Cerrar el campeonato actual y comenzar uno nuevo? El torneo actual se guardará con su tabla final y reseña en el Historial, y las estadísticas e historial actuales arrancarán todos en blanco."
            )
          ) {
            e.preventDefault();
          }
        }}
        className="card space-y-4 border-2 border-amber-400/60 bg-amber-50/40 dark:bg-amber-950/15 dark:border-amber-800/60"
      >
        <input type="hidden" name="groupId" value={group.id} />
        <input type="hidden" name="groupSlug" value={group.slug} />

        <div className="flex items-center gap-2 border-b border-amber-200/70 dark:border-zinc-800 pb-2">
          <Trophy size={20} className="text-amber-600 dark:text-amber-400" />
          <h2 className="font-bold text-amber-950 dark:text-amber-200">
            Cerrar Campeonato Actual e Iniciar Nuevo Torneo
          </h2>
        </div>

        <p className="text-xs text-pitch-900/70 dark:text-zinc-400">
          Al confirmar esta acción de forma manual, el campeonato actual (<strong>{group.championshipName || "Campeonato"}</strong>) quedará guardado de forma estática con su tabla final y reseña en el Historial. Las estadísticas e historial activos se limpiarán para arrancar todos en blanco en el nuevo torneo.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1 text-pitch-900/80 dark:text-zinc-300">
              Nombre del nuevo campeonato *
            </label>
            <input
              type="text"
              name="newChampionshipName"
              placeholder="Ej: Torneo Apertura 2027"
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-pitch-900/80 dark:text-zinc-300">
              Fecha fin del nuevo campeonato (opcional)
            </label>
            <input type="date" name="newChampionshipEndDate" className="input w-full" />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-sm shadow-sm transition-colors"
        >
          🏁 Cerrar torneo actual y comenzar nuevo campeonato
        </button>
      </form>
    </div>
  );
}

export function GroupAdminConfigClient() {
  return (
    <Suspense fallback={<div className="pt-8 text-center text-sm text-zinc-500">Cargando...</div>}>
      <GroupAdminConfigContent />
    </Suspense>
  );
}
