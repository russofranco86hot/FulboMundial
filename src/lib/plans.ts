export type ProPlanId = "pro_monthly" | "pro_annual" | "pro_lifetime";
export type PaymentProvider = "mercadopago" | "stripe";

export interface ProPlanConfig {
  id: ProPlanId;
  name: string;
  badge?: string;
  description: string;
  durationDays: number | null; // null = vitalicio
  priceArs: number;
  priceArsFormatted: string;
  priceUsdCents: number;
  priceUsdFormatted: string;
  periodLabel: string;
}

export const PRO_PLANS: Record<ProPlanId, ProPlanConfig> = {
  pro_monthly: {
    id: "pro_monthly",
    name: "Pase Mensual PRO",
    description: "Ideal para probar un mes completo con todo el grupo.",
    durationDays: 30,
    priceArs: 4000,
    priceArsFormatted: "$4.000 ARS",
    priceUsdCents: 499,
    priceUsdFormatted: "$4.99 USD",
    periodLabel: "/ mes por grupo",
  },
  pro_annual: {
    id: "pro_annual",
    name: "Temporada Anual PRO",
    badge: "MÁS ELEGIDO · 25% OFF",
    description: "12 meses de estadísticas épicas, crónicas IA y placas HD sin interrupciones.",
    durationDays: 365,
    priceArs: 36000,
    priceArsFormatted: "$36.000 ARS",
    priceUsdCents: 3999,
    priceUsdFormatted: "$39.99 USD",
    periodLabel: "/ año por grupo",
  },
  pro_lifetime: {
    id: "pro_lifetime",
    name: "Vitalicio Fundador PRO",
    badge: "PAGO ÚNICO",
    description: "Un solo pago entre todos los pibes y el grupo queda PRO para toda la vida.",
    durationDays: null,
    priceArs: 75000,
    priceArsFormatted: "$75.000 ARS",
    priceUsdCents: 7999,
    priceUsdFormatted: "$79.99 USD",
    periodLabel: "pago único",
  },
};

export const FREE_LIMITS = {
  maxRecentMatchesInHistory: 3,
  maxVisibleTalismans: 1,
  maxVisibleMufas: 1,
};

export const PRO_FEATURES_COMPARISON = [
  {
    feature: "Convocatorias, Cancha 2D y Armado de Equipos",
    free: "Ilimitado",
    pro: "Ilimitado",
  },
  {
    feature: "Tabla de Posiciones y Goleadores (Pichichi)",
    free: "Incluido",
    pro: "Incluido + Insignias PRO",
  },
  {
    feature: "Historial de Partidos y Votaciones (MVP / Tronco)",
    free: "Últimos 3 partidos",
    pro: "Historial histórico ilimitado",
  },
  {
    feature: "Folclore: Amuleto, Mufa, Dúos Tóxicos, Clásico y Paternidad",
    free: "Vista previa bloqueada",
    pro: "100% Desbloqueado",
  },
  {
    feature: "Crónicas Picantes y Relator de Audio con IA para WhatsApp",
    free: "1 prueba por partido",
    pro: "Ilimitado (Relator + Periodista)",
  },
  {
    feature: "Exportación de Placas HD y Cartas EA FC para Instagram/WhatsApp",
    free: "Básico",
    pro: "Calidad HD con sello del grupo",
  },
];
