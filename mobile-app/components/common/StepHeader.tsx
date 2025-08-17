import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { TYPOGRAPHY, SPACING } from '@/constants/Styles';

interface StepHeaderProps {
  title: string;
  subtitle: string;
  style?: object;
}

const StepHeader: React.FC<StepHeaderProps> = ({ title, subtitle, style }) => {
  const { colors } = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      marginBottom: SPACING.sm,
    },
    title: {
      fontSize: TYPOGRAPHY.lg,
      fontWeight: TYPOGRAPHY.fontWeightBold,
      color: colors.text,
      marginBottom: 3,
    },
    subtitle: {
      fontSize: TYPOGRAPHY.xs,
      color: colors.gray,
      marginBottom: SPACING.sm,
    },
  });

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

export default StepHeader;