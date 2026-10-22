import { Colors } from "../constants/theme";
import { useColorScheme } from "../hooks/use-color-scheme";

const useThemeColor = (props, colorName) => {
  const theme = useColorScheme() ?? "light";
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }

  return Colors[theme][colorName];
};

export { useThemeColor };
