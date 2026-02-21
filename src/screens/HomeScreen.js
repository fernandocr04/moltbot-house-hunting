import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Search, SlidersHorizontal, Settings, Heart, HelpCircle, XCircle } from 'lucide-react-native';

import { fetchZillowProperty } from '../services/zillow';
import { getProperties, saveProperty } from '../storage';
import { COLORS, SPACING, SHADOWS } from '../theme';

const RATING_CONFIG = {
  like: { icon: Heart, color: COLORS.success, label: 'Liked' },
  maybe: { icon: HelpCircle, color: COLORS.warning, label: 'Maybe' },
  skip: { icon: XCircle, color: COLORS.danger, label: 'Skipped' },
};

export default function HomeScreen({ navigation }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);

  useFocusEffect(
    useCallback(() => {
      getProperties().then(setProperties);
    }, [])
  );

  async function handleFetch() {
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const property = await fetchZillowProperty(trimmed);
      const saved = await saveProperty(property);
      setUrl('');
      setProperties((prev) => {
        const without = prev.filter((p) => p.id !== saved.id);
        return [saved, ...without];
      });
      navigation.navigate('PropertyDetail', { propertyId: saved.id });
    } catch (err) {
      Alert.alert('Could not load property', err.message);
    } finally {
      setLoading(false);
    }
  }

  function renderProperty({ item }) {
    const ratingCfg = item.rating ? RATING_CONFIG[item.rating] : null;
    const RatingIcon = ratingCfg?.icon;

    return (
      <TouchableOpacity
        style={[styles.card, SHADOWS.small]}
        onPress={() => navigation.navigate('PropertyDetail', { propertyId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardMain}>
            <Text style={styles.cardPrice}>{item.priceFormatted}</Text>
            <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
            <Text style={styles.cardStats}>
              {[
                item.bedrooms != null && `${item.bedrooms} bd`,
                item.bathrooms != null && `${item.bathrooms} ba`,
                item.sqft != null && `${item.sqft.toLocaleString()} sqft`,
              ]
                .filter(Boolean)
                .join('  ·  ')}
            </Text>
          </View>
          {ratingCfg && (
            <View style={[styles.ratingBadge, { backgroundColor: ratingCfg.color + '18' }]}>
              <RatingIcon size={16} color={ratingCfg.color} />
              <Text style={[styles.ratingLabel, { color: ratingCfg.color }]}>
                {ratingCfg.label}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>House Hunt</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Filters')}
          >
            <SlidersHorizontal size={22} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Settings size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* URL input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Paste a Zillow listing URL…"
          placeholderTextColor={COLORS.textSecondary}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={handleFetch}
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.fetchButton, loading && styles.fetchButtonDisabled]}
          onPress={handleFetch}
          disabled={loading || !url.trim()}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Search size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Property list */}
      <FlatList
        data={properties}
        keyExtractor={(item) => item.id}
        renderItem={renderProperty}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Paste a Zillow URL above to get started.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg + 8,
    paddingBottom: SPACING.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
  },
  inputRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    ...SHADOWS.small,
  },
  fetchButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  fetchButtonDisabled: {
    opacity: 0.6,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: SPACING.md,
    alignItems: 'center',
  },
  cardMain: {
    flex: 1,
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  cardAddress: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  cardStats: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: SPACING.sm,
  },
  ratingLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
});
