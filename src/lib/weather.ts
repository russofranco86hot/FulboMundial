import "server-only";

export type WeatherInfo = {
  temp: number;
  precipProb: number;
  description: string;
  icon: string;
  isRainy: boolean;
};

// Mapeo WMO weather codes a descripción e ícono en español
function getWeatherDetails(code: number): { description: string; icon: string; isRainy: boolean } {
  if (code === 0) return { description: "Despejado", icon: "☀️", isRainy: false };
  if (code === 1 || code === 2) return { description: "Algo nublado", icon: "🌤️", isRainy: false };
  if (code === 3) return { description: "Nublado", icon: "☁️", isRainy: false };
  if (code === 45 || code === 48) return { description: "Neblina", icon: "🌫️", isRainy: false };
  if (code >= 51 && code <= 55) return { description: "Llovizna", icon: "🌦️", isRainy: true };
  if (code >= 61 && code <= 65) return { description: "Lluvia", icon: "🌧️", isRainy: true };
  if (code >= 80 && code <= 82) return { description: "Chaparrones", icon: "🌧️", isRainy: true };
  if (code >= 95 && code <= 99) return { description: "Tormenta eléctrica", icon: "⛈️", isRainy: true };
  return { description: "Tiempo variable", icon: "⛅", isRainy: false };
}

/**
 * Obtiene el pronóstico del clima para la fecha y hora del partido (Buenos Aires / ART por defecto).
 * Retorna null si la fecha está fuera de rango (>10 días) o si la API no responde.
 */
export async function getMatchWeather(matchDate: Date, lat = -34.6037, lon = -58.3816): Promise<WeatherInfo | null> {
  const now = new Date();
  const diffDays = (matchDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  // Open-Meteo da pronóstico hasta 14 días
  if (diffDays < -1 || diffDays > 14) return null;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability,weather_code&timezone=America%2FArgentina%2FBuenos_Aires`;
    const res = await fetch(url, { next: { revalidate: 3600 } }); // Cache 1 hora
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.hourly || !data.hourly.time) return null;

    // Buscar la hora más cercana
    const targetIsoPrefix = matchDate.toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
    let closestIdx = data.hourly.time.findIndex((t: string) => t.startsWith(targetIsoPrefix));

    if (closestIdx === -1) {
      // Tomar por distancia mínima
      const targetTime = matchDate.getTime();
      let minDiff = Infinity;
      data.hourly.time.forEach((t: string, idx: number) => {
        const time = new Date(t).getTime();
        const diff = Math.abs(time - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
    }

    if (closestIdx === -1) return null;

    const temp = Math.round(data.hourly.temperature_2m[closestIdx]);
    const precipProb = Math.round(data.hourly.precipitation_probability[closestIdx] ?? 0);
    const code = Number(data.hourly.weather_code[closestIdx] ?? 0);
    const details = getWeatherDetails(code);

    return {
      temp,
      precipProb,
      description: details.description,
      icon: details.icon,
      isRainy: details.isRainy || precipProb >= 50,
    };
  } catch (err) {
    console.warn("Could not fetch match weather:", err);
    return null;
  }
}
