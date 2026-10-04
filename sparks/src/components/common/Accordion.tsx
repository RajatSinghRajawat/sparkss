import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, UIManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme , fonts } from "../../theme";

if (UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
}

interface AccordionProps {
  items: AccordionItemProps[];
  allowMultiple?: boolean;
}

function AccordionItem({
  title,
  children,
  expanded,
  onToggle,
}: AccordionItemProps & {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View
      style={[
        styles.item,
        { borderBottomColor: theme.colors.border },
      ]}
    >
      <TouchableOpacity
        onPress={onToggle}
        style={styles.header}
        activeOpacity={0.7}
      >
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {title}
        </Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
}

export function Accordion({
  items,
  allowMultiple = false,
}: AccordionProps) {
  const [expandedIndices, setExpandedIndices] = useState<number[]>([]);

  const toggle = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndices((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      }
      return allowMultiple ? [...prev, index] : [index];
    });
  };

  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <AccordionItem
          key={index}
          title={item.title}
          expanded={expandedIndices.includes(index)}
          onToggle={() => toggle(index)}
        >
          {item.children}
        </AccordionItem>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  item: {
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 0,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    flex: 1,
  },
  content: {
    paddingBottom: 16,
  },
});
