import type { BlockResult, StatGridResult, TableResult } from "../../src/types.ts";
import { CAPABILITIES } from "../../src/types.ts";

// Open-Meteo needs no API key at all — geocoding and forecast are both
// free, unauthenticated endpoints. requiredEnvVars is empty; server/index.ts
// treats a zero-length list as "always connected" rather than "always
// missing", so this connector never shows a false "not connected" status.
export const requiredEnvVars: string[] = [];

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const FORECAST_DAYS = 7;

// ponytail: Fahrenheit hardcoded, no units param — add one if Celsius is
// ever needed, the capability params array is free-text so it's a small
// addition later, not a reshape.
const TEMPERATURE_UNIT = "fahrenheit";

// WMO weather interpretation codes (open-meteo returns these numeric codes,
// same standard used by most weather APIs) — condensed to the labels this
// app actually displays, not the full WMO table.
const WEATHER_CODE_LABELS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Rain showers",
  82: "Violent rain showers",
  85: "Snow showers",
  86: "Snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm, hail",
  99: "Thunderstorm, hail",
};

function conditionLabel(code: number): string {
  return WEATHER_CODE_LABELS[code] ?? "Unknown";
}

async function geocode(location: string): Promise<{ latitude: number; longitude: number; label: string }> {
  const res = await fetch(`${GEOCODING_URL}?name=${encodeURIComponent(location)}&count=1&format=json`);
  if (!res.ok) throw new Error(`Open-Meteo geocoding error: ${res.status}`);
  const body = await res.json();
  const result = body.results?.[0];
  if (!result) throw new Error(`Location "${location}" not found`);
  return { latitude: result.latitude, longitude: result.longitude, label: result.name };
}

interface ForecastResponse {
  current: { temperature_2m: number; weather_code: number };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
  };
}

async function fetchForecast(location: string): Promise<ForecastResponse> {
  const { latitude, longitude } = await geocode(location);
  const res = await fetch(
    `${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,weather_code` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code` +
      `&temperature_unit=${TEMPERATURE_UNIT}&timezone=auto&forecast_days=${FORECAST_DAYS}`,
  );
  if (!res.ok) throw new Error(`Open-Meteo forecast error: ${res.status}`);
  return res.json();
}

async function currentWeather(params: Record<string, string>): Promise<StatGridResult> {
  const location = params.location;
  if (!location) throw new Error("current-weather requires a location");

  const forecast = await fetchForecast(location);
  return {
    items: [
      { value: `${Math.round(forecast.current.temperature_2m)}°`, label: "Now" },
      { value: `${Math.round(forecast.daily.temperature_2m_max[0])}°`, label: "High" },
      { value: `${Math.round(forecast.daily.temperature_2m_min[0])}°`, label: "Low" },
      { value: conditionLabel(forecast.current.weather_code), label: "Condition" },
    ],
  };
}

async function forecast(params: Record<string, string>): Promise<TableResult> {
  const location = params.location;
  if (!location) throw new Error("forecast requires a location");

  const f = await fetchForecast(location);
  return {
    columns: ["Day", "High", "Low", "Condition"],
    rows: f.daily.time.map((date, i) => [
      date,
      `${Math.round(f.daily.temperature_2m_max[i])}°`,
      `${Math.round(f.daily.temperature_2m_min[i])}°`,
      conditionLabel(f.daily.weather_code[i]),
    ]),
  };
}

type CapabilityFn = (params: Record<string, string>) => Promise<BlockResult>;

const CAPABILITY_FNS: Record<string, CapabilityFn> = {
  "current-weather": currentWeather,
  forecast,
};

export async function runCapability(
  capabilityId: string,
  params: Record<string, string>,
): Promise<BlockResult | null> {
  const known = CAPABILITIES.weather.some((c) => c.id === capabilityId);
  if (!known) return null;
  return CAPABILITY_FNS[capabilityId](params);
}
