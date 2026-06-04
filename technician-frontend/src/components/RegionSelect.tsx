import React, { useMemo } from 'react';
import { PROVINCE_CITY, PROVINCES } from '../data/regions';

interface RegionSelectProps {
  province: string;
  city: string;
  onChange: (v: { province: string; city: string }) => void;
}

const RegionSelect: React.FC<RegionSelectProps> = ({ province, city, onChange }) => {
  const cities = useMemo(() => PROVINCE_CITY[province] || [], [province]);
  return (
    <div className="flex gap-2">
      <select
        value={province}
        onChange={(e) => {
          const p = e.target.value;
          const list = PROVINCE_CITY[p] || [];
          onChange({ province: p, city: list.includes(city) ? city : (list[0] || '') });
        }}
        className="h-12 flex-1 rounded-xl bg-gray-100 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5A66]"
      >
        <option value="">选择省份</option>
        {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <select
        value={city}
        disabled={!province}
        onChange={(e) => onChange({ province, city: e.target.value })}
        className="h-12 flex-1 rounded-xl bg-gray-100 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5A66] disabled:opacity-60"
      >
        <option value="">选择城市</option>
        {cities.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  );
};

export default RegionSelect;
