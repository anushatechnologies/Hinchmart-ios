/**
 * HINCH MART — GST & Business Tax Invoicing Screen
 * Functional B2B tax profile manager accessible from the Live B2B Hub:
 * - GSTIN input with live official-format validation + mod-36 checksum verification
 * - Auto-decoded GSTIN intelligence: State, Entity Type & embedded PAN
 * - PAN management with regex validation
 * - Business billing profile (legal name, business type, billing address)
 * - Persists everything to the Redux auth store (businessProfile)
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { updateUser } from '../../../redux/slices/authSlice';

/* ------------------------------------------------------------------ */
/* GST Reference Data                                                   */
/* ------------------------------------------------------------------ */

const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman & Diu',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (old)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction',
};

const ENTITY_TYPE_MAP: Record<string, string> = {
  '1': 'Individual / Proprietor',
  '2': 'Partnership',
  '3': 'HUF',
  '4': 'Company',
  '5': 'BOI / AOP',
  '6': 'Government Entity',
  '7': 'Trust',
  '8': 'LLP',
  '9': 'Local Authority',
  B: 'Body of Individuals',
  C: 'Company',
  F: 'Firm / LLP',
  G: 'Government',
  H: 'HUF',
  L: 'Local Authority',
  J: 'Artificial Juridical Person',
  T: 'Trust / Club / Society',
};

/* ------------------------------------------------------------------ */
/* GSTIN Validation Helpers                                            */
/* ------------------------------------------------------------------ */

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function verifyGSTINChecksum(gstin: string): boolean {
  const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const val = CHARS.indexOf(gstin[i]);
    if (val === -1) return false;
    const product = val * weights[i];
    sum += Math.floor(product / 36) + (product % 36);
  }
  const remainder = sum % 36;
  const expectedCheckChar = CHARS[(36 - remainder) % 36];
  return gstin[14] === expectedCheckChar;
}

interface GSTINInfo {
  stateCode: string;
  stateName: string;
  pan: string;
  entityTypeCode: string;
  entityTypeName: string;
  checksumValid: boolean;
}

function decodeGSTIN(gstin: string): GSTINInfo | null {
  if (!GSTIN_REGEX.test(gstin)) return null;
  const stateCode = gstin.slice(0, 2);
  const pan = gstin.slice(2, 12);
  const entityTypeCode = gstin[12];
  return {
    stateCode,
    stateName: GST_STATE_CODES[stateCode] ?? 'Unknown State',
    pan,
    entityTypeCode,
    entityTypeName: ENTITY_TYPE_MAP[entityTypeCode] ?? 'Unknown Entity',
    checksumValid: verifyGSTINChecksum(gstin),
  };
}

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

type FieldStatus = 'idle' | 'valid' | 'invalid';

const BUSINESS_TYPES = [
  'Proprietorship',
  'Partnership',
  'LLP',
  'Private Limited',
  'Public Limited',
  'HUF',
  'Trust / NGO',
  'Government',
  'Other',
];

export function GSTInvoiceScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const storedProfile = useAppSelector(
    (state: any) => state.auth?.user?.businessProfile ?? {},
  );

  const [gstin, setGstin] = useState<string>(storedProfile.gstin ?? '');
  const [pan, setPan] = useState<string>(storedProfile.pan ?? '');
  const [legalName, setLegalName] = useState<string>(storedProfile.legalName ?? '');
  const [businessType, setBusinessType] = useState<string>(storedProfile.businessType ?? '');
  const [billingAddress, setBillingAddress] = useState<string>(storedProfile.billingAddress ?? '');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const gstinInfo = gstin.length === 15 ? decodeGSTIN(gstin) : null;

  const gstinStatus: FieldStatus =
    gstin.length === 0
      ? 'idle'
      : gstinInfo && gstinInfo.checksumValid
        ? 'valid'
        : 'invalid';

  const panStatus: FieldStatus =
    pan.length === 0 ? 'idle' : PAN_REGEX.test(pan) ? 'valid' : 'invalid';

  const handleGstinChange = useCallback(
    (text: string) => {
      const upper = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
      setGstin(upper);
      if (upper.length === 15) {
        const info = decodeGSTIN(upper);
        if (info?.checksumValid && !pan) {
          setPan(info.pan);
        }
      }
    },
    [pan],
  );

  const handlePanChange = useCallback((text: string) => {
    setPan(text.toUpperCase().replace(/[^A-Z0-9]/g, ''));
  }, []);

  const handleSave = async () => {
    if (gstinStatus === 'invalid') {
      Alert.alert('Invalid GSTIN', 'Please enter a valid 15-character GSTIN.');
      return;
    }
    if (pan && panStatus === 'invalid') {
      Alert.alert('Invalid PAN', 'Please enter a valid 10-character PAN number.');
      return;
    }
    setSaving(true);
    try {
      await dispatch(
        updateUser({
          gstIN: gstin,
          pan,
          companyName: legalName,
          businessProfile: { gstin, pan, legalName, businessType, billingAddress } as any,
        }),
      );
      Alert.alert('✅ Saved', 'GST & business profile saved successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    Alert.alert('Clear Profile', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setGstin('');
          setPan('');
          setLegalName('');
          setBusinessType('');
          setBillingAddress('');
        },
      },
    ]);
  };

  const StatusIcon: React.FC<{ status: FieldStatus }> = ({ status }) => {
    if (status === 'valid')
      return <Ionicons name="checkmark-circle" size={20} color="#16A34A" style={styles.statusIcon} />;
    if (status === 'invalid')
      return <Ionicons name="close-circle" size={20} color="#EF4444" style={styles.statusIcon} />;
    return null;
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: Math.max(insets.top, StatusBar.currentHeight || 0, 16) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerWrap}>
          {navigation?.goBack && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#0F172A" />
            </TouchableOpacity>
          )}
          <View style={styles.headerIconWrap}>
            <Ionicons name="receipt-outline" size={28} color="#E31E24" />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>GST & Tax Profile</Text>
            <Text style={styles.headerSubtitle}>Manage your B2B invoicing details</Text>
          </View>
        </View>

        {/* GSTIN Card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>GSTIN</Text>
          <View
            style={[
              styles.inputRow,
              gstinStatus === 'valid' && styles.inputRowValid,
              gstinStatus === 'invalid' && styles.inputRowInvalid,
            ]}
          >
            <Ionicons name="business-outline" size={18} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={gstin}
              onChangeText={handleGstinChange}
              placeholder="e.g. 27AAPFU0939F1ZV"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              maxLength={15}
            />
            <StatusIcon status={gstinStatus} />
          </View>
          <Text style={styles.hintText}>15-character GSTIN (auto-validates checksum)</Text>

          {gstinInfo && gstinInfo.checksumValid && (
            <View style={styles.decodedCard}>
              <DecodedRow icon="location-outline" label="State" value={`${gstinInfo.stateCode} — ${gstinInfo.stateName}`} />
              <DecodedRow icon="person-outline" label="Entity Type" value={gstinInfo.entityTypeName} />
              <DecodedRow icon="card-outline" label="Embedded PAN" value={gstinInfo.pan} />
              <View style={styles.checksumBadge}>
                <Ionicons name="shield-checkmark-outline" size={13} color="#16A34A" />
                <Text style={styles.checksumText}>Checksum Verified</Text>
              </View>
            </View>
          )}
          {gstinStatus === 'invalid' && gstin.length > 0 && (
            <Text style={styles.errorText}>
              {gstin.length !== 15
                ? `${gstin.length}/15 characters entered`
                : 'Invalid format or checksum mismatch'}
            </Text>
          )}
        </View>

        {/* PAN Card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>PAN Number</Text>
          <View
            style={[
              styles.inputRow,
              panStatus === 'valid' && styles.inputRowValid,
              panStatus === 'invalid' && styles.inputRowInvalid,
            ]}
          >
            <Ionicons name="card-outline" size={18} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={pan}
              onChangeText={handlePanChange}
              placeholder="e.g. AAPFU0939F"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              maxLength={10}
            />
            <StatusIcon status={panStatus} />
          </View>
          <Text style={styles.hintText}>10-character PAN (auto-filled from valid GSTIN)</Text>
          {panStatus === 'invalid' && pan.length > 0 && (
            <Text style={styles.errorText}>Invalid PAN format</Text>
          )}
        </View>

        {/* Business Profile Card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Business Profile</Text>

          <Text style={styles.fieldLabel}>Legal Business Name</Text>
          <View style={styles.inputRow}>
            <Ionicons name="briefcase-outline" size={18} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={legalName}
              onChangeText={setLegalName}
              placeholder="Registered legal name"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Business Type</Text>
          <TouchableOpacity
            style={styles.inputRow}
            onPress={() => setShowTypePicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="layers-outline" size={18} color="#64748B" style={styles.inputIcon} />
            <Text style={[styles.input, !businessType && { color: '#94A3B8' }]}>
              {businessType || 'Select business type'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Billing Address</Text>
          <View style={[styles.inputRow, styles.textAreaRow]}>
            <Ionicons
              name="location-outline"
              size={18}
              color="#64748B"
              style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: 2 }]}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              value={billingAddress}
              onChangeText={setBillingAddress}
              placeholder="Complete billing address"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={16} color="#fff" />
                <Text style={styles.saveBtnText}>Save Profile</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color="#E31E24" />
          <Text style={styles.infoText}>
            Your GST details are used to generate B2B tax invoices and are encrypted at rest.
          </Text>
        </View>
      </ScrollView>

      {/* Business Type Picker */}
      {showTypePicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Business Type</Text>
            {BUSINESS_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.modalOption, businessType === type && styles.modalOptionSelected]}
                onPress={() => {
                  setBusinessType(type);
                  setShowTypePicker(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalOptionText, businessType === type && styles.modalOptionTextSelected]}>
                  {type}
                </Text>
                {businessType === type && <Ionicons name="checkmark" size={18} color="#E31E24" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowTypePicker(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

/* ------------------------------------------------------------------ */
/* DecodedRow helper                                                   */
/* ------------------------------------------------------------------ */

const DecodedRow: React.FC<{ icon: any; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={styles.decodedRow}>
    <Ionicons name={icon} size={14} color="#0038A8" style={{ marginRight: 6 }} />
    <Text style={styles.decodedLabel}>{label}: </Text>
    <Text style={styles.decodedValue}>{value}</Text>
  </View>
);

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { padding: 16, paddingBottom: 40 },

  headerWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { width: 32, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerIconWrap: {
    width: 52,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1, minWidth: 0, marginLeft: 10 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', flexShrink: 1 },
  headerSubtitle: { fontSize: 12.5, color: '#64748B', marginTop: 2, flexShrink: 1 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#152238',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    minHeight: 44,
  },
  inputRowValid: { borderColor: '#16A34A', backgroundColor: '#F0FDF4' },
  inputRowInvalid: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
  textAreaRow: { alignItems: 'flex-start', paddingVertical: 8 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 13.5, color: '#0F172A', fontWeight: '500', paddingVertical: 0, lineHeight: 18 },
  textArea: { minHeight: 60, paddingTop: 0 },
  statusIcon: { marginLeft: 6 },
  hintText: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  errorText: { fontSize: 11.5, color: '#EF4444', marginTop: 4 },

  decodedCard: { marginTop: 10, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', padding: 10, gap: 4 },
  decodedRow: { flexDirection: 'row', alignItems: 'flex-start' },
  decodedLabel: { width: 78, fontSize: 11.5, color: '#475569', fontWeight: '600' },
  decodedValue: { fontSize: 11.5, color: '#0F172A', flex: 1, flexWrap: 'wrap' },
  checksumBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  checksumText: { fontSize: 11, color: '#16A34A', fontWeight: '600' },

  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 12, width: '100%' },
  clearBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 11,
    backgroundColor: '#FFF5F5',
  },
  clearBtnText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: '#E31E24',
    paddingVertical: 11,
  },
  saveBtnText: { fontSize: 13.5, fontWeight: '700', color: '#FFFFFF' },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  infoText: { flex: 1, fontSize: 11.5, color: '#475569', lineHeight: 16 },

  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 18,
    paddingBottom: 32,
  },
  modalTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 12, textAlign: 'center' },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 3,
  },
  modalOptionSelected: { backgroundColor: '#FEF2F2' },
  modalOptionText: { fontSize: 13.5, color: '#0F172A' },
  modalOptionTextSelected: { color: '#E31E24', fontWeight: '600' },
  modalCancel: { marginTop: 8, paddingVertical: 12, alignItems: 'center', borderRadius: 8, backgroundColor: '#F1F5F9' },
  modalCancelText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
});
