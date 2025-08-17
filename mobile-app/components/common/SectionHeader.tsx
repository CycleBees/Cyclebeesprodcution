import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { TYPOGRAPHY, SPACING } from '@/constants/Styles';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  style?: object;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, style }) => {
  const { colors } = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      marginBottom: SPACING.md - 4,
    },
    title: {
      fontSize: TYPOGRAPHY.lg,
      fontWeight: TYPOGRAPHY.fontWeightBold,
      color: colors.text,
      marginBottom: 3,
    },
    subtitle: {
      fontSize: TYPOGRAPHY.xs,
      color: colors.secondary,
    },
  });

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

export default SectionHeader;