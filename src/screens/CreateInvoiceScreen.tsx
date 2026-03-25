import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  getNextInvoiceNumber,
} from '../services/invoiceService';
import { getCustomers } from '../services/customerService';
import { getBusinessProfile } from '../services/businessService';
import { calcItemAmounts, calculateInvoiceTotals } from '../utils/taxCalculator';
import { formatCurrency, getTodayISO } from '../utils/formatCurrency';
import { useStore } from '../store/useStore';
import type { Customer, InvoiceItem, Invoice } from '../types';
import type { InvoicesStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<InvoicesStackParamList, 'CreateInvoice'>;
type RouteType = RouteProp<InvoicesStackParamList, 'CreateInvoice'>;

const EMPTY_ITEM = (): InvoiceItem => ({
  sl_no: 1,
  description: '',
  hsn_sac: '',
  quantity: 0,
  unit: 'Nos',
  rate: 0,
  per: 'Nos',
  amount: 0,
  cgst_rate: 9,
  sgst_rate: 9,
  cgst_amount: 0,
  sgst_amount: 0,
});

type InvoiceForm = Omit<Invoice, 'id' | 'created_at' | 'total_quantity' | 'taxable_value' | 'cgst_total' | 'sgst_total' | 'grand_total'>;

const EMPTY_FORM: InvoiceForm = {
  invoice_number: '',
  invoice_date: getTodayISO(),
  customer_id: undefined,
  buyer_name: '',
  buyer_address: '',
  buyer_gstin: '',
  buyer_pan: '',
  buyer_state: '',
  buyer_state_code: '',
  ship_to_name: '',
  ship_to_address: '',
  ship_to_gstin: '',
  ship_to_state: '',
  delivery_note: '',
  payment_terms: '',
  delivery_terms: '',
  buyer_order_number: '',
  buyer_order_date: '',
  dispatch_doc_number: '',
  dispatch_doc_date: '',
  dispatched_through: '',
  destination: '',
  status: 'DRAFT',
  cancelled: false,
};

export default function CreateInvoiceScreen(): React.ReactElement {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const invoiceId = route.params?.invoiceId;
  const { showToast } = useStore();

  const [form, setForm] = useState<InvoiceForm>(EMPTY_FORM);
  const [items, setItems] = useState<InvoiceItem[]>([EMPTY_ITEM()]);
  const [sameAsShipTo, setSameAsShipTo] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [custList, nextNum] = await Promise.all([
        getCustomers(),
        invoiceId ? Promise.resolve('') : getNextInvoiceNumber(),
      ]);
      setCustomers(custList);

      if (invoiceId) {
        const existing = await getInvoiceById(invoiceId);
        if (existing) {
          const { id: _id, created_at: _ca, total_quantity: _tq, taxable_value: _tv,
            cgst_total: _ct, sgst_total: _st, grand_total: _gt, items: invItems, ...rest } = existing;
          setForm(rest as InvoiceForm);
          setItems(invItems.length > 0 ? invItems : [EMPTY_ITEM()]);
          const shipDiffers =
            existing.ship_to_name !== existing.buyer_name ||
            existing.ship_to_address !== existing.buyer_address;
          setSameAsShipTo(!shipDiffers);
        }
      } else {
        setForm((p) => ({ ...p, invoice_number: nextNum }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => { load(); }, [load]);

  const setField = (field: keyof InvoiceForm, value: string | number | undefined) =>
    setForm((p) => ({ ...p, [field]: value }));

  const selectCustomer = (c: Customer) => {
    setForm((p) => ({
      ...p,
      customer_id: c.id,
      buyer_name: c.name,
      buyer_address: [c.address, c.city, c.state, c.pincode].filter(Boolean).join(', '),
      buyer_gstin: c.gstin,
      buyer_pan: c.pan,
      buyer_state: c.state,
      buyer_state_code: c.state_code,
    }));
    if (sameAsShipTo) {
      setForm((p) => ({
        ...p,
        ship_to_name: c.name,
        ship_to_address: [c.address, c.city, c.state, c.pincode].filter(Boolean).join(', '),
        ship_to_gstin: c.gstin,
        ship_to_state: c.state,
      }));
    }
    setCustomerModalVisible(false);
  };

  // Sync ship-to with buyer when sameAsShipTo toggled on
  useEffect(() => {
    if (sameAsShipTo) {
      setForm((p) => ({
        ...p,
        ship_to_name: p.buyer_name,
        ship_to_address: p.buyer_address,
        ship_to_gstin: p.buyer_gstin,
        ship_to_state: p.buyer_state,
      }));
    }
  }, [sameAsShipTo]);

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      const updated = { ...next[index], [field]: value };
      const recalc = calcItemAmounts(updated) as InvoiceItem;
      next[index] = recalc;
      return next;
    });
  };

  const addItem = () => {
    setItems((prev) => [...prev, { ...EMPTY_ITEM(), sl_no: prev.length + 1 }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      Alert.alert('Info', 'At least one item is required');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index).map((it, i) => ({ ...it, sl_no: i + 1 })));
  };

  const totals = calculateInvoiceTotals(items);

  const validateAndSave = async (navigateToPreview = false) => {
    if (!form.buyer_name.trim()) {
      Alert.alert('Validation', 'Buyer name is required');
      return;
    }
    if (items.some((it) => !it.description.trim())) {
      Alert.alert('Validation', 'All items must have a description');
      return;
    }
    setSaving(true);
    try {
      const invoiceData: Omit<Invoice, 'id' | 'created_at'> = {
        ...form,
        ...totals,
      };
      let savedId: string;
      if (invoiceId) {
        await updateInvoice(invoiceId, invoiceData, items);
        savedId = invoiceId;
        showToast('Invoice updated', 'success');
      } else {
        savedId = await createInvoice(invoiceData, items);
        showToast('Invoice saved', 'success');
      }
      if (navigateToPreview) {
        navigation.replace('PreviewInvoice', { invoiceId: savedId });
      } else {
        navigation.goBack();
      }
    } catch (e) {
      showToast('Failed to save invoice', 'error');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = customerSearch
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.gstin.toLowerCase().includes(customerSearch.toLowerCase())
      )
    : customers;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e3a5f" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Section 1: Invoice Details ── */}
        <Card>
          <Text style={styles.sectionTitle}>Invoice Details</Text>
          <View style={styles.row}>
            <Input
              label="Invoice Number"
              value={form.invoice_number}
              onChangeText={(v) => setField('invoice_number', v)}
              placeholder="INV-001"
              containerStyle={styles.flex1}
            />
            <View style={styles.spacer} />
            <Input
              label="Date (YYYY-MM-DD)"
              value={form.invoice_date}
              onChangeText={(v) => setField('invoice_date', v)}
              placeholder="2025-03-15"
              containerStyle={styles.flex1}
            />
          </View>
          <View style={styles.row}>
            <Input
              label="Payment Terms"
              value={form.payment_terms}
              onChangeText={(v) => setField('payment_terms', v)}
              placeholder="30 days"
              containerStyle={styles.flex1}
            />
            <View style={styles.spacer} />
            <Input
              label="Delivery Terms"
              value={form.delivery_terms}
              onChangeText={(v) => setField('delivery_terms', v)}
              placeholder="Ex-works"
              containerStyle={styles.flex1}
            />
          </View>
          <View style={styles.row}>
            <Input
              label="Buyer Order No."
              value={form.buyer_order_number}
              onChangeText={(v) => setField('buyer_order_number', v)}
              placeholder="PO-123"
              containerStyle={styles.flex1}
            />
            <View style={styles.spacer} />
            <Input
              label="Order Date"
              value={form.buyer_order_date}
              onChangeText={(v) => setField('buyer_order_date', v)}
              placeholder="2025-03-10"
              containerStyle={styles.flex1}
            />
          </View>
          <View style={styles.row}>
            <Input
              label="Dispatch Doc No."
              value={form.dispatch_doc_number}
              onChangeText={(v) => setField('dispatch_doc_number', v)}
              placeholder=""
              containerStyle={styles.flex1}
            />
            <View style={styles.spacer} />
            <Input
              label="Doc Date"
              value={form.dispatch_doc_date}
              onChangeText={(v) => setField('dispatch_doc_date', v)}
              placeholder="2025-03-15"
              containerStyle={styles.flex1}
            />
          </View>
          <View style={styles.row}>
            <Input
              label="Dispatched Through"
              value={form.dispatched_through}
              onChangeText={(v) => setField('dispatched_through', v)}
              placeholder="Transport Name"
              containerStyle={styles.flex1}
            />
            <View style={styles.spacer} />
            <Input
              label="Destination"
              value={form.destination}
              onChangeText={(v) => setField('destination', v)}
              placeholder="City"
              containerStyle={styles.flex1}
            />
          </View>
          <Input
            label="Delivery Note"
            value={form.delivery_note}
            onChangeText={(v) => setField('delivery_note', v)}
            placeholder="Delivery note reference"
          />
        </Card>

        {/* ── Section 2: Bill To ── */}
        <Card>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <TouchableOpacity
              style={styles.pickCustomerBtn}
              onPress={() => setCustomerModalVisible(true)}
            >
              <Ionicons name="person-add-outline" size={16} color="#1e3a5f" />
              <Text style={styles.pickCustomerText}>Pick Customer</Text>
            </TouchableOpacity>
          </View>
          <Input
            label="Buyer Name *"
            value={form.buyer_name}
            onChangeText={(v) => {
              setField('buyer_name', v);
              if (sameAsShipTo) setField('ship_to_name', v);
            }}
            placeholder="Company / Person Name"
          />
          <Input
            label="Address"
            value={form.buyer_address}
            onChangeText={(v) => {
              setField('buyer_address', v);
              if (sameAsShipTo) setField('ship_to_address', v);
            }}
            placeholder="Full Address"
            multiline
          />
          <View style={styles.row}>
            <Input
              label="GSTIN"
              value={form.buyer_gstin}
              onChangeText={(v) => {
                setField('buyer_gstin', v.toUpperCase());
                if (sameAsShipTo) setField('ship_to_gstin', v.toUpperCase());
              }}
              placeholder="22AAAAA0000A1Z5"
              autoCapitalize="characters"
              containerStyle={styles.flex1}
            />
            <View style={styles.spacer} />
            <Input
              label="PAN"
              value={form.buyer_pan}
              onChangeText={(v) => setField('buyer_pan', v.toUpperCase())}
              placeholder="AAAAA9999A"
              autoCapitalize="characters"
              containerStyle={styles.flex1}
            />
          </View>
          <View style={styles.row}>
            <Input
              label="State"
              value={form.buyer_state}
              onChangeText={(v) => {
                setField('buyer_state', v);
                if (sameAsShipTo) setField('ship_to_state', v);
              }}
              placeholder="Maharashtra"
              containerStyle={styles.flex1}
            />
            <View style={styles.spacer} />
            <Input
              label="State Code"
              value={form.buyer_state_code}
              onChangeText={(v) => setField('buyer_state_code', v)}
              placeholder="27"
              keyboardType="numeric"
              containerStyle={styles.flex1}
            />
          </View>
        </Card>

        {/* ── Section 3: Ship To ── */}
        <Card>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Ship To</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Same as Bill To</Text>
              <Switch
                value={sameAsShipTo}
                onValueChange={setSameAsShipTo}
                trackColor={{ false: '#d1d5db', true: '#1e3a5f' }}
                thumbColor={sameAsShipTo ? '#f0a500' : '#f4f3f4'}
              />
            </View>
          </View>
          {!sameAsShipTo && (
            <>
              <Input
                label="Ship To Name"
                value={form.ship_to_name}
                onChangeText={(v) => setField('ship_to_name', v)}
                placeholder="Consignee Name"
              />
              <Input
                label="Ship To Address"
                value={form.ship_to_address}
                onChangeText={(v) => setField('ship_to_address', v)}
                placeholder="Consignee Address"
                multiline
              />
              <View style={styles.row}>
                <Input
                  label="GSTIN"
                  value={form.ship_to_gstin}
                  onChangeText={(v) => setField('ship_to_gstin', v.toUpperCase())}
                  placeholder="GSTIN"
                  autoCapitalize="characters"
                  containerStyle={styles.flex1}
                />
                <View style={styles.spacer} />
                <Input
                  label="State"
                  value={form.ship_to_state}
                  onChangeText={(v) => setField('ship_to_state', v)}
                  placeholder="State"
                  containerStyle={styles.flex1}
                />
              </View>
            </>
          )}
        </Card>

        {/* ── Section 4: Items ── */}
        <Card>
          <Text style={styles.sectionTitle}>Items</Text>
          {items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNumber}>Item #{item.sl_no}</Text>
                <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeItemBtn}>
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
              <Input
                label="Description *"
                value={item.description}
                onChangeText={(v) => updateItem(index, 'description', v)}
                placeholder="Product / Service Description"
              />
              <View style={styles.row}>
                <Input
                  label="HSN/SAC"
                  value={item.hsn_sac}
                  onChangeText={(v) => updateItem(index, 'hsn_sac', v)}
                  placeholder="1234"
                  containerStyle={styles.flex1}
                />
                <View style={styles.spacer} />
                <Input
                  label="Unit"
                  value={item.unit}
                  onChangeText={(v) => updateItem(index, 'unit', v)}
                  placeholder="Nos"
                  containerStyle={{ width: 80 }}
                />
              </View>
              <View style={styles.row}>
                <Input
                  label="Quantity"
                  value={item.quantity === 0 ? '' : String(item.quantity)}
                  onChangeText={(v) => updateItem(index, 'quantity', parseFloat(v) || 0)}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  containerStyle={styles.flex1}
                />
                <View style={styles.spacer} />
                <Input
                  label="Rate (₹)"
                  value={item.rate === 0 ? '' : String(item.rate)}
                  onChangeText={(v) => updateItem(index, 'rate', parseFloat(v) || 0)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  containerStyle={styles.flex1}
                />
              </View>
              <View style={styles.row}>
                <Input
                  label="CGST %"
                  value={String(item.cgst_rate)}
                  onChangeText={(v) => updateItem(index, 'cgst_rate', parseFloat(v) || 0)}
                  placeholder="9"
                  keyboardType="decimal-pad"
                  containerStyle={styles.flex1}
                />
                <View style={styles.spacer} />
                <Input
                  label="SGST %"
                  value={String(item.sgst_rate)}
                  onChangeText={(v) => updateItem(index, 'sgst_rate', parseFloat(v) || 0)}
                  placeholder="9"
                  keyboardType="decimal-pad"
                  containerStyle={styles.flex1}
                />
              </View>
              <View style={styles.itemAmountRow}>
                <Text style={styles.itemAmountLabel}>Taxable: {formatCurrency(item.amount)}</Text>
                <Text style={styles.itemAmountLabel}>CGST: {formatCurrency(item.cgst_amount)}</Text>
                <Text style={styles.itemAmountLabel}>SGST: {formatCurrency(item.sgst_amount)}</Text>
              </View>
              <Text style={styles.itemTotal}>Item Total: {formatCurrency(item.amount + item.cgst_amount + item.sgst_amount)}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
            <Ionicons name="add-circle-outline" size={20} color="#1e3a5f" />
            <Text style={styles.addItemText}>Add Item</Text>
          </TouchableOpacity>
        </Card>

        {/* ── Section 5: Totals ── */}
        <Card>
          <Text style={styles.sectionTitle}>Totals</Text>
          <View style={styles.totalsGrid}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Taxable Value</Text>
              <Text style={styles.totalValue}>{formatCurrency(totals.taxable_value)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>CGST</Text>
              <Text style={styles.totalValue}>{formatCurrency(totals.cgst_total)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>SGST</Text>
              <Text style={styles.totalValue}>{formatCurrency(totals.sgst_total)}</Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(totals.grand_total)}</Text>
            </View>
          </View>
        </Card>

        {/* ── Buttons ── */}
        <View style={styles.btnRow}>
          <Button
            title="Save Draft"
            onPress={() => validateAndSave(false)}
            variant="ghost"
            loading={saving}
            icon="save-outline"
            style={styles.flex1}
          />
          <View style={styles.spacer} />
          <Button
            title="Save & Preview"
            onPress={() => validateAndSave(true)}
            loading={saving}
            icon="eye-outline"
            style={styles.flex1}
          />
        </View>
      </ScrollView>

      {/* Customer Picker Modal */}
      <Modal
        visible={customerModalVisible}
        title="Select Customer"
        onClose={() => setCustomerModalVisible(false)}
      >
        <View style={styles.customerSearchRow}>
          <Ionicons name="search" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.customerSearchInput}
            placeholder="Search..."
            placeholderTextColor="#9ca3af"
            value={customerSearch}
            onChangeText={setCustomerSearch}
          />
        </View>
        {filteredCustomers.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.customerPickerItem}
            onPress={() => selectCustomer(c)}
          >
            <Text style={styles.customerPickerName}>{c.name}</Text>
            <Text style={styles.customerPickerSub}>{[c.city, c.state].filter(Boolean).join(', ')}</Text>
            {c.gstin ? <Text style={styles.customerPickerGstin}>{c.gstin}</Text> : null}
          </TouchableOpacity>
        ))}
        {filteredCustomers.length === 0 && (
          <Text style={styles.noCustomerText}>No customers found</Text>
        )}
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f5f7fa' },
  scroll: { flex: 1 },
  container: { padding: 12, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e3a5f',
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  spacer: { width: 12 },
  pickCustomerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#e8edf5',
    borderRadius: 8,
  },
  pickCustomerText: {
    fontSize: 13,
    color: '#1e3a5f',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    fontSize: 13,
    color: '#374151',
  },
  // Items
  itemCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e3a5f',
  },
  removeItemBtn: { padding: 4 },
  itemAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  itemAmountLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e3a5f',
    textAlign: 'right',
    marginTop: 4,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#1e3a5f',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
  },
  addItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e3a5f',
  },
  // Totals
  totalsGrid: { gap: 8 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  totalLabel: { fontSize: 14, color: '#6b7280' },
  totalValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  grandTotalRow: {
    borderBottomWidth: 0,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#1e3a5f',
  },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: '#1e3a5f' },
  grandTotalValue: { fontSize: 18, fontWeight: '700', color: '#1e3a5f' },
  btnRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  // Customer picker
  customerSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  customerSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  customerPickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  customerPickerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  customerPickerSub: {
    fontSize: 12,
    color: '#6b7280',
  },
  customerPickerGstin: {
    fontSize: 11,
    color: '#9ca3af',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  noCustomerText: {
    textAlign: 'center',
    color: '#9ca3af',
    paddingVertical: 20,
  },
});
