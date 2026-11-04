import { isDevBuild } from "./environment";

const EXPO_GO_MESSAGE =
  "Bank linking requires the dev build. Run: cd mobile && npm run ios:dev";

export function isPlaidAvailable(): boolean {
  return isDevBuild();
}

export async function openPlaidLink(
  linkToken: string,
  onSuccess: (publicToken: string) => Promise<void>
): Promise<void> {
  if (!isPlaidAvailable()) {
    throw new Error(EXPO_GO_MESSAGE);
  }

  const { createPlaidLinkSession } = await import("react-native-plaid-link-sdk");

  await new Promise<void>((resolve, reject) => {
    let completed = false;

    createPlaidLinkSession({
      token: linkToken,
      onSuccess: async (success) => {
        try {
          await onSuccess(success.publicToken);
          completed = true;
          resolve();
        } catch (error) {
          reject(error);
        }
      },
      onExit: (exit) => {
        if (completed) return;
        const message =
          exit.error?.displayMessage ||
          exit.error?.errorMessage ||
          "Bank linking was cancelled before accounts were saved.";
        reject(new Error(message));
      },
      onEvent: () => {},
    })
      .then((session) => session.open())
      .catch(reject);
  });
}
