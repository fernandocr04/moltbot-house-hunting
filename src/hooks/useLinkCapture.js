import { useEffect } from 'react';
import * as Linking from 'expo-linking';

/**
 * Hook to handle Zillow links shared via WhatsApp or other apps.
 * In a real Android app, this would also rely on Intent Filters in AndroidManifest.xml
 */
export const useWhatsAppLinkCapture = (onLinkCaptured) => {
    useEffect(() => {
        // Handle link when app is already open
        const subscription = Linking.addEventListener('url', (event) => {
            handleUrl(event.url);
        });

        // Handle link when app is opened from a cold start
        Linking.getInitialURL().then((url) => {
            if (url) handleUrl(url);
        });

        const handleUrl = (url) => {
            // Logic to detect if it's a Zillow link
            if (url.includes('zillow.com')) {
                onLinkCaptured(url);
            }
        };

        return () => {
            subscription.remove();
        };
    }, [onLinkCaptured]);
};
