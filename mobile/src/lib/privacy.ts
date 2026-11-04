import AsyncStorage from "@react-native-async-storage/async-storage";

export type PrivacySettings = {
  /** Allow AI features when they ship (master switch). Off by default. */
  aiFeaturesEnabled: boolean;
  /** Send category-level summaries only — never full transaction lists. */
  summariesOnly: boolean;
  /** Block account numbers and institution names from any AI request. */
  redactAccountDetails: boolean;
  /** Allow sending data to external AI providers (OpenAI, DeepSeek, etc.). */
  externalAiAllowed: boolean;
};

export const DEFAULT_PRIVACY: PrivacySettings = {
  aiFeaturesEnabled: false,
  summariesOnly: true,
  redactAccountDetails: true,
  externalAiAllowed: false,
};

const STORAGE_KEY = "financeai_privacy";

export async function loadPrivacySettings(): Promise<PrivacySettings> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_PRIVACY;
  try {
    return { ...DEFAULT_PRIVACY, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PRIVACY;
  }
}

export async function savePrivacySettings(settings: PrivacySettings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/** Shape data for a future AI call — respects privacy toggles. */
export function sanitizeForAi(
  settings: PrivacySettings,
  payload: {
    summary: string;
    details?: string;
    accountNames?: string[];
  }
): { allowed: boolean; text: string } {
  if (!settings.aiFeaturesEnabled) {
    return { allowed: false, text: "" };
  }
  if (!settings.externalAiAllowed) {
    return { allowed: false, text: "" };
  }

  let text = settings.summariesOnly ? payload.summary : `${payload.summary}\n${payload.details ?? ""}`;

  if (settings.redactAccountDetails && payload.accountNames?.length) {
    for (const name of payload.accountNames) {
      text = text.split(name).join("[Account]");
    }
  }

  return { allowed: true, text };
}
