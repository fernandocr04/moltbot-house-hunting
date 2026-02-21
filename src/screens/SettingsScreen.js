import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Key, Eye, EyeOff } from 'lucide-react-native';

import { getSettings, updateSettings } from '../storage';
import { COLORS, SPACING, SHADOWS } from '../theme';

export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getSettings().then((s) => {
        setApiKey(s.claudeApiKey ?? '');
      });
    }, [])
  );

  async function handleSave() {
    await updateSettings({ claudeApiKey: apiKey.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleClear() {
    Alert.alert('Clear API key', 'Remove the saved Claude API key?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await updateSettings({ claudeApiKey: '' });
          setApiKey('');
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <View style={[styles.card, SHADOWS.small]}>
        <View style={styles.cardHeader}>
          <Key size={18} color={COLORS.secondary} />
          <Text style={styles.cardTitle}>Claude API Key</Text>
        </View>
        <Text style={styles.hint}>
          Required for natural language filters. Your key is stored only on this device.
          Get one at console.anthropic.com.
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="sk-ant-…"
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry={!showKey}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowKey((v) => !v)}>
            {showKey
              ? <EyeOff size={20} color={COLORS.textSecondary} />
              : <Eye size={20} color={COLORS.textSecondary} />
            }
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          {apiKey.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.saveBtn, saved && styles.saveBtnSuccess]}
            onPress={handleSave}
          >
            <Text style={styles.saveBtnText}>{saved ? 'Saved ✓' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.card, SHADOWS.small]}>
        <Text style={styles.cardTitle}>About</Text>
        <Text style={styles.hint}>
          Moltbot House Hunting — paste a Zillow URL, get a clean property view,
          and run custom filters (distance, features, natural language) against it.
          All data is stored locally on your device.
        </Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  hint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: SPACING.sm,
  },
  input: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    fontFamily: 'monospace',
  },
  eyeBtn: { padding: SPACING.sm },

  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveBtnSuccess: { backgroundColor: COLORS.success },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  clearBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.danger + '60',
  },
  clearBtnText: { color: COLORS.danger, fontWeight: '600', fontSize: 14 },
});
