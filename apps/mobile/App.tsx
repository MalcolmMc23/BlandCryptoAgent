import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

type SymbolType = "BTC" | "ETH" | "SOL";

export default function App() {
  const [username, setUsername] = useState("malcolm");
  const [buySymbol, setBuySymbol] = useState<SymbolType>("BTC");
  const [sellSymbol, setSellSymbol] = useState<SymbolType>("BTC");
  const [usdAmount, setUsdAmount] = useState("100");
  const [sellQty, setSellQty] = useState("0.001");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string>("Ready.");

  const symbols = useMemo(() => ["BTC", "ETH", "SOL"] as const, []);

  const callApi = async (path: string, options?: RequestInit) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options?.headers ?? {})
        }
      });
      const json = await res.json();
      setOutput(JSON.stringify({ status: res.status, data: json }, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setOutput(`Request failed: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar style="dark" />
      <Text style={styles.title}>Bland Crypto Demo UI</Text>
      <Text style={styles.sub}>API: {API_URL}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          style={styles.input}
          autoCapitalize="none"
        />

        <View style={styles.row}>
          <ActionButton label="Health" onPress={() => callApi("/api/health")} />
          <ActionButton
            label="Create User"
            onPress={() =>
              callApi("/api/users", {
                method: "POST",
                body: JSON.stringify({ username })
              })
            }
          />
        </View>

        <View style={styles.row}>
          <ActionButton
            label="Lookup User"
            onPress={() => callApi(`/api/users/${encodeURIComponent(username)}`)}
          />
          <ActionButton label="Get Prices" onPress={() => callApi("/api/prices")} />
        </View>

        <ActionButton
          label="Check Balance"
          onPress={() => callApi(`/api/balance/${encodeURIComponent(username)}`)}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Buy</Text>
        <View style={styles.symbolRow}>
          {symbols.map((symbol) => (
            <Chip
              key={`buy-${symbol}`}
              active={buySymbol === symbol}
              label={symbol}
              onPress={() => setBuySymbol(symbol)}
            />
          ))}
        </View>
        <TextInput
          value={usdAmount}
          onChangeText={setUsdAmount}
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="USD amount"
        />
        <ActionButton
          label="Buy"
          onPress={() =>
            callApi("/api/trade/buy", {
              method: "POST",
              body: JSON.stringify({
                username,
                symbol: buySymbol,
                usd_amount: Number(usdAmount)
              })
            })
          }
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Sell</Text>
        <View style={styles.symbolRow}>
          {symbols.map((symbol) => (
            <Chip
              key={`sell-${symbol}`}
              active={sellSymbol === symbol}
              label={symbol}
              onPress={() => setSellSymbol(symbol)}
            />
          ))}
        </View>
        <TextInput
          value={sellQty}
          onChangeText={setSellQty}
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="Qty"
        />
        <ActionButton
          label="Sell"
          onPress={() =>
            callApi("/api/trade/sell", {
              method: "POST",
              body: JSON.stringify({
                username,
                symbol: sellSymbol,
                qty: sellQty
              })
            })
          }
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Response</Text>
        {loading ? <ActivityIndicator /> : <Text style={styles.output}>{output}</Text>}
      </View>
    </ScrollView>
  );
}

function ActionButton({
  label,
  onPress
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function Chip({
  label,
  active,
  onPress
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fb"
  },
  content: {
    padding: 16,
    gap: 12
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0b132b"
  },
  sub: {
    color: "#475569"
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#dbe3ef"
  },
  label: {
    fontWeight: "600",
    color: "#1e293b"
  },
  section: {
    fontWeight: "700",
    fontSize: 16,
    color: "#0f172a"
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff"
  },
  row: {
    flexDirection: "row",
    gap: 8
  },
  symbolRow: {
    flexDirection: "row",
    gap: 8
  },
  button: {
    flex: 1,
    backgroundColor: "#0f766e",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center"
  },
  buttonText: {
    color: "#f8fafc",
    fontWeight: "700"
  },
  chip: {
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#fff"
  },
  chipActive: {
    backgroundColor: "#0f766e",
    borderColor: "#0f766e"
  },
  chipText: {
    color: "#334155",
    fontWeight: "600"
  },
  chipTextActive: {
    color: "#f8fafc"
  },
  pressed: {
    opacity: 0.75
  },
  output: {
    fontFamily: "Courier",
    fontSize: 12,
    color: "#0f172a"
  }
});
