import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { TYPOGRAPHY, SPACING } from '@/constants/Styles';

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  style?: object;
}

const FormSection: React.FC<FormSectionProps> = ({ title, children, style }) => {
  const { colors } = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      marginBottom: SPACING.lg,
    },
    title: {
      fontSize: TYPOGRAPHY.base,
      fontWeight: TYPOGRAPHY.fontWeightSemibold,
      color: colors.text,
      marginBottom: SPACING.md - 4,
    },
  });

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
};

export default FormSection;