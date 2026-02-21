import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Plus, Trash2, MapPin, Tag, MessageSquare } from 'lucide-react-native';

import { getFilters, saveFilter, deleteFilter, toggleFilter } from '../storage';
import { geocodePlace } from '../services/geocoding';
import { COLORS, SPACING, SHADOWS } from '../theme';

const PRESET_FEATURES = [
  'backyard', 'garage', 'pool', 'fireplace', 'basement',
  'ac', 'dishwasher', 'laundry', 'hardwood floors', 'open floor plan',
];

export default function FiltersScreen() {
  const [filters, setFilters] = useState([]);
  const [modal, setModal] = useState(null); // 'distance' | 'feature' | 'nl'

  // Distance form state
  const [distLabel, setDistLabel] = useState('');
  const [distAddress, setDistAddress] = useState('');
  const [distMaxKm, setDistMaxKm] = useState('10');
  const [distLoading, setDistLoading] = useState(false);

  // Feature form state
  const [featureKeyword, setFeatureKeyword] = useState('');

  // NL form state
  const [nlText, setNlText] = useState('');

  useFocusEffect(
    useCallback(() => {
      getFilters().then(setFilters);
    }, [])
  );

  async function reload() {
    const updated = await getFilters();
    setFilters(updated);
  }

  // ─── Distance ─────────────────────────────────────────────────────────────

  async function addDistanceFilter() {
    if (!distAddress.trim()) {
      Alert.alert('Missing address', 'Enter a place or address.');
      return;
    }
    const maxKm = parseFloat(distMaxKm);
    if (isNaN(maxKm) || maxKm <= 0) {
      Alert.alert('Invalid distance', 'Enter a positive number.');
      return;
    }

    setDistLoading(true);
    try {
      const geo = await geocodePlace(distAddress.trim());
      const filter = {
        id: Date.now().toString(),
        type: 'distance',
        enabled: true,
        label: distLabel.trim() || distAddress.trim(),
        address: distAddress.trim(),
        maxKm,
        coordinates: { lat: geo.lat, lng: geo.lng },
      };
      await saveFilter(filter);
      setDistLabel('');
      setDistAddress('');
      setDistMaxKm('10');
      setModal(null);
      reload();
    } catch (err) {
      Alert.alert('Geocoding failed', err.message);
    } finally {
      setDistLoading(false);
    }
  }

  // ─── Feature ──────────────────────────────────────────────────────────────

  async function addFeatureFilter(keyword) {
    const kw = (keyword ?? featureKeyword).trim().toLowerCase();
    if (!kw) return;
    // Avoid duplicates
    const existing = filters.find((f) => f.type === 'feature' && f.keyword === kw);
    if (existing) {
      Alert.alert('Already added', `"${kw}" filter already exists.`);
      return;
    }
    const filter = {
      id: Date.now().toString(),
      type: 'feature',
      enabled: true,
      label: kw.charAt(0).toUpperCase() + kw.slice(1),
      keyword: kw,
    };
    await saveFilter(filter);
    setFeatureKeyword('');
    if (!keyword) setModal(null);
    reload();
  }

  // ─── NL ───────────────────────────────────────────────────────────────────

  async function addNlFilter() {
    const text = nlText.trim();
    if (!text) return;
    const filter = {
      id: Date.now().toString(),
      type: 'nl',
      enabled: true,
      text,
      label: text,
    };
    await saveFilter(filter);
    setNlText('');
    setModal(null);
    reload();
  }

  // ─── Toggle / delete ──────────────────────────────────────────────────────

  async function handleToggle(id, value) {
    await toggleFilter(id, value);
    reload();
  }

  async function handleDelete(id) {
    Alert.alert('Remove filter', 'Delete this filter?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteFilter(id);
          reload();
        },
      },
    ]);
  }

  // ─── Group filters by type ────────────────────────────────────────────────

  const distanceFilters = filters.filter((f) => f.type === 'distance');
  const featureFilters = filters.filter((f) => f.type === 'feature');
  const nlFilters = filters.filter((f) => f.type === 'nl');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Distance filters */}
        <Section
          title="Distance"
          icon={<MapPin size={16} color={COLORS.secondary} />}
          onAdd={() => setModal('distance')}
        >
          {distanceFilters.length === 0 && <EmptyHint text="e.g. within 10 km of work" />}
          {distanceFilters.map((f) => (
            <FilterRow
              key={f.id}
              label={f.label}
              sublabel={`≤ ${f.maxKm} km`}
              enabled={f.enabled}
              onToggle={(v) => handleToggle(f.id, v)}
              onDelete={() => handleDelete(f.id)}
            />
          ))}
        </Section>

        {/* Feature filters */}
        <Section
          title="Features"
          icon={<Tag size={16} color={COLORS.secondary} />}
          onAdd={() => setModal('feature')}
        >
          {featureFilters.length === 0 && <EmptyHint text="e.g. backyard, garage, pool" />}
          {featureFilters.map((f) => (
            <FilterRow
              key={f.id}
              label={f.label}
              enabled={f.enabled}
              onToggle={(v) => handleToggle(f.id, v)}
              onDelete={() => handleDelete(f.id)}
            />
          ))}
        </Section>

        {/* NL filters */}
        <Section
          title="Natural Language"
          icon={<MessageSquare size={16} color={COLORS.secondary} />}
          onAdd={() => setModal('nl')}
        >
          {nlFilters.length === 0 && (
            <EmptyHint text='e.g. "good natural light", "quiet street"' />
          )}
          {nlFilters.map((f) => (
            <FilterRow
              key={f.id}
              label={f.text}
              sublabel="Evaluated by Claude"
              enabled={f.enabled}
              onToggle={(v) => handleToggle(f.id, v)}
              onDelete={() => handleDelete(f.id)}
            />
          ))}
        </Section>

      </ScrollView>

      {/* ─── Modals ─────────────────────────────────────────────────────────── */}

      {/* Distance modal */}
      <Modal visible={modal === 'distance'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Distance Filter</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Label (e.g. Work, School)"
              placeholderTextColor={COLORS.textSecondary}
              value={distLabel}
              onChangeText={setDistLabel}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Address or place name *"
              placeholderTextColor={COLORS.textSecondary}
              value={distAddress}
              onChangeText={setDistAddress}
              autoCapitalize="words"
            />
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Max distance (km)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalInputSmall]}
                value={distMaxKm}
                onChangeText={setDistMaxKm}
                keyboardType="numeric"
                placeholder="10"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={addDistanceFilter} disabled={distLoading}>
                {distLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.confirmBtnText}>Add</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Feature modal */}
      <Modal visible={modal === 'feature'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Feature Filter</Text>
            <Text style={styles.modalSubtitle}>Quick add</Text>
            <View style={styles.chipRow}>
              {PRESET_FEATURES.filter(
                (kw) => !featureFilters.some((f) => f.keyword === kw)
              ).map((kw) => (
                <TouchableOpacity
                  key={kw}
                  style={styles.chip}
                  onPress={() => addFeatureFilter(kw)}
                >
                  <Text style={styles.chipText}>{kw}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.modalSubtitle}>Custom</Text>
            <View style={styles.modalRow}>
              <TextInput
                style={[styles.modalInput, { flex: 1 }]}
                placeholder="e.g. sunroom, tesla charger…"
                placeholderTextColor={COLORS.textSecondary}
                value={featureKeyword}
                onChangeText={setFeatureKeyword}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={() => addFeatureFilter()}>
                <Text style={styles.confirmBtnText}>Add Custom</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* NL modal */}
      <Modal visible={modal === 'nl'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Natural Language Filter</Text>
            <Text style={styles.modalSubtitle}>
              Describe what you're looking for in plain English. Claude will evaluate each
              property against this filter using the listing description and facts.
            </Text>
            <TextInput
              style={[styles.modalInput, styles.modalInputMultiline]}
              placeholder='e.g. "good natural light", "quiet neighborhood", "large kitchen"'
              placeholderTextColor={COLORS.textSecondary}
              value={nlText}
              onChangeText={setNlText}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={addNlFilter}>
                <Text style={styles.confirmBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Section({ title, icon, onAdd, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          {icon}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
          <Plus size={18} color={COLORS.secondary} />
        </TouchableOpacity>
      </View>
      <View style={[styles.sectionBody, SHADOWS.small]}>{children}</View>
    </View>
  );
}

function FilterRow({ label, sublabel, enabled, onToggle, onDelete }) {
  return (
    <View style={styles.filterRow}>
      <View style={styles.filterInfo}>
        <Text style={styles.filterLabel} numberOfLines={2}>{label}</Text>
        {sublabel && <Text style={styles.filterSublabel}>{sublabel}</Text>}
      </View>
      <View style={styles.filterActions}>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ true: COLORS.success, false: '#ccc' }}
          thumbColor="#fff"
        />
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Trash2 size={16} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EmptyHint({ text }) {
  return (
    <Text style={styles.emptyHint}>{text}</Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },

  // Section
  section: { marginBottom: SPACING.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  sectionBody: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.secondary + '14',
  },

  // Filter row
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterInfo: { flex: 1 },
  filterLabel: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  filterSublabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  filterActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  deleteBtn: { padding: 4 },
  emptyHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    padding: SPACING.md,
    fontStyle: 'italic',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl + 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  modalInputSmall: { width: 80, textAlign: 'center', marginBottom: 0 },
  modalInputMultiline: { height: 90, textAlignVertical: 'top' },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  modalLabel: { fontSize: 14, color: COLORS.text },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontWeight: '600' },

  // Feature chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.md,
  },
  chip: {
    backgroundColor: COLORS.secondary + '14',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 13, color: COLORS.secondary, fontWeight: '500' },
});
