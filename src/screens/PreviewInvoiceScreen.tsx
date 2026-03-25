import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getInvoiceById, finalizeInvoice, cancelInvoice } from '../services/invoiceService';
import { getBusinessProfile } from '../services/businessService';
import { generateInvoiceHtml } from '../components/invoice/invoiceHtml';
import { buildHsnSummary } from '../utils/taxCalculator';
import { formatCurrency, formatDate } from '../utils/formatCurrency';
import { useStore } from '../store/useStore';
import type { InvoiceWithItems, BusinessProfile } from '../types';
import type { InvoicesStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<InvoicesStackParamList, 'PreviewInvoice'>;
type RouteType = RouteProp<InvoicesStackParamList, 'PreviewInvoice'>;

const STATUS_COLORS = {
  DRAFT: { bg: '#fef3c7', text: '#92400e' },
  FINAL: { bg: '#dcfce7', text: '#166534' },
  CANCELLED: { bg: '#fee2e2', text: '#991b1b' },
};

export default function PreviewInvoiceScreen(): React.ReactElement {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { invoiceId } = route.params;
  const { showToast } = useStore();

  const [invoice, setInvoice] = useState<InvoiceWithItems | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [inv, biz] = await Promise.all([
        getInvoiceById(invoiceId),
        getBusinessProfile(),
      ]);
      setInvoice(inv);
      setBusiness(biz);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => { load(); }, [load]);

  const getStatusKey = (): keyof typeof STATUS_COLORS => {
    if (!invoice) return 'DRAFT';
    if (invoice.cancelled) return 'CANCELLED';
    return invoice.status as 'DRAFT' | 'FINAL';
  };

  const handleFinalize = () => {
    Alert.alert('Finalize Invoice', 'Mark this invoice as FINAL? You cannot edit it afterwards.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finalize',
        onPress: async () => {
          try {
            await finalizeInvoice(invoiceId);
            showToast('Invoice finalized', 'success');
            await load();
          } catch (e) {
            showToast('Failed to finalize', 'error');
          }
        },
      },
    ]);
  };

  const handleCancel = () => {
    Alert.alert('Cancel Invoice', 'Mark this invoice as CANCELLED?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelInvoice(invoiceId);
            showToast('Invoice cancelled', 'success');
            await load();
          } catch (e) {
            showToast('Failed to cancel', 'error');
          }
        },
      },
    ]);
  };

  const handleExportPDF = async (share = false) => {
    if (!invoice || !business) {
      Alert.alert('Error', 'Cannot generate PDF — missing data');
      return;
    }
    setPdfLoading(true);
    try {
      const html = generateInvoiceHtml(invoice, business);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (share) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Invoice ${invoice.invoice_number}` });
        } else {
          Alert.alert('Info', 'Sharing is not available on this device');
        }
      } else {
        await Print.printAsync({ uri });
      }
    } catch (e) {
      showToast('Failed to generate PDF', 'error');
      console.error(e);
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading || !invoice) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e3a5f" />
      </View>
    );
  }

  const statusKey = getStatusKey();
  const statusColor = STATUS_COLORS[statusKey];
  const hsnSummary = buildHsnSummary(invoice.items);
  const isDraft = invoice.status === 'DRAFT' && !invoice.cancelled;
  const isFinal = invoice.status === 'FINAL' && !invoice.cancelled;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Status Header */}
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.invoiceNum}>{invoice.invoice_number}</Text>
            <Text style={styles.invoiceDate}>{formatDate(invoice.invoice_date)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.statusText, { color: statusColor.text }]}>{statusKey}</Text>
          </View>
        </View>
        <Text style={styles.grandTotal}>{formatCurrency(invoice.grand_total)}</Text>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        {isDraft && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('CreateInvoice', { invoiceId })}
          >
            <Ionicons name="create-outline" size={20} color="#1e3a5f" />
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>
        )}
        {isDraft && (
          <TouchableOpacity style={styles.actionBtn} onPress={handleFinalize}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#16a34a" />
            <Text style={[styles.actionBtnText, { color: '#16a34a' }]}>Finalize</Text>
          </TouchableOpacity>
        )}
        {!invoice.cancelled && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleExportPDF(false)}
            disabled={pdfLoading}
          >
            <Ionicons name="print-outline" size={20} color="#1e3a5f" />
            <Text style={styles.actionBtnText}>Print</Text>
          </TouchableOpacity>
        )}
        {!invoice.cancelled && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleExportPDF(true)}
            disabled={pdfLoading}
          >
            <Ionicons name="share-outline" size={20} color="#1e3a5f" />
            <Text style={styles.actionBtnText}>Share</Text>
          </TouchableOpacity>
        )}
        {!invoice.cancelled && (
          <TouchableOpacity style={styles.actionBtn} onPress={handleCancel}>
            <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
            <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {pdfLoading && (
        <View style={styles.pdfLoadingRow}>
          <ActivityIndicator size="small" color="#1e3a5f" />
          <Text style={styles.pdfLoadingText}>Generating PDF...</Text>
        </View>
      )}

      {/* Buyer / Ship To */}
      <View style={styles.row}>
        <Card style={styles.flex1}>
          <Text style={styles.cardLabel}>Bill To</Text>
          <Text style={styles.cardName}>{invoice.buyer_name}</Text>
          {invoice.buyer_address ? <Text style={styles.cardText}>{invoice.buyer_address}</Text> : null}
          {invoice.buyer_gstin ? <Text style={styles.cardMono}>GSTIN: {invoice.buyer_gstin}</Text> : null}
          {invoice.buyer_state ? <Text style={styles.cardText}>State: {invoice.buyer_state} {invoice.buyer_state_code ? `(${invoice.buyer_state_code})` : ''}</Text> : null}
        </Card>
        <View style={{ width: 10 }} />
        <Card style={styles.flex1}>
          <Text style={styles.cardLabel}>Ship To</Text>
          <Text style={styles.cardName}>{invoice.ship_to_name || invoice.buyer_name}</Text>
          {(invoice.ship_to_address || invoice.buyer_address) ? (
            <Text style={styles.cardText}>{invoice.ship_to_address || invoice.buyer_address}</Text>
          ) : null}
          {invoice.ship_to_gstin ? <Text style={styles.cardMono}>GSTIN: {invoice.ship_to_gstin}</Text> : null}
        </Card>
      </View>

      {/* Invoice Meta */}
      <Card>
        <Text style={styles.cardLabel}>Invoice Details</Text>
        {renderMetaRow('Payment Terms', invoice.payment_terms)}
        {renderMetaRow('Delivery Terms', invoice.delivery_terms)}
        {renderMetaRow("Buyer's Order No.", invoice.buyer_order_number)}
        {renderMetaRow('Dispatch Through', invoice.dispatched_through)}
        {renderMetaRow('Destination', invoice.destination)}
      </Card>

      {/* Items */}
      <Card>
        <Text style={styles.cardLabel}>Items ({invoice.items.length})</Text>
        {invoice.items.map((item) => (
          <View key={item.sl_no} style={styles.itemRow}>
            <View style={styles.itemTop}>
              <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
              <Text style={styles.itemAmount}>{formatCurrency(item.amount + item.cgst_amount + item.sgst_amount)}</Text>
            </View>
            <Text style={styles.itemSub}>
              {item.quantity} {item.unit} × {formatCurrency(item.rate)} | HSN: {item.hsn_sac || 'N/A'}
            </Text>
            <Text style={styles.itemTax}>
              CGST {item.cgst_rate}%: {formatCurrency(item.cgst_amount)} | SGST {item.sgst_rate}%: {formatCurrency(item.sgst_amount)}
            </Text>
          </View>
        ))}
      </Card>

      {/* HSN Summary */}
      <Card>
        <Text style={styles.cardLabel}>HSN Summary</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, { flex: 2 }]}>HSN/SAC</Text>
          <Text style={[styles.tableCell, styles.tableCellR, { flex: 3 }]}>Taxable</Text>
          <Text style={[styles.tableCell, styles.tableCellR, { flex: 3 }]}>CGST</Text>
          <Text style={[styles.tableCell, styles.tableCellR, { flex: 3 }]}>SGST</Text>
        </View>
        {hsnSummary.map((row) => (
          <View key={row.hsn_sac} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>{row.hsn_sac}</Text>
            <Text style={[styles.tableCell, styles.tableCellR, { flex: 3 }]}>{formatCurrency(row.taxable_value)}</Text>
            <Text style={[styles.tableCell, styles.tableCellR, { flex: 3 }]}>{formatCurrency(row.cgst_amount)}</Text>
            <Text style={[styles.tableCell, styles.tableCellR, { flex: 3 }]}>{formatCurrency(row.sgst_amount)}</Text>
          </View>
        ))}
      </Card>

      {/* Totals */}
      <Card>
        <View style={styles.totalLine}>
          <Text style={styles.totalLabel}>Taxable Value</Text>
          <Text style={styles.totalValue}>{formatCurrency(invoice.taxable_value)}</Text>
        </View>
        <View style={styles.totalLine}>
          <Text style={styles.totalLabel}>CGST</Text>
          <Text style={styles.totalValue}>{formatCurrency(invoice.cgst_total)}</Text>
        </View>
        <View style={styles.totalLine}>
          <Text style={styles.totalLabel}>SGST</Text>
          <Text style={styles.totalValue}>{formatCurrency(invoice.sgst_total)}</Text>
        </View>
        <View style={[styles.totalLine, styles.grandLine]}>
          <Text style={styles.grandLabel}>Grand Total</Text>
          <Text style={styles.grandValue}>{formatCurrency(invoice.grand_total)}</Text>
        </View>
      </Card>
    </ScrollView>
  );
}

function renderMetaRow(label: string, value: string): React.ReactElement | null {
  if (!value) return null;
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}:</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f5f7fa' },
  container: { padding: 12, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerCard: { marginBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  invoiceNum: { fontSize: 20, fontWeight: '800', color: '#1e3a5f' },
  invoiceDate: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14 },
  statusText: { fontSize: 12, fontWeight: '700' },
  grandTotal: { fontSize: 28, fontWeight: '800', color: '#111827' },
  actionsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
    minWidth: 60,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e3a5f',
  },
  pdfLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e8edf5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    justifyContent: 'center',
  },
  pdfLoadingText: { fontSize: 13, color: '#1e3a5f' },
  row: { flexDirection: 'row', marginBottom: 0 },
  flex1: { flex: 1 },
  cardLabel: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  cardText: { fontSize: 12, color: '#374151', marginBottom: 2 },
  cardMono: { fontSize: 11, color: '#6b7280', fontFamily: 'monospace', marginBottom: 2 },
  metaRow: { flexDirection: 'row', marginBottom: 4 },
  metaLabel: { fontSize: 12, color: '#6b7280', width: 130 },
  metaValue: { fontSize: 12, color: '#111827', flex: 1 },
  // Items
  itemRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  itemDesc: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  itemAmount: { fontSize: 14, fontWeight: '700', color: '#1e3a5f' },
  itemSub: { fontSize: 11, color: '#6b7280', marginBottom: 2 },
  itemTax: { fontSize: 11, color: '#9ca3af' },
  // HSN table
  tableHeader: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginBottom: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  tableCell: { fontSize: 11, color: '#374151' },
  tableCellR: { textAlign: 'right' },
  // Totals
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  totalLabel: { fontSize: 14, color: '#6b7280' },
  totalValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  grandLine: { borderBottomWidth: 0, marginTop: 4, paddingTop: 10, borderTopWidth: 2, borderTopColor: '#1e3a5f' },
  grandLabel: { fontSize: 16, fontWeight: '700', color: '#1e3a5f' },
  grandValue: { fontSize: 20, fontWeight: '800', color: '#1e3a5f' },
});
