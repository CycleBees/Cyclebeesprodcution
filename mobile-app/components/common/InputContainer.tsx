import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants/Styles';

interface InputContainerProps {
  label: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  required?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
}

const InputContainer: React.FC<InputContainerProps> = ({ 
  label, 
  error, 
  icon, 
  required = false, 
  children, 
  style 
}) => {
  const { colors, isDark } = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      marginBottom: SPACING.md,
    },
    labelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.sm - 2,
    },
    label: {
      fontSize: TYPOGRAPHY.sm,
      fontWeight: TYPOGRAPHY.fontWeightMedium,
      color: colors.text,
    },
    required: {
      color: colors.error,
      marginLeft: 2,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: BORDER_RADIUS.base,
      borderWidth: isDark ? 1.5 : 1,
      borderColor: colors.border,
      paddingHorizontal: SPACING.md - 2,
      paddingVertical: SPACING.md - 2,
      minHeight: 48,
    },
    inputWrapperError: {
      borderColor: colors.error,
      borderWidth: 1.5,
    },
    iconContainer: {
      marginRight: SPACING.sm,
    },
    contentContainer: {
      flex: 1,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    errorText: {
      fontSize: TYPOGRAPHY.xs,
      color: colors.error,
      marginLeft: 4,
    },
  });

  return (
    <View style={[styles.container, style]}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      </View>
      
      <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
        {icon && (
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={18} color={error ? colors.error : colors.gray} />
          </View>
        )}
        <View style={styles.contentContainer}>
          {children}
        </View>
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

export default InputContainer;