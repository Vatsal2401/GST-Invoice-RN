import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';

import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { getBusinessProfile, saveBusinessProfile, uploadLogo } from '../services/businessService';
import { useStore } from '../store/useStore';
import { getApiError } from '../lib/apiError';
import type { BusinessProfileInput } from '../types';

const EMPTY_FORM: BusinessProfileInput = {
  business_name: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  pincode: '',
  gstin: '',
  pan: '',
  phone: '',
  email: '',
  bank_name: '',
  account_number: '',
  ifsc_code: '',
  branch: '',
  swift_code: '',
  signatory_name: '',
  invoice_prefix: 'INV',
  logo_url: '',
};

export default function SetupScreen(): React.ReactElement {
  const [form, setForm] = useState<BusinessProfileInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const { setBusinessProfile, showToast, logout } = useStore();

  const loadProfile = useCallback(async () => {
    try {
      const profile = await getBusinessProfile();
      if (profile) {
        const { id: _id, ...rest } = profile;
        setForm(rest);
        setBusinessProfile(profile);
      }
    } catch {
      // Profile may not exist yet for new users
    } finally {
      setLoading(false);
    }
  }, [setBusinessProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleChange = (field: keyof BusinessProfileInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePickLogo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg', 'image/jpg'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingLogo(true);
        const ext = asset.name.split('.').pop() || 'jpg';
        const mimeType = asset.mimeType || `image/${ext}`;
        const logo_url = await uploadLogo(asset.uri, asset.name, mimeType);
        setForm((prev) => ({ ...prev, logo_url }));
        showToast('Logo uploaded', 'success');
      }
    } catch (err) {
      showToast(getApiError(err, 'Failed to upload logo'), 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!form.business_name.trim()) {
      Alert.alert('Validation', 'Business name is required');
      return;
    }
    setSaving(true);
    try {
      await saveBusinessProfile(form);
      const updated = await getBusinessProfile();
      if (updated) setBusinessProfile(updated);
      showToast('Business profile saved!', 'success');
    } catch (err) {
      showToast(getApiError(err, 'Failed to save profile'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e3a5f" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Card>
        <Text style={styles.sectionTitle}>
          <Ionicons name="business" size={16} color="#1e3a5f" /> Business Information
        </Text>
        <Input
          label="Business Name *"
          value={form.business_name}
          onChangeText={(v) => handleChange('business_name', v)}
          placeholder="Your Business Name"
        />
        <Input
          label="Address Line 1"
          value={form.address1}
          onChangeText={(v) => handleChange('address1', v)}
          placeholder="Street / Building"
        />
        <Input
          label="Address Line 2"
          value={form.address2}
          onChangeText={(v) => handleChange('address2', v)}
          placeholder="Area / Locality"
        />
        <View style={styles.row}>
          <Input
            label="City"
            value={form.city}
            onChangeText={(v) => handleChange('city', v)}
            placeholder="City"
            containerStyle={styles.flex1}
          />
          <View style={styles.spacer} />
          <Input
            label="State"
            value={form.state}
            onChangeText={(v) => handleChange('state', v)}
            placeholder="State"
            containerStyle={styles.flex1}
          />
        </View>
        <View style={styles.row}>
          <Input
            label="Pincode"
            value={form.pincode}
            onChangeText={(v) => handleChange('pincode', v)}
            placeholder="400001"
            keyboardType="numeric"
            containerStyle={styles.flex1}
          />
          <View style={styles.spacer} />
          <Input
            label="Phone"
            value={form.phone}
            onChangeText={(v) => handleChange('phone', v)}
            placeholder="9876543210"
            keyboardType="phone-pad"
            containerStyle={styles.flex1}
          />
        </View>
        <Input
          label="Email"
          value={form.email}
          onChangeText={(v) => handleChange('email', v)}
          placeholder="info@business.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>
          <Ionicons name="card" size={16} color="#1e3a5f" /> Tax Information
        </Text>
        <Input
          label="GSTIN"
          value={form.gstin}
          onChangeText={(v) => handleChange('gstin', v.toUpperCase())}
          placeholder="22AAAAA0000A1Z5"
          autoCapitalize="characters"
        />
        <Input
          label="PAN"
          value={form.pan}
          onChangeText={(v) => handleChange('pan', v.toUpperCase())}
          placeholder="AAAAA9999A"
          autoCapitalize="characters"
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>
          <Ionicons name="cash" size={16} color="#1e3a5f" /> Bank Details
        </Text>
        <Input
          label="Bank Name"
          value={form.bank_name}
          onChangeText={(v) => handleChange('bank_name', v)}
          placeholder="State Bank of India"
        />
        <Input
          label="Account Number"
          value={form.account_number}
          onChangeText={(v) => handleChange('account_number', v)}
          placeholder="000011112222"
          keyboardType="numeric"
        />
        <View style={styles.row}>
          <Input
            label="IFSC Code"
            value={form.ifsc_code}
            onChangeText={(v) => handleChange('ifsc_code', v.toUpperCase())}
            placeholder="SBIN0001234"
            autoCapitalize="characters"
            containerStyle={styles.flex1}
          />
          <View style={styles.spacer} />
          <Input
            label="Branch"
            value={form.branch}
            onChangeText={(v) => handleChange('branch', v)}
            placeholder="Main Branch"
            containerStyle={styles.flex1}
          />
        </View>
        <Input
          label="SWIFT Code"
          value={form.swift_code}
          onChangeText={(v) => handleChange('swift_code', v.toUpperCase())}
          placeholder="SBININBB (optional)"
          autoCapitalize="characters"
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>
          <Ionicons name="create" size={16} color="#1e3a5f" /> Invoice Settings
        </Text>
        <View style={styles.row}>
          <Input
            label="Invoice Prefix"
            value={form.invoice_prefix}
            onChangeText={(v) => handleChange('invoice_prefix', v.toUpperCase())}
            placeholder="INV"
            autoCapitalize="characters"
            containerStyle={styles.flex1}
          />
          <View style={styles.spacer} />
          <Input
            label="Signatory Name"
            value={form.signatory_name}
            onChangeText={(v) => handleChange('signatory_name', v)}
            placeholder="Authorised Person"
            containerStyle={styles.flex1}
          />
        </View>

        <Text style={styles.label}>Business Logo</Text>
        <TouchableOpacity style={styles.logoPicker} onPress={handlePickLogo} disabled={uploadingLogo}>
          {uploadingLogo ? (
            <View style={styles.logoPlaceholder}>
              <ActivityIndicator color="#1e3a5f" />
              <Text style={styles.logoPlaceholderText}>Uploading...</Text>
            </View>
          ) : form.logo_url ? (
            <Image source={{ uri: form.logo_url }} style={styles.logoPreview} resizeMode="contain" />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Ionicons name="image-outline" size={32} color="#9ca3af" />
              <Text style={styles.logoPlaceholderText}>Tap to upload logo</Text>
            </View>
          )}
        </TouchableOpacity>
        {form.logo_url ? (
          <TouchableOpacity onPress={() => setForm((p) => ({ ...p, logo_url: '' }))} style={styles.removeLogoBtn}>
            <Text style={styles.removeLogoText}>Remove Logo</Text>
          </TouchableOpacity>
        ) : null}
      </Card>

      <Button
        title="Save Profile"
        onPress={handleSave}
        loading={saving}
        icon="save-outline"
        style={styles.saveBtn}
      />

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#DC2626" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e3a5f',
    marginBottom: 14,
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
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  logoPicker: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  logoPreview: {
    width: '100%',
    height: 100,
  },
  logoPlaceholder: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoPlaceholderText: {
    color: '#9ca3af',
    fontSize: 13,
  },
  removeLogoBtn: {
    alignSelf: 'flex-start',
  },
  removeLogoText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
  },
  saveBtn: {
    marginTop: 8,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '600',
  },
});
