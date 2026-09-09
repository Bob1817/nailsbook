import React from 'react';
import { PROVINCE_CITY, PROVINCES } from '../data/regions';
import { districtsOf } from '../data/cityDistricts';

interface Value { province: string; city: string; district: string; }
interface Props {
  value: Value;
  onChange: (v: Value) => void;
}

const selCls =
  'w-full px-3 py-3 bg-[var(--nb-page)] rounded-xl text-[var(--nb-ink)] outline-none focus:ring-2 focus:ring-[var(--nb-control)]/20 text-sm';

const RegionDistrictSelect: React.FC<Props> = ({ value, onChange }) => {
  const cities = PROVINCE_CITY[value.province] || [];
  const districts = districtsOf(value.city);
  return (
    <div className="grid grid-cols-3 gap-3">
      <select
        value={value.province}
        onChange={(e) => {
          const province = e.target.value;
          const cs = PROVINCE_CITY[province] || [];
          const city = cs.length === 1 ? cs[0] : '';
          onChange({ province, city, district: '' });
        }}
        className={selCls}
      >
        <option value="">省</option>
        {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <select
        value={value.city}
        disabled={!value.province}
        onChange={(e) => onChange({ ...value, city: e.target.value, district: '' })}
        className={`${selCls} disabled:opacity-60`}
      >
        <option value="">市</option>
        {cities.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select
        value={value.district}
        disabled={!value.city}
        onChange={(e) => onChange({ ...value, district: e.target.value })}
        className={`${selCls} disabled:opacity-60`}
      >
        <option value="">区/县</option>
        {districts.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
    </div>
  );
};

export default RegionDistrictSelect;
