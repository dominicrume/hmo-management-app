'use client';

import { useEffect } from 'react';

export function seedDemoData() {
  if (typeof window === 'undefined') return;
  const existing = localStorage.getItem('mp_tenants');
  if (!existing || JSON.parse(existing).length === 0) {
    const demoTenants = [
      { id: 't-001', full_name: 'Mr David Okafor', room_number: '4', benefit_type: 'Universal Credit', benefit_amount: 680, status: 'active' },
      { id: 't-002', full_name: 'Mrs Fatima Al-Hassan', room_number: '7', benefit_type: 'Housing Benefit', benefit_amount: 520, status: 'active' },
      { id: 't-003', full_name: 'Mr James Thornton', room_number: '12', benefit_type: 'ESA', benefit_amount: 340, status: 'active' },
    ];
    localStorage.setItem('mp_tenants', JSON.stringify(demoTenants));
  }
}

export default function DemoSeeder() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_LOCAL_DATA === 'true') {
      seedDemoData();
    }
  }, []);
  return null;
}
