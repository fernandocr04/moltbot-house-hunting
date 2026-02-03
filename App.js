import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, Text, Modal, ScrollView } from 'react-native';
import { COLORS, SPACING } from './src/theme';
import PropertyCard from './src/components/PropertyCard';
import MoltbotAgent from './src/components/MoltbotAgent';
import { useWhatsAppLinkCapture } from './src/hooks/useLinkCapture';

// Mock data for initial review
const MOCK_PROPERTY = {
  address: "123 Dream Lane, Sunshine City, CA 90210",
  price: "$1,250,000",
  bedrooms: 4,
  bathrooms: 3.5,
  sqft: "2,850",
  imageUrl: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
  zillowUrl: "https://www.zillow.com"
};

export default function App() {
  const [properties, setProperties] = useState([MOCK_PROPERTY]);
  const [reviewingProperty, setReviewingProperty] = useState(null);
  const [insights, setInsights] = useState([]);

  // Setup link capture
  useWhatsAppLinkCapture((url) => {
    // In a real app, we'd fetch Zillow details here
    const newProp = { ...MOCK_PROPERTY, address: "New Property from WhatsApp", zillowUrl: url };
    setProperties([newProp, ...properties]);
  });

  const handleReview = (prop, rating) => {
    if (rating === 'interested' || rating === 'maybe') {
      setReviewingProperty(prop);
    }
  };

  const handleInsight = (insight) => {
    if (!insights.includes(insight)) {
      setInsights([...insights, insight]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Moltbot Hunting</Text>
        <Text style={styles.subtitle}>Analyzing {properties.length} potential homes</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {insights.length > 0 && (
          <View style={styles.insightPanel}>
            <Text style={styles.sectionTitle}>Learned Insights</Text>
            <View style={styles.tagContainer}>
              {insights.map((insight, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>✨ {insight}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Review Cards</Text>
        {properties.map((prop, index) => (
          <PropertyCard
            key={index}
            property={prop}
            onReview={(rating) => handleReview(prop, rating)}
          />
        ))}
      </ScrollView>

      <Modal
        visible={!!reviewingProperty}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReviewingProperty(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseArea}
            onPress={() => setReviewingProperty(null)}
          />
          <View style={styles.modalContent}>
            <MoltbotAgent
              currentProperty={reviewingProperty}
              onInsightGathered={handleInsight}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

import { TouchableOpacity } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.lg,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginVertical: SPACING.sm,
  },
  insightPanel: {
    backgroundColor: 'white',
    padding: SPACING.md,
    borderRadius: 16,
    marginBottom: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCloseArea: {
    flex: 1,
  },
  modalContent: {
    height: '70%',
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
});
