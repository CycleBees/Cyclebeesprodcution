import { StyleSheet, Text, type TextProps } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Colors } from '@/constants/Colors';
import { TYPOGRAPHY } from '@/constants/Styles';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: TYPOGRAPHY.base,
    lineHeight: TYPOGRAPHY.base * TYPOGRAPHY.lineHeightNormal,
  },
  defaultSemiBold: {
    fontSize: TYPOGRAPHY.base,
    lineHeight: TYPOGRAPHY.base * TYPOGRAPHY.lineHeightNormal,
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
  },
  title: {
    fontSize: TYPOGRAPHY['4xl'],
    fontWeight: TYPOGRAPHY.fontWeightBold,
    lineHeight: TYPOGRAPHY['4xl'] * TYPOGRAPHY.lineHeightTight,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.fontWeightBold,
  },
  link: {
    lineHeight: TYPOGRAPHY.base * TYPOGRAPHY.lineHeightNormal,
    fontSize: TYPOGRAPHY.base,
    color: Colors.light.primary,
  },
});
