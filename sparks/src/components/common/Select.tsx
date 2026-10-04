import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Dropdown, type DropdownOption } from "./Dropdown";

interface SelectProps {
  options: DropdownOption[];
  value?: string;
  onSelect: (option: DropdownOption) => void;
  placeholder?: string;
  label?: string;
}

export function Select(props: SelectProps) {
  return <Dropdown {...props} />;
}
