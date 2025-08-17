import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants/Styles';

interface SummaryCardProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  children: React.ReactNode;
  style?: object;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ 
  title, 
  icon, 
  iconColor, 
  children, 
  style 
}) => {
  const { colors } = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.cardBackground,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: SPACING.lg,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: iconColor || colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACING.sm + 4,
    },
    title: {
      fontSize: TYPOGRAPHY.base,
      fontWeight: TYPOGRAPHY.fontWeightSemibold,
      color: colors.text,
    },
    content: {
      padding: SPACING.md,
      paddingTop: SPACING.sm,
    },
  });

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={18} color={colors.background} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

export default SummaryCard;