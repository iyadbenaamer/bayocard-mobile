import { View } from "react-native";

import { useThemeColor } from "../hooks/use-theme-color";

export const ThemedView = ({
  className,
  style,
  lightColor,
  darkColor,
  ...otherProps
}) => {
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    "background",
  );

  return (
    <View
      className={className}
      style={[{ backgroundColor }, style]}
      {...otherProps}
    />
  );
};
