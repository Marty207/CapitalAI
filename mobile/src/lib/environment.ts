import Constants from "expo-constants";

export function isDevBuild(): boolean {
  return Constants.appOwnership !== "expo";
}

export function isPlaidSandbox(): boolean {
  return (process.env.EXPO_PUBLIC_PLAID_ENV ?? "sandbox") === "sandbox";
}

export function buildEnvironmentLabel(): string {
  if (!isDevBuild()) return "Expo Go — Plaid unavailable";
  if (isPlaidSandbox()) return "Dev build · Plaid Sandbox";
  return "Dev build · Plaid Production";
}
