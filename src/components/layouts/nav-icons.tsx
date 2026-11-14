import {
  Award, Bell, BookOpen, ChartColumn, Compass, Folder, Globe, Heart, HelpCircle, Home, Inbox,
  LifeBuoy, List, Lock, Receipt, Settings, Shield, ShoppingCart, Tag, Users, Wallet,
  type LucideIcon,
} from "lucide-react";
import type { NavIcon } from "@/config/navigation";

export const navIcons: Record<NavIcon, LucideIcon> = {
  home: Home, book: BookOpen, compass: Compass, heart: Heart, award: Award, receipt: Receipt,
  help: HelpCircle, settings: Settings, globe: Globe, folder: Folder, users: Users, shield: Shield,
  cart: ShoppingCart, wallet: Wallet, tag: Tag, "life-buoy": LifeBuoy, chart: ChartColumn, lock: Lock,
  inbox: Inbox, list: List, bell: Bell,
};
