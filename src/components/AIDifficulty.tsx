import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AILevel } from '../ai';
import { useTheme } from '../themes';

type Props = {
    selectedLevel: AILevel;
    onSelect: (level: AILevel) => void;
};

const LEVELS: AILevel[] = ['beginner', 'intermediate', 'advanced', 'grandmaster', 'unbeatable'];

export default function AIDifficulty({ selectedLevel, onSelect }: Props) {
    const { theme } = useTheme();

    return (
        <View style={styles.list}>
            {LEVELS.map(level => (
                <TouchableOpacity
                    key={level}
                    style={[
                        styles.option,
                        {
                            backgroundColor:
                                selectedLevel === level ? theme.colors.accent : theme.colors.surface,
                            borderColor: theme.colors.accent,
                        },
                    ]}
                    onPress={() => onSelect(level)}
                >
                    <Text
                        style={[
                            styles.label,
                            { color: selectedLevel === level ? '#fff' : theme.colors.text },
                        ]}
                    >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    list: {
        gap: 10,
    },
    option: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 2,
    },
    label: {
        fontWeight: '600',
        fontSize: 16,
    },
});
