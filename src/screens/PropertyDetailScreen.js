import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
} from 'react-native';
import {
  Heart,
  HelpCircle,
  XCircle,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';

import { getProperties, updatePropertyRating, getFilters, getSettings } from '../storage';
import { evaluateFilters } from '../services/filters';
import { COLORS, SPACING, SHADOWS } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PropertyDetailScreen({ route, navigation }) {
  const { propertyId } = route.params;
  const [property, setProperty] = useState(null);
  const [filterResults, setFilterResults] = useState([]);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const photoListRef = useRef(null);

  useEffect(() => {
    loadProperty();
  }, [propertyId]);

  async function loadProperty() {
    const props = await getProperties();
    const found = props.find((p) => p.id === propertyId);
    if (found) {
      setProperty(found);
      runFilters(found);
    }
  }

  async function runFilters(prop) {
    const [filters, settings] = await Promise.all([getFilters(), getSettings()]);
    const enabled = filters.filter((f) => f.enabled);
    if (!enabled.length) return;

    setFiltersLoading(true);
    try {
      const results = await evaluateFilters(prop, enabled, settings.claudeApiKey);
      setFilterResults(results);
    } catch (err) {
      console.warn('Filter evaluation error:', err);
    } finally {
      setFiltersLoading(false);
    }
  }

  async function handleRate(rating) {
    if (!property) return;
    await updatePropertyRating(property.id, rating);
    setProperty((p) => ({ ...p, rating }));
  }

  function scrollToPhoto(index) {
    const clamped = Math.max(0, Math.min(index, (property?.photos?.length ?? 1) - 1));
    setPhotoIndex(clamped);
    photoListRef.current?.scrollToIndex({ index: clamped, animated: true });
  }

  if (!property) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const photos = property.photos ?? [];

  return (
    <View style={styles.container}>
      {/* Photo carousel */}
      {photos.length > 0 && (
        <View style={styles.photoContainer}>
          <FlatList
            ref={photoListRef}
            data={photos}
            keyExtractor={(_, i) => String(i)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setPhotoIndex(idx);
            }}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={styles.photo}
                resizeMode="cover"
              />
            )}
          />
          {/* Prev/Next arrows */}
          {photos.length > 1 && (
            <>
              <TouchableOpacity
                style={[styles.photoArrow, styles.photoArrowLeft]}
                onPress={() => scrollToPhoto(photoIndex - 1)}
              >
                <ChevronLeft size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.photoArrow, styles.photoArrowRight]}
                onPress={() => scrollToPhoto(photoIndex + 1)}
              >
                <ChevronRight size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.photoDots}>
                <Text style={styles.photoCount}>
                  {photoIndex + 1} / {photos.length}
                </Text>
              </View>
            </>
          )}
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Price + address */}
        <View style={styles.section}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{property.priceFormatted}</Text>
            <TouchableOpacity onPress={() => Linking.openURL(property.url)}>
              <ExternalLink size={20} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.address}>{property.address}</Text>
          {property.homeType ? (
            <Text style={styles.homeType}>{property.homeType}</Text>
          ) : null}
        </View>

        {/* Key stats */}
        <View style={[styles.statsRow, SHADOWS.small]}>
          <Stat label="Beds" value={property.bedrooms} />
          <View style={styles.statDivider} />
          <Stat label="Baths" value={property.bathrooms} />
          <View style={styles.statDivider} />
          <Stat label="Sqft" value={property.sqft?.toLocaleString()} />
          <View style={styles.statDivider} />
          <Stat label="Built" value={property.yearBuilt} />
        </View>

        {/* Filters */}
        {(filtersLoading || filterResults.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Filters</Text>
            {filtersLoading ? (
              <View style={styles.filterLoading}>
                <ActivityIndicator size="small" color={COLORS.secondary} />
                <Text style={styles.filterLoadingText}>Evaluating filters…</Text>
              </View>
            ) : (
              filterResults.map((result) => (
                <FilterRow key={result.filterId} result={result} />
              ))
            )}
          </View>
        )}

        {/* Financial */}
        {(property.monthlyHoa || property.annualTaxes) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Financials</Text>
            {property.monthlyHoa && (
              <Row label="HOA / month" value={`$${Number(property.monthlyHoa).toLocaleString()}`} />
            )}
            {property.annualTaxes && (
              <Row label="Annual taxes" value={`$${Number(property.annualTaxes).toLocaleString()}`} />
            )}
            {property.lotSize && (
              <Row
                label="Lot size"
                value={`${Number(property.lotSize).toLocaleString()} ${property.lotSizeUnit ?? 'sqft'}`}
              />
            )}
          </View>
        )}

        {/* Description */}
        {property.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{property.description}</Text>
          </View>
        ) : null}

        {/* Facts & Features */}
        {property.facts?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Facts & Features</Text>
            {property.facts.map((fact, i) => (
              <Row key={i} label={fact.label} value={fact.value} />
            ))}
          </View>
        )}

        {/* Schools */}
        {property.schools?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Schools</Text>
            {property.schools.map((s, i) => (
              <View key={i} style={styles.schoolRow}>
                <View style={styles.schoolInfo}>
                  <Text style={styles.schoolName}>{s.name}</Text>
                  <Text style={styles.schoolLevel}>{s.level}</Text>
                </View>
                {s.rating != null && (
                  <View style={styles.schoolRating}>
                    <Text style={styles.schoolRatingText}>{s.rating}/10</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Rating actions */}
        <View style={[styles.ratingSection, SHADOWS.small]}>
          <Text style={styles.ratingTitle}>Your take</Text>
          <View style={styles.ratingActions}>
            <RatingButton
              label="Skip"
              icon={XCircle}
              color={COLORS.danger}
              active={property.rating === 'skip'}
              onPress={() => handleRate('skip')}
            />
            <RatingButton
              label="Maybe"
              icon={HelpCircle}
              color={COLORS.warning}
              active={property.rating === 'maybe'}
              onPress={() => handleRate('maybe')}
            />
            <RatingButton
              label="Like"
              icon={Heart}
              color={COLORS.success}
              active={property.rating === 'like'}
              onPress={() => handleRate('like')}
            />
          </View>
        </View>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value ?? '—'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function FilterRow({ result }) {
  const passes = result.passes;
  const hasError = Boolean(result.error);

  let Icon = passes === null || hasError ? Clock : passes ? CheckCircle : AlertCircle;
  let color = passes === null || hasError ? COLORS.textSecondary : passes ? COLORS.success : COLORS.danger;
  if (hasError) color = COLORS.warning;

  return (
    <View style={styles.filterRow}>
      <Icon size={16} color={color} />
      <View style={styles.filterInfo}>
        <Text style={styles.filterLabel}>{result.label}</Text>
        {(result.reason || result.error) && (
          <Text style={[styles.filterReason, { color }]}>
            {result.error ?? result.reason}
          </Text>
        )}
      </View>
    </View>
  );
}

function RatingButton({ label, icon: Icon, color, active, onPress }) {
  return (
    <TouchableOpacity
      style={[
        styles.ratingButton,
        { borderColor: color + '40' },
        active && { backgroundColor: color + '18', borderColor: color },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Icon size={22} color={color} />
      <Text style={[styles.ratingButtonLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Photos
  photoContainer: { position: 'relative', height: 260 },
  photo: { width: SCREEN_WIDTH, height: 260 },
  photoArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 20,
    padding: 6,
  },
  photoArrowLeft: { left: 12 },
  photoArrowRight: { right: 12 },
  photoDots: {
    position: 'absolute',
    bottom: 10,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  photoCount: { color: '#fff', fontSize: 12 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingTop: SPACING.md },

  // Section
  section: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },

  // Price
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  price: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  address: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 2 },
  homeType: { fontSize: 13, color: COLORS.textSecondary },

  // Stats bar
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    paddingVertical: SPACING.md,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#E8E8E8' },

  // Filters
  filterLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  filterLoadingText: { color: COLORS.textSecondary, fontSize: 14 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterInfo: { flex: 1 },
  filterLabel: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  filterReason: { fontSize: 12, marginTop: 2 },

  // Rows
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  rowLabel: { fontSize: 14, color: COLORS.textSecondary, flex: 1 },
  rowValue: { fontSize: 14, color: COLORS.text, fontWeight: '500', flex: 1, textAlign: 'right' },

  // Description
  description: { fontSize: 14, color: COLORS.text, lineHeight: 22 },

  // Schools
  schoolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  schoolInfo: { flex: 1 },
  schoolName: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  schoolLevel: { fontSize: 12, color: COLORS.textSecondary },
  schoolRating: {
    backgroundColor: COLORS.secondary + '18',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  schoolRatingText: { fontSize: 13, fontWeight: '700', color: COLORS.secondary },

  // Rating
  ratingSection: {
    margin: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: SPACING.md,
  },
  ratingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  ratingActions: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm },
  ratingButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  ratingButtonLabel: { fontSize: 14, fontWeight: '600' },
});
