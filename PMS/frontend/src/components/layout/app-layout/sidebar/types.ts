import React from "react";

export type MenuType = string;

export interface SubItem {
  key: string;
  path: string;
  pro?: boolean;
  new?: boolean;
  target?: string;
}

export interface NavItem {
  key: string;
  icon: React.ReactNode;
  path?: string;
  new?: boolean;
  target?: string;
  subItems?: SubItem[];
}

export interface NavGroup {
  type: MenuType;
  labelKey: string;
  items: NavItem[];
}
