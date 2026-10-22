import { StyleSheet, Text, View } from "react-native";

import { FontFamily } from "../../constants/fonts";

// Renders the Arabic portions of a printed receipt as real React Native
// text (correct shaping/bidi for free) instead of raw bytes sent to a
// printer's own, often mismatched, Arabic code table. This tree is only
// ever mounted off-screen by ReceiptCaptureHost so it can be captured as a
// bitmap - it is not meant to be shown to the user directly, which is why
// colors are hardcoded to print on white rather than following app theming.
//
// Every label:value row is laid out as an explicit RTL row (rather than a
// single Text relying on the Unicode bidi algorithm to order "label" before
// "value") so it reliably starts from the right on Android - RN's `row`
// flexDirection is auto-mirrored under the app's forced RTL layout the same
// way the rest of the app's flex-row screens already are, whereas `Text`'s
// `writingDirection` style (used in an earlier version of this file) is
// iOS-only and is a no-op on Android. LTR runs (hex codes, phone numbers)
// use the `direction` style instead, matching the pattern already used for
// LTR-styled values elsewhere in the app (see app/order/[id].jsx).

const Title = ({ text }) => <Text style={styles.title}>{text}</Text>;

const Field = ({ label, value, ltr }) => (
  <View style={styles.fieldRow}>
    <Text style={styles.fieldLabel}>{`${label}: `}</Text>
    <Text style={[styles.fieldValue, ltr && styles.ltrValue]}>{value}</Text>
  </View>
);

// A bordered, rounded-corner box for the card's code/PIN - mirrors how
// leading gift-card brands present redemption codes on a printed card
// instead of a plain "label: value" line.
const CodeBox = ({ label, value }) => (
  <View style={styles.codeBoxWrap}>
    <Text style={styles.codeBoxLabel}>{label}</Text>
    <View style={styles.codeBox}>
      <Text style={styles.codeBoxValue}>{value}</Text>
    </View>
  </View>
);

const Paragraph = ({ label, text }) => (
  <View style={styles.paragraphBlock}>
    {label ? <Text style={styles.label}>{`${label}:`}</Text> : null}
    <Text style={styles.paragraph}>{text}</Text>
  </View>
);

const Separator = () => <View style={styles.separator} />;

const ReceiptTextContent = ({ blocks = [] }) => (
  <View style={styles.container}>
    {blocks.map((block, index) => {
      switch (block.type) {
        case "title":
          return <Title key={index} text={block.text} />;
        case "field":
          return (
            <Field
              key={index}
              label={block.label}
              value={block.value}
              ltr={block.ltr}
            />
          );
        case "codeBox":
          return (
            <CodeBox key={index} label={block.label} value={block.value} />
          );
        case "text":
          return (
            <Paragraph key={index} label={block.label} text={block.text} />
          );
        case "separator":
          return <Separator key={index} />;
        default:
          return null;
      }
    })}
  </View>
);

export default ReceiptTextContent;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    direction: "rtl",
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  title: {
    textAlign: "center",
    fontFamily: FontFamily.bold,
    fontSize: 30,
    color: "#000000",
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    marginBottom: 8,
  },
  fieldLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 26,
    color: "#000000",
  },
  fieldValue: {
    fontFamily: FontFamily.medium,
    fontSize: 26,
    color: "#000000",
  },
  ltrValue: {
    direction: "ltr",
  },
  codeBoxWrap: {
    marginBottom: 12,
  },
  codeBoxLabel: {
    textAlign: "right",
    fontFamily: FontFamily.medium,
    fontSize: 22,
    color: "#000000",
    marginBottom: 6,
  },
  codeBox: {
    borderWidth: 2,
    borderColor: "#000000",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  codeBoxValue: {
    direction: "ltr",
    textAlign: "center",
    fontFamily: FontFamily.bold,
    fontSize: 30,
    color: "#000000",
    letterSpacing: 3,
  },
  paragraphBlock: {
    alignItems: "flex-start",
    marginBottom: 10,
  },
  label: {
    textAlign: "right",
    fontFamily: FontFamily.medium,
    fontSize: 24,
    color: "#000000",
    marginBottom: 2,
  },
  paragraph: {
    textAlign: "right",
    fontFamily: FontFamily.regular,
    fontSize: 24,
    color: "#000000",
    lineHeight: 32,
  },
  separator: {
    borderBottomWidth: 2,
    borderBottomColor: "#000000",
    marginVertical: 12,
  },
});
