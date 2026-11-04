import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { api, Transaction } from "../lib/api";
import { ThemeColors, radii, spacing } from "../theme/colors";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Math.abs(amount)
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function TransactionsScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getTransactions({ limit: 100 });
      setTransactions(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  if (loading && transactions.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              setLoading(true);
              loadTransactions();
            }}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={transactions.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No transactions yet. Link an account and sync.</Text>
        }
        renderItem={({ item, index }) => (
          <View
            style={[styles.row, index === transactions.length - 1 && styles.rowLast]}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.name} numberOfLines={1}>
                {item.merchant_name ?? item.name}
              </Text>
              <Text style={styles.meta}>
                {formatDate(item.date)}
                {item.category_primary ? ` · ${item.category_primary}` : ""}
                {item.pending ? " · Pending" : ""}
              </Text>
            </View>
            <Text style={[styles.amount, item.amount > 0 ? styles.debit : styles.credit]}>
              {item.amount > 0 ? "-" : "+"}
              {formatCurrency(item.amount)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    list: {
      paddingHorizontal: spacing.lg,
    },
    emptyList: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      justifyContent: "center",
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowLeft: {
      flex: 1,
      marginRight: spacing.md,
    },
    name: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "500",
    },
    meta: {
      color: colors.textMuted,
      fontSize: 13,
      marginTop: 2,
    },
    amount: {
      fontSize: 15,
      fontWeight: "600",
    },
    debit: {
      color: colors.text,
    },
    credit: {
      color: colors.primary,
    },
    empty: {
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 22,
      fontSize: 14,
    },
    errorBox: {
      backgroundColor: colors.errorBg,
      margin: spacing.lg,
      marginBottom: 0,
      borderRadius: radii.sm,
      padding: spacing.md,
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      lineHeight: 20,
    },
  });
