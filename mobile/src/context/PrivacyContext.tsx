import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_PRIVACY,
  loadPrivacySettings,
  savePrivacySettings,
  type PrivacySettings,
} from "../lib/privacy";

type PrivacyContextValue = {
  settings: PrivacySettings;
  ready: boolean;
  updateSetting: <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => void;
  resetPrivacy: () => void;
};

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_PRIVACY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadPrivacySettings().then((loaded) => {
      setSettings(loaded);
      setReady(true);
    });
  }, []);

  const persist = useCallback(async (next: PrivacySettings) => {
    setSettings(next);
    await savePrivacySettings(next);
  }, []);

  const updateSetting = useCallback(
    <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        void savePrivacySettings(next);
        return next;
      });
    },
    []
  );

  const resetPrivacy = useCallback(() => {
    void persist(DEFAULT_PRIVACY);
  }, [persist]);

  const value = useMemo(
    () => ({ settings, ready, updateSetting, resetPrivacy }),
    [settings, ready, updateSetting, resetPrivacy]
  );

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error("usePrivacy must be used within PrivacyProvider");
  }
  return context;
}
