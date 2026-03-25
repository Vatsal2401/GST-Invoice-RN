import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { getCustomerById } from '../services/customerService';
import { getCustomerLedger, addPayment, deletePayment } from '../services/paymentService';
import { getBusinessProfile } from '../services/businessService';
import { generateLedgerHtml } from '../components/invoice/ledgerHtml';
import { formatCurrency, formatDate, getTodayISO } from '../utils/formatCurrency';
import { useStore } from '../store/useStore';
import type { Customer, LedgerEntry, Payment } from '../types';
import type { CustomersStackParamList } from '../navigation/AppNavigator';

type RouteType = RouteProp<CustomersStackParamList, 'CustomerLedger'>;

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'NEFT', 'RTGS', 'DD'];

const EMPTY_PAYMENT = {
  payment_date: getTodayISO(),
  amount: '',
  mode: 'Bank Transfer',
  reference: '',
  narration: '',
};

export default function CustomerLedgerScreen(): React.ReactElement {
  const route = useRoute<RouteType>();
  const { customerId, customerName } = route.params;
  const { showToast } = useStore();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Date filter
  const now = new Date();
  const fyStart = now.getMonth() >= 3
    ? `${now.getFullYear()}-04-01`
    : `${now.getFullYear() - 1}-04-01`;
  const fyEnd = now.getMonth() >= 3
    ? `${now.getFullYear() + 1}-03-31`
    : `${now.getFullYear()}-03-31`;

  const [fromDate, setFromDate] = useState(fyStart);
  const [toDate, setToDate] = useState(fyEnd);

  // Payment modal
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);
  const [savingPayment, setSavingPayment] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cust, ledger] = await Promise.all([
        getCustomerById(customerId),
        getCustomerLedger(customerId, fromDate, toDate),
      ]);
      setCustomer(cust);
      setEntries(ledger);
      // Extract payment entries for the delete modal (ref_type === 'payment')
      setPayments(
        ledger
          .filter((e) => e.ref_type === 'payment')
          .map((e) => ({
            id: e.ref_id,
            customer_id: customerId,
            payment_date: e.date,
            amount: e.credit,
            mode: e.particulars,
            reference: e.vch_no,
            narration: e.narration,
            created_at: e.date,
          }))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [customerId, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  const closing = totalDebit - totalCredit;

  const handleAddPayment = async () => {
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      Alert.alert('Validation', 'Amount must be greater than 0');
      return;
    }
    setSavingPayment(true);
    try {
      await addPayment(customerId, {
        payment_date: paymentForm.payment_date,
        amount: parseFloat(paymentForm.amount),
        mode: paymentForm.mode,
        reference: paymentForm.reference,
        narration: paymentForm.narration,
      });
      showToast('Payment recorded', 'success');
      setPaymentModalVisible(false);
      setPaymentForm(EMPTY_PAYMENT);
      await load();
    } catch (e) {
      showToast('Failed to add payment', 'error');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePayment = (payId: string, amount: number) => {
    Alert.alert('Delete Payment', `Delete payment of ${formatCurrency(amount)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePayment(payId);
            showToast('Payment deleted', 'success');
            await load();
          } catch {
            showToast('Failed to delete', 'error');
          }
        },
      },
    ]);
  };

  const handleExportPDF = async (share = false) => {
    if (!customer) return;
    setPdfLoading(true);
    try {
      const biz = await getBusinessProfile();
      const html = generateLedgerHtml(
        customer,
        entries,
        fromDate,
        toDate,
        biz?.business_name || '',
      );
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (share) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Ledger - ${customerName}`,
          });
        } else {
          Alert.alert('Info', 'Sharing is not available on this device');
        }
      } else {
        await Print.printAsync({ uri });
      }
    } catch (e) {
      showToast('Failed to generate PDF', 'error');
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading || !customer) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e3a5f" />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <FlatList
        data={entries}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <>
            {/* Customer Info */}
            <Card style={styles.customerHeader}>
              <View style={styles.customerHeaderRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{customer.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{customer.name}</Text>
                  {customer.phone ? (
                    <Text style={styles.customerSub}>
                      <Ionicons name="call-outline" size={12} color="#6b7280" /> {customer.phone}
                    </Text>
                  ) : null}
                  {customer.gstin ? (
                    <Text style={styles.customerGstin}>GSTIN: {customer.gstin}</Text>
                  ) : null}
                </View>
              </View>
              {/* Balance Summary */}
              <View style={styles.balanceRow}>
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceLabel}>Total Sales</Text>
                  <Text style={styles.balanceDebit}>{formatCurrency(totalDebit)}</Text>
                </View>
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceLabel}>Received</Text>
                  <Text style={styles.balanceCredit}>{formatCurrency(totalCredit)}</Text>
                </View>
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceLabel}>
                    {closing >= 0 ? 'Outstanding' : 'Advance'}
                  </Text>
                  <Text style={closing > 0 ? styles.balanceOutstanding : styles.balanceAdvance}>
                    {formatCurrency(Math.abs(closing))}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Date Filter */}
            <Card>
              <Text style={styles.sectionTitle}>Date Range</Text>
              <View style={styles.row}>
                <Input
                  label="From (YYYY-MM-DD)"
                  value={fromDate}
                  onChangeText={setFromDate}
                  placeholder="2025-04-01"
                  containerStyle={styles.flex1}
                />
                <View style={styles.spacer} />
                <Input
                  label="To (YYYY-MM-DD)"
                  value={toDate}
                  onChangeText={setToDate}
                  placeholder="2026-03-31"
                  containerStyle={styles.flex1}
                />
              </View>
              <Button title="Apply Filter" onPress={load} variant="ghost" icon="filter-outline" />
            </Card>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  setPaymentForm(EMPTY_PAYMENT);
                  setPaymentModalVisible(true);
                }}
              >
                <Ionicons name="cash-outline" size={20} color="#16a34a" />
                <Text style={[styles.actionBtnText, { color: '#16a34a' }]}>Add Payment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleExportPDF(false)}
                disabled={pdfLoading}
              >
                <Ionicons name="print-outline" size={20} color="#1e3a5f" />
                <Text style={styles.actionBtnText}>Print</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleExportPDF(true)}
                disabled={pdfLoading}
              >
                <Ionicons name="share-outline" size={20} color="#1e3a5f" />
                <Text style={styles.actionBtnText}>Share</Text>
              </TouchableOpacity>
            </View>

            {pdfLoading && (
              <View style={styles.pdfLoadRow}>
                <ActivityIndicator size="small" color="#1e3a5f" />
                <Text style={styles.pdfLoadText}>Generating PDF...</Text>
              </View>
            )}

            {/* Ledger Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 2 }]}>Date</Text>
              <Text style={[styles.th, { flex: 4 }]}>Particulars</Text>
              <Text style={[styles.th, styles.thR, { flex: 3 }]}>Debit</Text>
              <Text style={[styles.th, styles.thR, { flex: 3 }]}>Credit</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.ledgerRow}
            onLongPress={() => {
              if (item.ref_type === 'payment') {
                handleDeletePayment(item.ref_id, item.credit);
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.td, { flex: 2 }]}>{formatDate(item.date)}</Text>
            <View style={{ flex: 4 }}>
              <Text style={styles.tdBold} numberOfLines={1}>{item.particulars}</Text>
              <Text style={styles.tdSub} numberOfLines={1}>{item.narration}</Text>
              <Text style={[styles.tdType, item.vch_type === 'Receipt' ? styles.vchCredit : styles.vchDebit]}>
                {item.vch_type}
              </Text>
            </View>
            <Text style={[styles.td, styles.tdR, { flex: 3, color: '#DC2626' }]}>
              {item.debit > 0 ? formatCurrency(item.debit) : ''}
            </Text>
            <Text style={[styles.td, styles.tdR, { flex: 3, color: '#16a34a' }]}>
              {item.credit > 0 ? formatCurrency(item.credit) : ''}
            </Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          entries.length > 0 ? (
            <View style={styles.totalsFooter}>
              <Text style={[styles.totalCell, { flex: 6 }]}>Total</Text>
              <Text style={[styles.totalCell, styles.totalR, { flex: 3, color: '#DC2626' }]}>
                {formatCurrency(totalDebit)}
              </Text>
              <Text style={[styles.totalCell, styles.totalR, { flex: 3, color: '#16a34a' }]}>
                {formatCurrency(totalCredit)}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={40} color="#d1d5db" />
              <Text style={styles.emptyText}>No transactions in this period</Text>
            </View>
          )
        }
      />

      {/* Add Payment Modal */}
      <Modal
        visible={paymentModalVisible}
        title="Record Payment"
        onClose={() => setPaymentModalVisible(false)}
      >
        <Input
          label="Date (YYYY-MM-DD)"
          value={paymentForm.payment_date}
          onChangeText={(v) => setPaymentForm((p) => ({ ...p, payment_date: v }))}
          placeholder="2025-03-15"
        />
        <Input
          label="Amount (₹) *"
          value={paymentForm.amount}
          onChangeText={(v) => setPaymentForm((p) => ({ ...p, amount: v }))}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
        <View style={styles.modeRow}>
          <Text style={styles.modeLabel}>Payment Mode</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeScroll}>
            {PAYMENT_MODES.map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.modeChip, paymentForm.mode === mode && styles.modeChipActive]}
                onPress={() => setPaymentForm((p) => ({ ...p, mode }))}
              >
                <Text style={[styles.modeChipText, paymentForm.mode === mode && styles.modeChipTextActive]}>
                  {mode}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <Input
          label="Reference / Cheque No."
          value={paymentForm.reference}
          onChangeText={(v) => setPaymentForm((p) => ({ ...p, reference: v }))}
          placeholder="TXN123 or Cheque #"
        />
        <Input
          label="Narration"
          value={paymentForm.narration}
          onChangeText={(v) => setPaymentForm((p) => ({ ...p, narration: v }))}
          placeholder="Payment note"
          multiline
        />
        <Button
          title="Record Payment"
          onPress={handleAddPayment}
          loading={savingPayment}
          icon="checkmark-outline"
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 12, paddingBottom: 40 },
  // Customer header
  customerHeader: { marginBottom: 10 },
  customerHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#1e3a5f',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 2 },
  customerSub: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  customerGstin: { fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' },
  balanceRow: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  balanceItem: { flex: 1, alignItems: 'center' },
  balanceLabel: { fontSize: 10, color: '#6b7280', fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  balanceDebit: { fontSize: 14, fontWeight: '700', color: '#DC2626' },
  balanceCredit: { fontSize: 14, fontWeight: '700', color: '#16a34a' },
  balanceOutstanding: { fontSize: 14, fontWeight: '700', color: '#f0a500' },
  balanceAdvance: { fontSize: 14, fontWeight: '700', color: '#16a34a' },
  // Section
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1e3a5f', marginBottom: 12 },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  spacer: { width: 12 },
  // Actions
  actionsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 4 },
  actionBtnText: { fontSize: 11, fontWeight: '600', color: '#1e3a5f' },
  pdfLoadRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#e8edf5', padding: 10, borderRadius: 8, marginBottom: 10, justifyContent: 'center',
  },
  pdfLoadText: { fontSize: 13, color: '#1e3a5f' },
  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e3a5f',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 2,
  },
  th: { fontSize: 11, fontWeight: '700', color: '#fff' },
  thR: { textAlign: 'right' },
  ledgerRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  td: { fontSize: 11, color: '#374151' },
  tdBold: { fontSize: 12, fontWeight: '600', color: '#111827' },
  tdSub: { fontSize: 10, color: '#9ca3af', marginTop: 1 },
  tdType: { fontSize: 10, marginTop: 2, fontWeight: '600' },
  vchDebit: { color: '#DC2626' },
  vchCredit: { color: '#16a34a' },
  tdR: { textAlign: 'right', fontWeight: '600' },
  // Totals footer
  totalsFooter: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f0f4f8',
    borderTopWidth: 2,
    borderTopColor: '#1e3a5f',
    marginTop: 4,
    borderRadius: 8,
  },
  totalCell: { fontSize: 12, fontWeight: '700', color: '#1e3a5f' },
  totalR: { textAlign: 'right' },
  emptyContainer: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { color: '#9ca3af', fontSize: 14 },
  // Payment modal
  modeRow: { marginBottom: 12 },
  modeLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  modeScroll: { marginBottom: 4 },
  modeChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, backgroundColor: '#e5e7eb', marginRight: 8,
  },
  modeChipActive: { backgroundColor: '#1e3a5f' },
  modeChipText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  modeChipTextActive: { color: '#fff' },
});
