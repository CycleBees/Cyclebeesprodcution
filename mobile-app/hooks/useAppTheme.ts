import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/Colors';

export const useAppTheme = () => {
  const { isDark } = useTheme();
 
  return {
    colors: isDark ? Colors.dark : Colors.light,
    isDark,
  };
}; 