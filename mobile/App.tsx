import { StatusBar } from "expo-status-bar";
import { PrivacyProvider } from "./src/context/PrivacyContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { AppNavigator } from "./src/navigation/AppNavigator";

function AppContent() {
  const { theme } = useTheme();
  return (
    <>
      <AppNavigator />
      <StatusBar style={theme.statusBar} />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <PrivacyProvider>
        <AppContent />
      </PrivacyProvider>
    </ThemeProvider>
  );
}
