import {
  BrushIcon,
  CalendarIcon,
  GearIcon,
  LayerIcon,
  LayoutGridIcon,
  MapIcon,
  TicketIcon,
  UsersIcon,
  ArrowLeftRightIcon,
} from "@/icons";
import type { NavGroup } from "./types";

const icon = "size-5";

/** PMS navigation. Labels live under `sidebar.items.<key>` in src/messages. */
export const navGroups: NavGroup[] = [
  {
    type: "overview",
    labelKey: "groups.overview",
    items: [
      {
        key: "dashboard",
        icon: <LayoutGridIcon className={icon} />,
        path: "/dashboard",
      },
    ],
  },
  {
    type: "property",
    labelKey: "groups.propertyManagement",
    items: [
      { key: "properties", icon: <MapIcon className={icon} />, path: "/properties" },
      { key: "reservations", icon: <TicketIcon className={icon} />, path: "/reservations" },
      { key: "calendar", icon: <CalendarIcon className={icon} />, path: "/calendar" },
      { key: "guests", icon: <UsersIcon className={icon} />, path: "/guests" },
    ],
  },
  {
    type: "operations",
    labelKey: "groups.operations",
    items: [
      { key: "housekeeping", icon: <BrushIcon className={icon} />, path: "/housekeeping" },
      { key: "checkInOut", icon: <ArrowLeftRightIcon className={icon} />, path: "/operations" },
      { key: "tasks", icon: <LayerIcon className={icon} />, path: "/tasks" },
    ],
  },
  {
    type: "system",
    labelKey: "groups.system",
    items: [
      { key: "settings", icon: <GearIcon className={icon} />, path: "/settings" },
    ],
  },
];

