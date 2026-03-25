import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Card from '../components/ui/Card';
import { getInvoices, cancelInvoice } from '../services/invoiceService';
import { formatCurrency, formatDate } from '../utils/formatCurrency';
import { useStore } from '../store/useStore';
import type { InvoiceSummary } from '../types';
import type { HistoryStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<HistoryStackParamList, 'History'>;

const ALL_STATUSES = ['ALL', 'DRAFT', 'FINAL', 'CANCELLED'] as const;
type StatusFilter = (typeof ALL_STATUSES)[number];

const STATUS_COLORS = {
  DRAFT: { bg: '#fef3c7', text: '#92400e' },
  FINAL: { bg: '#dcfce7', text: '#166534' },
  CANCELLED: { bg: '#fee2e2', text: '#991b1b' },
};

export default function HistoryScreen(): React.ReactElement {
  const navigation = useNavigation<NavProp>();
  const { showToast } = useStore();

  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [filtered, setFiltered] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const load = useCallback(async () => {
    try {
      const data = await getInvoices();
      setInvoices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    let data = invoices;

    if (statusFilter !== 'ALL') {
      data = data.filter((inv) => {
        if (statusFilter === 'CANCELLED') return inv.cancelled;
        return !inv.cancelled && inv.status === statusFilter;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (inv) =>
          inv.invoice_number.toLowerCase().includes(q) ||
          inv.buyer_name.toLowerCase().includes(q) ||
          (inv.customer_name ?? '').toLowerCase().includes(q)
      );
    }

    setFiltered(data);
  }, [invoices, search, statusFilter]);

  const getStatusKey = (inv: InvoiceSummary): keyof typeof STATUS_COLORS => {
    if (inv.cancelled) return 'CANCELLED';
    return inv.status as 'DRAFT' | 'FINAL';
  };

  const handleLongPress = (inv: InvoiceSummary) => {
    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
      { text: 'View', onPress: () => navigation.navigate('PreviewInvoice', { invoiceId: inv.id }) },
    ];
    if (!inv.cancelled) {
      options.push({
        text: 'Cancel Invoice',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Cancel Invoice', `Cancel "${inv.invoice_number}"?`, [
            { text: 'No', style: 'cancel' },
            {
              text: 'Yes',
              style: 'destructive',
              onPress: async () => {
                try {
                  await cancelInvoice(inv.id);
                  showToast('Invoice cancelled', 'success');
                  await load();
                } catch {
                  showToast('Failed to cancel', 'error');
                }
              },
            },
          ]);
        },
      });
    }
    options.push({ text: 'Dismiss', style: 'cancel' });
    Alert.alert(inv.invoice_number, inv.buyer_name, options as any);
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
      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search invoice # or customer..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Status chips */}
      <View style={styles.chipsRow}>
        {ALL_STATUSES.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, statusFilter === s && styles.chipActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const statusKey = getStatusKey(item);
          const statusColor = STATUS_COLORS[statusKey];
          return (
            <TouchableOpacity
              onPress={() => navigation.navigate('PreviewInvoice', { invoiceId: item.id })}
              onLongPress={() => handleLongPress(item)}
              activeOpacity={0.7}
            >
              <Card style={styles.invoiceCard}>
                <View style={styles.cardRow}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.invoiceNum}>{item.invoice_number}</Text>
                    <Text style={styles.buyerName}>{item.buyer_name}</Text>
                    {item.customer_name && item.customer_name !== item.buyer_name ? (
                      <Text style={styles.customerName}>({item.customer_name})</Text>
                    ) : null}
                    <Text style={styles.date}>{formatDate(item.invoice_date)}</Text>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={styles.amount}>{formatCurrency(item.grand_total)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                      <Text style={[styles.statusText, { color: statusColor.text }]}>{statusKey}</Text>
                    </View>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No invoices found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    marginBottom: 4,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', paddingVertical: 2 },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: '#1e3a5f' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  chipTextActive: { color: '#fff' },
  listContent: { padding: 12, paddingTop: 4, paddingBottom: 40 },
  invoiceCard: { padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  invoiceNum: { fontSize: 15, fontWeight: '700', color: '#1e3a5f', marginBottom: 2 },
  buyerName: { fontSize: 13, color: '#374151', marginBottom: 1 },
  customerName: { fontSize: 12, color: '#9ca3af', marginBottom: 1 },
  date: { fontSize: 12, color: '#6b7280' },
  amount: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#9ca3af' },
});
