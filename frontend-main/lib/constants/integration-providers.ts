export const INTEGRATION_PROVIDERS = [
  {
    value: 'tomorrow.io',
    label: 'Tomorrow.io',
    description: 'Погода: температура, влажность, ветер, давление, осадки',
  },
  {
    value: 'stormglass.io',
    label: 'Stormglass.io',
    description: 'Почва и среда: влажность, температура почвы, pH, солёность и др.',
  },
] as const;

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number]['value'];

export function getProviderLabel(api: string | null | undefined): string {
  if (!api) return '—';
  return INTEGRATION_PROVIDERS.find((p) => p.value === api)?.label ?? api;
}

export function buildProviderConfig(provider: IntegrationProvider, apiKey: string) {
  if (provider === 'tomorrow.io') {
    return {
      api: provider,
      headers_hard: {
        apikey: apiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body_hard: {
        fields: [
          'temperature',
          'humidity',
          'windSpeed',
          'pressureSurfaceLevel',
          'precipitationProbability',
          'precipitationIntensity',
        ],
        units: 'metric',
        timesteps: ['1h'],
      },
      params_hard: null as Record<string, unknown> | null,
    };
  }

  return {
    api: provider,
    headers_hard: {
      Authorization: apiKey,
      Accept: 'application/json',
    },
    body_hard: null as Record<string, unknown> | null,
    params_hard: {
      params: [
        'soilMoisture',
        'soilMoisture10cm',
        'soilMoisture40cm',
        'soilMoisture100cm',
        'soilTemperature',
        'soilTemperature10cm',
        'soilTemperature40cm',
        'soilTemperature100cm',
      ],
    },
  };
}

export function extractApiKey(
  api: string | null | undefined,
  headers: Record<string, string> | null | undefined,
): string {
  if (!headers || !api) return '';
  if (api === 'tomorrow.io') return headers.apikey ?? '';
  if (api === 'stormglass.io') return headers.Authorization ?? '';
  return '';
}
