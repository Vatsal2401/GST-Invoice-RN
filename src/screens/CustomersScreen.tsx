import React, { useState, useEffect, useCallback } from 'react';
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

import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../services/customerService';
import { useStore } from '../store/useStore';
import type { Customer, CustomerInput } from '../types';
import type { CustomersStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<CustomersStackParamList, 'CustomerList'>;

const EMPTY_FORM: CustomerInput = {
  name: '', address: '', city: '', state: '', state_code: '',
  pincode: '', gstin: '', pan: '', phone: '',
};

export default function CustomersScreen(): React.ReactElement {
  const navigation = useNavigation<NavProp>();
  const { showToast } = useStore();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filtered, setFiltered] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<CustomerInput>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getCustomers();
      setCustomers(data);
      setFiltered(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(customers);
    } else {
      const q = search.toLowerCase();
      setFiltered(
        customers.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.city.toLowerCase().includes(q) ||
            c.gstin.toLowerCase().includes(q)
        )
      );
    }
  }, [search, customers]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setModalVisible(true);
  };

  const openEdit = (c: Customer) => {
    const { id: _id, created_at: _ca, ...rest } = c;
    setForm(rest);
    setEditId(c.id);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Customer name is required');
      return;
    }
    setSaving(true);
    try {
      if (editId !== null) {
        await updateCustomer(editId, form);
        showToast('Customer updated', 'success');
      } else {
        await createCustomer(form);
        showToast('Customer added', 'success');
      }
      setModalVisible(false);
      await load();
    } catch (e) {
      showToast('Failed to save customer', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (c: Customer) => {
    Alert.alert(
      'Delete Customer',
      `Delete "${c.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCustomer(c.id);
              showToast('Customer deleted', 'success');
              await load();
            } catch (e) {
              showToast('Failed to delete', 'error');
            }
          },
        },
      ]
    );
  };

  const handleViewLedger = (c: Customer) => {
    navigation.navigate('CustomerLedger', { customerId: c.id, customerName: c.name });
  };

  const handleLongPress = (c: Customer) => {
    Alert.alert(c.name, 'Choose action', [
      { text: 'Edit', onPress: () => openEdit(c) },
      { text: 'View Ledger', onPress: () => handleViewLedger(c) },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(c) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const setField = (field: keyof CustomerInput, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e3a5f" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers..."
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

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleViewLedger(item)}
            onLongPress={() => handleLongPress(item)}
            activeOpacity={0.7}
          >
            <Card style={styles.customerCard}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.customerName}>{item.name}</Text>
                  <Text style={styles.customerSub}>
                    {[item.city, item.state].filter(Boolean).join(', ')}
                  </Text>
                  {item.gstin ? (
                    <Text style={styles.customerGstin}>GSTIN: {item.gstin}</Text>
                  ) : null}
                  {item.phone ? (
                    <Text style={styles.customerPhone}>
                      <Ionicons name="call-outline" size={11} color="#6b7280" /> {item.phone}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
                    <Ionicons name="create-outline" size={20} color="#1e3a5f" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
                    <Ionicons name="trash-outline" size={20} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No customers yet</Text>
            <Text style={styles.emptySubText}>Tap + to add your first customer</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        title={editId ? 'Edit Customer' : 'Add Customer'}
        onClose={() => setModalVisible(false)}
      >
        <Input
          label="Name *"
          value={form.name}
          onChangeText={(v) => setField('name', v)}
          placeholder="Customer Name"
        />
        <Input
          label="Address"
          value={form.address}
          onChangeText={(v) => setField('address', v)}
          placeholder="Street, Area"
          multiline
        />
        <View style={styles.row}>
          <Input
            label="City"
            value={form.city}
            onChangeText={(v) => setField('city', v)}
            placeholder="City"
            containerStyle={styles.flex1}
          />
          <View style={styles.spacer} />
          <Input
            label="State"
            value={form.state}
            onChangeText={(v) => setField('state', v)}
            placeholder="State"
            containerStyle={styles.flex1}
          />
        </View>
        <View style={styles.row}>
          <Input
            label="State Code"
            value={form.state_code}
            onChangeText={(v) => setField('state_code', v)}
            placeholder="27"
            keyboardType="numeric"
            containerStyle={styles.flex1}
          />
          <View style={styles.spacer} />
          <Input
            label="Pincode"
            value={form.pincode}
            onChangeText={(v) => setField('pincode', v)}
            placeholder="400001"
            keyboardType="numeric"
            containerStyle={styles.flex1}
          />
        </View>
        <Input
          label="GSTIN"
          value={form.gstin}
          onChangeText={(v) => setField('gstin', v.toUpperCase())}
          placeholder="22AAAAA0000A1Z5"
          autoCapitalize="characters"
        />
        <Input
          label="PAN"
          value={form.pan}
          onChangeText={(v) => setField('pan', v.toUpperCase())}
          placeholder="AAAAA9999A"
          autoCapitalize="characters"
        />
        <Input
          label="Phone"
          value={form.phone}
          onChangeText={(v) => setField('phone', v)}
          placeholder="9876543210"
          keyboardType="phone-pad"
        />
        <Button
          title={editId ? 'Update Customer' : 'Add Customer'}
          onPress={handleSave}
          loading={saving}
          icon="checkmark-outline"
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 2,
  },
  listContent: {
    padding: 12,
    paddingTop: 8,
    paddingBottom: 80,
  },
  customerCard: {
    padding: 12,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  customerSub: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  customerGstin: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  customerPhone: {
    fontSize: 12,
    color: '#6b7280',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    padding: 6,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  emptySubText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  spacer: {
    width: 12,
  },
});
