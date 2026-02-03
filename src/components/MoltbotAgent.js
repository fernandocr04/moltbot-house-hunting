import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Send, Bot, User } from 'lucide-react-native';
import { COLORS, SPACING, SHADOWS } from '../theme';

const MoltbotAgent = ({ currentProperty, onInsightGathered }) => {
    const [messages, setMessages] = useState([
        { id: 1, type: 'bot', text: 'Hey there! I see you found a property. What caught your eye first about this home?' }
    ]);
    const [input, setInput] = useState('');

    const handleSend = () => {
        if (!input.trim()) return;

        const newUserMessage = { id: Date.now(), type: 'user', text: input };
        setMessages([...messages, newUserMessage]);

        // Simulate AI thinking and asking a follow-up
        setTimeout(() => {
            const insight = gatherInsightFromText(input);
            if (insight) onInsightGathered(insight);

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                type: 'bot',
                text: getFollowUpQuestion(input)
            }]);
        }, 1000);

        setInput('');
    };

    // Simple heuristic for "insights" in this phase
    const gatherInsightFromText = (text) => {
        if (text.toLowerCase().includes('yard') || text.toLowerCase().includes('garden')) return 'Prefers large outdoor space';
        if (text.toLowerCase().includes('kitchen') || text.toLowerCase().includes('island')) return 'Gourmet kitchen priority';
        if (text.toLowerCase().includes('light') || text.toLowerCase().includes('windows')) return 'Bright interiors preferred';
        return null;
    };

    const getFollowUpQuestion = (lastText) => {
        if (lastText.toLowerCase().includes('kitchen')) return 'Interesting! How important is an open-concept layout to you for the kitchen area?';
        return "Got it. How do you feel about the location of this property relative to your commute?";
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Bot size={24} color={COLORS.secondary} />
                <Text style={styles.headerText}>Moltbot Assistant</Text>
            </View>

            <ScrollView style={styles.chatArea}>
                {messages.map(msg => (
                    <View key={msg.id} style={[
                        styles.messageBubble,
                        msg.type === 'bot' ? styles.botBubble : styles.userBubble
                    ]}>
                        <Text style={[
                            styles.messageText,
                            msg.type === 'bot' ? styles.botText : styles.userText
                        ]}>{msg.text}</Text>
                    </View>
                ))}
            </ScrollView>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={styles.inputArea}>
                    <TextInput
                        style={styles.input}
                        placeholder="Talk to Moltbot..."
                        value={input}
                        onChangeText={setInput}
                    />
                    <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                        <Send size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        ...SHADOWS.medium,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        gap: SPACING.sm,
    },
    headerText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    chatArea: {
        flex: 1,
        padding: SPACING.md,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: SPACING.md,
        borderRadius: 16,
        marginBottom: SPACING.sm,
    },
    botBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#E9ECEF',
        borderBottomLeftRadius: 4,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: COLORS.secondary,
        borderBottomRightRadius: 4,
    },
    messageText: {
        fontSize: 15,
    },
    botText: {
        color: COLORS.text,
    },
    userText: {
        color: 'white',
    },
    inputArea: {
        flexDirection: 'row',
        padding: SPACING.md,
        backgroundColor: 'white',
        gap: SPACING.sm,
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: '#F1F3F5',
        borderRadius: 24,
        paddingHorizontal: SPACING.md,
        paddingVertical: 10,
        fontSize: 15,
    },
    sendButton: {
        backgroundColor: COLORS.secondary,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default MoltbotAgent;
