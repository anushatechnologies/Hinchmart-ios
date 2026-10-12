/**
 * HINCH MART — Legal & Support Screens (IBO Home Building Megastore Theme)
 * - PrivacyPolicyScreen: Live content fetch with structured fallback
 * - HelpSupportScreen: Instant contact cards (Phone: +91 8388899999, Email: support@hinchmart.com, FAQs)
 * - AboutScreen: Company overview, core pillars, version chip
 * - TermsScreen: Commercial B2B trade terms
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  ScrollView,
  Platform,
  StatusBar,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { useTheme } from '../../../theme';
import { helpApi } from '../../../services/api/help.api';
import { ApiSupportTicket, TicketMessage } from '../../../types/backend.types';

interface PolicySection {
  title?: string;
  heading?: string;
  content?: string | string[];
  body?: string;
  bullets?: string[];
}

interface PolicyData {
  title?: string;
  effectiveDate?: string;
  company?: string;
  app?: string;
  website?: string;
  contactEmail?: string;
  sections?: PolicySection[];
  copyright?: string;
  content?: string;
}

/* ================================================================== */
/* 1. PRIVACY POLICY SCREEN                                           */
/* ================================================================== */
export function PrivacyPolicyScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [policyData, setPolicyData] = useState<PolicyData | string | null>(null);
  const [error, setError] = useState(false);

  const fetchPrivacyPolicy = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await axios.get('https://api.hinchmart.com/api/content/privacy-policy', {
        timeout: 8000,
      });
      if (res.data) {
        const raw = res.data.data || res.data.content || res.data;
        setPolicyData(raw);
      } else {
        setPolicyData(null);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrivacyPolicy();
  }, []);

  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20
  );

  const renderPolicyContent = () => {
    if (!policyData) {
      return (
        <View style={styles.policySections}>
          <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
            1. Information We Collect
          </Text>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
            HINCH MART collects information necessary to facilitate B2B construction transactions, including business profile details, GST/Tax IDs, contact numbers, delivery addresses, and payment references.
          </Text>

          <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
            2. How We Use Your Data
          </Text>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
            Your data is exclusively used for fulfilling purchase orders, processing custom RFQ quotations, delivering heavy building materials, communicating logistics updates, and ensuring platform security.
          </Text>

          <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
            3. Information Sharing & Security
          </Text>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
            We do not sell personal or enterprise data. Information is shared strictly with verified logistics partners and suppliers fulfilling your active construction orders under strict confidentiality.
          </Text>

          <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
            4. Data Protection Rights
          </Text>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
            You reserve the right to request access, correction, or deletion of your stored business account information at any time by contacting our support team at support@hinchmart.com.
          </Text>
        </View>
      );
    }

    if (typeof policyData === 'string') {
      return <Text style={[styles.bodyText, { color: theme.colors.textPrimary }]}>{policyData}</Text>;
    }

    const obj = policyData as PolicyData;
    const sections: PolicySection[] = Array.isArray(obj.sections) ? obj.sections : [];

    return (
      <View style={styles.policySections}>
        {obj.effectiveDate && (
          <Text style={[styles.cardHeaderSub, { color: theme.colors.textTertiary, marginBottom: 12 }]}>
            Effective Date: {String(obj.effectiveDate)}
          </Text>
        )}

        {obj.content && typeof obj.content === 'string' && (
          <Text style={[styles.bodyText, { color: theme.colors.textPrimary, marginBottom: 12 }]}>
            {obj.content}
          </Text>
        )}

        {sections.map((sec, idx) => {
          const titleText = sec.title || sec.heading || `Section ${idx + 1}`;
          const contentText =
            typeof sec.content === 'string'
              ? sec.content
              : Array.isArray(sec.content)
              ? sec.content.join('\n\n')
              : sec.body || '';

          return (
            <View key={idx} style={{ marginBottom: 14 }}>
              <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>{titleText}</Text>
              {Boolean(contentText) && (
                <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
                  {String(contentText)}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.surface}
        translucent
      />

      <View
        style={[
          styles.headerWrapper,
          {
            paddingTop: topPadding + 6,
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Privacy Policy</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>Data Protection & Usage</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.contentCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryLight }]}>
              <Ionicons name="shield-checkmark" size={22} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.cardHeaderTitle, { color: theme.colors.textPrimary }]}>
                HINCH MART Privacy Policy
              </Text>
              <Text style={[styles.cardHeaderSub, { color: theme.colors.textTertiary }]}>
                Enterprise Security Standards
              </Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading Privacy Policy...
              </Text>
            </View>
          ) : (
            renderPolicyContent()
          )}

          {error && (
            <TouchableOpacity onPress={fetchPrivacyPolicy} style={styles.retryBtn}>
              <Ionicons name="refresh" size={16} color={theme.colors.primary} />
              <Text style={[styles.retryText, { color: theme.colors.primary }]}>Refresh Content</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/* ================================================================== */
/* 2. HELP & SUPPORT SCREEN                                           */
/* ================================================================== */
export { HelpSupportScreen } from './HelpSupportScreen';


/* ================================================================== */
/* 3. ABOUT HINCH MART SCREEN                                         */
/* ================================================================== */
export function AboutScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.surface}
        translucent
      />

      <View
        style={[
          styles.headerWrapper,
          {
            paddingTop: topPadding + 6,
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>About HINCH MART</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>The Construction Megastore</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.aboutCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Image
            source={require('../../../../assets/logo-horizontal-color.png')}
            style={{ width: 180, height: 44, alignSelf: 'center' }}
            contentFit="contain"
          />
          <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>
            "EVERYTHING FOR EVERY CONSTRUCTION"
          </Text>
          <View style={[styles.versionPill, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="information-circle" size={13} color={theme.colors.primary} />
            <Text style={[styles.versionChip, { color: theme.colors.primary }]}>
              Version 1.0.0 (Build 1)
            </Text>
          </View>
        </View>

        {/* Pillars Card */}
        <View
          style={[
            styles.aboutInfoCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
            🏗️ Who We Are
          </Text>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary, marginTop: 4 }]}>
            HINCH MART is a comprehensive home-building and heavy construction e-commerce megastore, connecting civil contractors, builders, and individual home makers directly with verified building materials manufacturers.
          </Text>

          <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary, marginTop: 16 }]}>
            ⭐ Core Platform Pillars
          </Text>
          {[
            { title: 'Mill-Certified Supplies', desc: 'Direct sourcing of TMT rebar, OPC/PPC cement, structural steel, and plumbing.' },
            { title: 'Heavy Fleet Rentals', desc: 'On-demand dispatch of excavators, tower cranes, loaders, and diesel generators.' },
            { title: 'Custom RFQ Procurement', desc: 'Post exact BOQ requirements and receive competitive bids within 24 hours.' },
            { title: 'B2B Escrow Protection', desc: 'Secure settlement via Letters of Credit, Escrow transfers, and corporate cards.' },
          ].map((item, idx) => (
            <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 10, gap: 10 }}>
              <Ionicons name="shield-checkmark" size={16} color={theme.colors.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary }}>{item.title}</Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 }}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

/* ================================================================== */
/* 4. TERMS & CONDITIONS SCREEN                                       */
/* ================================================================== */
export function TermsScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const TERMS_SECTIONS = [
    {
      title: '1. Acceptance of Terms',
      body: 'By creating an account or transacting on HINCH MART, you agree to abide by these B2B Platform Terms and Conditions, commercial logistics standards, and applicable domestic regulations.',
    },
    {
      title: '2. Commercial Account Verification',
      body: 'Users must maintain authentic business registration details (GSTIN, PAN, Entity details). HINCH MART verifies official tax identifiers prior to authorizing wholesale pricing tiers.',
    },
    {
      title: '3. Orders, Quotations & RFQs',
      body: 'Quotations submitted by verified manufacturers are binding for the agreed validity period. Purchase orders finalized through the application are dispatched according to published delivery timelines.',
    },
    {
      title: '4. Equipment Rental Terms',
      body: 'Rental machinery is inspected prior to site dispatch. Certified machine operators must be permitted designated site access. Return timelines and mobilization fees are governed by active rental agreements.',
    },
    {
      title: '5. Payment & Settlement',
      body: 'Payments processed via Bank Wire, RTGS/NEFT, Corporate Card, or Business Wallet balance are protected until site delivery verification.',
    },
  ];

  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.surface}
        translucent
      />

      <View
        style={[
          styles.headerWrapper,
          {
            paddingTop: topPadding + 6,
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Terms & Conditions</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>Commercial Trade Policies</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
        {TERMS_SECTIONS.map((sec, idx) => (
          <View
            key={idx}
            style={[
              styles.termsSectionCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
              {sec.title}
            </Text>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary, marginTop: 4 }]}>
              {sec.body}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  scrollPadding: {
    padding: 16,
    paddingBottom: 40,
  },
  contentCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardHeaderSub: {
    fontSize: 12,
    marginTop: 2,
  },
  policySections: {
    gap: 12,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 19,
  },
  centerBox: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    marginTop: 10,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 14,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  supportCardWrap: {
    marginBottom: 14,
  },
  supportCard: {
    borderRadius: 10,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  goldStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 3,
  },
  supportHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  phoneIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportCardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  supportCardSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  callNowBtn: {
    backgroundColor: '#FDB913',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  callNowBtnText: {
    color: '#152238',
    fontSize: 13,
    fontWeight: '800',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  optionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  aboutCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 10,
    textAlign: 'center',
  },
  versionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  versionChip: {
    fontSize: 11,
    fontWeight: '700',
  },
  aboutInfoCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
  },
  termsSectionCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
});
