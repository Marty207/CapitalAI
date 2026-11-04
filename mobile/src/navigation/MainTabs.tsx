import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { GoalsScreen } from "../screens/GoalsScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { InsightsScreen } from "../screens/InsightsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { TransactionsScreen } from "../screens/TransactionsScreen";
import { radii, spacing } from "../theme/colors";

export type TabParamList = {
  Home: undefined;
  Transactions: undefined;
  Goals: undefined;
  Insights: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

type TabIconProps = { label: string; focused: boolean; color: string };

function TabIcon({ label, focused, color }: TabIconProps) {
  const icons: Record<string, string> = {
    Home: "⌂",
    Transactions: "↕",
    Goals: "◎",
    Insights: "✦",
    Settings: "⚙",
  };

  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.icon, { color }, focused && styles.iconFocused]}>
        {icons[label] ?? "•"}
      </Text>
    </View>
  );
}

export function MainTabs() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { colors } = theme;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: colors.background,
          shadowColor: "transparent",
          elevation: 0,
        },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "600", fontSize: 17 },
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 56 + insets.bottom,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : spacing.sm,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          marginTop: 2,
        },
        tabBarIcon: ({ focused, color }) => (
          <TabIcon label={route.name} focused={focused} color={color} />
        ),
        sceneStyle: { backgroundColor: colors.background },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false, title: "Home" }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ title: "Transactions" }}
      />
      <Tab.Screen name="Goals" component={GoalsScreen} options={{ title: "Goals" }} />
      <Tab.Screen name="Insights" component={InsightsScreen} options={{ title: "Insights" }} />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 18,
    opacity: 0.85,
  },
  iconFocused: {
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
});
