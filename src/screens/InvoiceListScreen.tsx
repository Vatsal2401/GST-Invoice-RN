import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Card from '../components/ui/Card';
import { getInvoices } from '../services/invoiceService';
import { formatCurrency, formatDate } from '../utils/formatCurrency';
import type { InvoiceSummary } from '../types';
import type { InvoicesStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<InvoicesStackParamList, 'InvoiceList'>;

const STATUS_COLORS = {
  DRAFT: { bg: '#fef3c7', text: '#92400e' },
  FINAL: { bg: '#dcfce7', text: '#166534' },
  CANCELLED: { bg: '#fee2e2', text: '#991b1b' },
};

export default function InvoiceListScreen(): React.ReactElement {
  const navigation = useNavigation<NavProp>();
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      getInvoices()
        .then((data) => { if (active) { setInvoices(data); setLoading(false); } })
        .catch(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [])
  );

  const getStatusKey = (inv: InvoiceSummary): keyof typeof STATUS_COLORS => {
    if (inv.cancelled) return 'CANCELLED';
    return inv.status as 'DRAFT' | 'FINAL';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e3a5f" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={invoices}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const statusKey = getStatusKey(item);
          const statusColor = STATUS_COLORS[statusKey];
          return (
            <TouchableOpacity
              onPress={() => navigation.navigate('PreviewInvoice', { invoiceId: item.id })}
              activeOpacity={0.7}
            >
              <Card style={styles.invoiceCard}>
                <View style={styles.cardRow}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.invoiceNum}>{item.invoice_number}</Text>
                    <Text style={styles.buyerName}>{item.buyer_name}</Text>
                    <Text style={styles.date}>{formatDate(item.invoice_date)}</Text>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={styles.amount}>{formatCurrency(item.grand_total)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                      <Text style={[styles.statusText, { color: statusColor.text }]}>
                        {statusKey}
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={56} color="#d1d5db" />
            <Text style={styles.emptyText}>No invoices yet</Text>
            <Text style={styles.emptySubText}>Tap + to create your first invoice</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateInvoice', undefined)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 12, paddingBottom: 80 },
  invoiceCard: { padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  invoiceNum: { fontSize: 15, fontWeight: '700', color: '#1e3a5f', marginBottom: 2 },
  buyerName: { fontSize: 13, color: '#374151', marginBottom: 2 },
  date: { fontSize: 12, color: '#6b7280' },
  amount: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#9ca3af' },
  emptySubText: { fontSize: 13, color: '#9ca3af' },
  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#1e3a5f',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
});
