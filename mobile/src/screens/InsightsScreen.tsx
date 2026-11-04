import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors, radii, spacing } from "../theme/colors";

const INSIGHTS = [
  {
    title: "AI assistant",
    description: "Ask questions like “How much can I safely spend this weekend?”",
    status: "Coming soon",
  },
  {
    title: "Spending patterns",
    description: "See where your money goes and spot trends over time.",
    status: "Coming soon",
  },
  {
    title: "Smart alerts",
    description: "Get notified about unusual spending, bills, and low balances.",
    status: "Coming soon",
  },
];

export function InsightsScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.lead}>
        Personalized financial insights powered by your accounts and goals.
      </Text>

      {INSIGHTS.map((item) => (
        <View key={item.title} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.status}</Text>
            </View>
          </View>
          <Text style={styles.cardBody}>{item.description}</Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: spacing.lg,
    },
    lead: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
    },
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      backgroundColor: colors.card,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
    },
    badge: {
      backgroundColor: colors.primarySoft,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radii.pill,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.primaryDark,
    },
    cardBody: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
  });
