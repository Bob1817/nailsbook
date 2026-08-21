import React from 'react';
import { districtsOf } from '../data/cityDistricts';

interface DistrictSelectProps {
  city: string;            // locked city (from technician)
  value: string;           // selected district
  onChange: (district: string) => void;
  className?: string;
}

const DistrictSelect: React.FC<DistrictSelectProps> = ({ city, value, onChange, className }) => {
  const districts = districtsOf(city);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={
        className ||
        'w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-gray-900 outline-none ring-1 ring-slate-200 focus:ring-[#FF6B8A]/20'
      }
    >
      <option value="">选择区/县</option>
      {districts.map((d) => (
        <option key={d} value={d}>{d}</option>
      ))}
    </select>
  );
};

export default DistrictSelect;
