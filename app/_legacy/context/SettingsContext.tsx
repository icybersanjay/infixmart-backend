"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getData } from '../utils/api';

const parseJson = <T,>(str: string | null | undefined, fallback: T): T => {
  try { return JSON.parse(str || '') as T; } catch { return fallback; }
};

interface MembershipBenefit {
  icon: string;
  title: string;
  subtitle: string;
}

interface CartMilestone {
  amount: number;
  label: string;
  type: string;
  enabled: boolean;
}

export interface StoreSettings {
  minOrderValue: number;
  codEnabled: boolean;
  gstPercent: number;
  membershipPrice: number;
  membershipEnabled: boolean;
  membershipBenefits: MembershipBenefit[];
  cartTimelineEnabled: boolean;
  cartTimelineMax: number;
  cartMilestones: CartMilestone[];
}

const DEFAULT_MEMBERSHIP_BENEFITS: MembershipBenefit[] = [
  { icon: 'cart',    title: 'Shop from just ₹499',          subtitle: 'Half the usual ₹999 minimum — always'  },
  { icon: 'truck',   title: 'Free Delivery on Every Order',  subtitle: 'Zero shipping charges, forever'         },
  { icon: 'zap',     title: 'Priority Fast Delivery',        subtitle: 'Your orders are dispatched first'       },
  { icon: 'headset', title: 'Dedicated Customer Support',    subtitle: 'Skip the queue — member-only care'      },
];

const DEFAULTS: StoreSettings = {
  minOrderValue: 999,
  codEnabled: true,
  gstPercent: 18,
  membershipPrice: 49,
  membershipEnabled: true,
  membershipBenefits: DEFAULT_MEMBERSHIP_BENEFITS,
  cartTimelineEnabled: true,
  cartTimelineMax: 1999,
  cartMilestones: [{ amount: 1499, label: 'Free Shipping', type: 'free_shipping', enabled: true }],
};

const SettingsContext = createContext<StoreSettings>(DEFAULTS);

interface SettingsResponse {
  error?: boolean;
  settings?: Record<string, string | null | undefined>;
}

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULTS);

  useEffect(() => {
    getData<SettingsResponse>('/api/settings').then((res) => {
      const r = res as SettingsResponse;
      if (r && !r.error && r.settings) {
        const s = r.settings;
        setSettings({
          minOrderValue:      Number(s.min_order_value)   || 999,
          codEnabled:         s.cod_enabled !== 'false',
          gstPercent:         Number(s.gst_percent)       || 18,
          membershipPrice:    Number(s.membership_price)  || 49,
          membershipEnabled:  s.membership_enabled !== 'false',
          membershipBenefits: parseJson(s.membership_benefits, DEFAULT_MEMBERSHIP_BENEFITS),
          cartTimelineEnabled: s.cart_timeline_enabled !== 'false',
          cartTimelineMax:    Number(s.cart_timeline_max) || 1999,
          cartMilestones:     parseJson(s.cart_milestones, DEFAULTS.cartMilestones),
        });
      }
    });
  }, []);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): StoreSettings => useContext(SettingsContext);
export default SettingsContext;
