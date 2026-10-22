import { Text } from "react-native";

import { FontFamily } from "../constants/fonts";
import { useThemeColor } from "../hooks/use-theme-color";

export const ThemedText = ({
  className,
  style,
  lightColor,
  darkColor,
  type = "default",
  ...rest
}) => {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");
  const typeClasses = {
    default: "text-base leading-6",
    defaultSemiBold: "text-base leading-6 font-semibold",
    title: "text-3xl font-bold leading-8",
    subtitle: "text-xl font-bold",
    link: "text-base leading-7 text-sky-600",
  };
  const classes = [typeClasses[type] ?? typeClasses.default, className]
    .filter(Boolean)
    .join(" ");

  const fontFamilyByType = {
    default: FontFamily.regular,
    defaultSemiBold: FontFamily.medium,
    title: FontFamily.bold,
    subtitle: FontFamily.bold,
    link: FontFamily.medium,
  };

  return (
    <Text
      className={classes}
      style={[
        { color, fontFamily: fontFamilyByType[type] ?? FontFamily.regular },
        style,
      ]}
      {...rest}
    />
  );
};
