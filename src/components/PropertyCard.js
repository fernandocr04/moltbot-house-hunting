import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { ExternalLink, Heart, XCircle, HelpCircle } from 'lucide-react-native';
import { COLORS, SPACING, SHADOWS } from '../theme';

const PropertyCard = ({ property, onReview }) => {
    const { address, price, bedrooms, bathrooms, sqft, imageUrl, zillowUrl } = property;

    return (
        <View style={[styles.card, SHADOWS.medium]}>
            <Image source={{ uri: imageUrl }} style={styles.image} />
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.price}>{price}</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(zillowUrl)}>
                        <ExternalLink size={20} color={COLORS.secondary} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.address} numberOfLines={2}>{address}</Text>
                <View style={styles.stats}>
                    <Text style={styles.statLine}>{bedrooms} bds | {bathrooms} ba | {sqft} sqft</Text>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: COLORS.danger + '20' }]}
                        onPress={() => onReview('not_interested')}
                    >
                        <XCircle size={24} color={COLORS.danger} />
                        <Text style={[styles.actionText, { color: COLORS.danger }]}>Skip</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: COLORS.warning + '20' }]}
                        onPress={() => onReview('maybe')}
                    >
                        <HelpCircle size={24} color={COLORS.warning} />
                        <Text style={[styles.actionText, { color: COLORS.warning }]}>Maybe</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: COLORS.success + '20' }]}
                        onPress={() => onReview('interested')}
                    >
                        <Heart size={24} color={COLORS.success} />
                        <Text style={[styles.actionText, { color: COLORS.success }]}>Like</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        marginVertical: SPACING.md,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: 200,
        backgroundColor: '#E1E4E8',
    },
    content: {
        padding: SPACING.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    price: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    address: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
    },
    stats: {
        marginBottom: SPACING.md,
    },
    statLine: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: SPACING.md,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        gap: 4,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
    },
});

export default PropertyCard;
