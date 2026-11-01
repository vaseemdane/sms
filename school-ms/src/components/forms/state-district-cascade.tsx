"use client";

import * as React from "react";
import { INDIA_STATES, INDIA_STATES_AND_DISTRICTS } from "@/constants/india-geo";
import { Label } from "@/components/ui/label";

interface StateDistrictCascadeProps {
  selectedState?: string;
  selectedDistrict?: string;
  onStateChange: (state: string) => void;
  onDistrictChange: (district: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function StateDistrictCascade({
  selectedState = "Karnataka",
  selectedDistrict = "",
  onStateChange,
  onDistrictChange,
  disabled = false,
  required = true,
  className = "grid grid-cols-1 md:grid-cols-2 gap-4",
}: StateDistrictCascadeProps) {
  const districts = React.useMemo(() => {
    return INDIA_STATES_AND_DISTRICTS[selectedState] || [];
  }, [selectedState]);

  const handleStateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value;
    onStateChange(newState);
    onDistrictChange(""); // Clear district on state change as per requirement
  };

  const handleDistrictSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onDistrictChange(e.target.value);
  };

  return (
    <div className={className}>
      <div className="space-y-1.5">
        <Label htmlFor="state-select" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          State / Union Territory {required && <span className="text-destructive">*</span>}
        </Label>
        <select
          id="state-select"
          value={selectedState}
          onChange={handleStateSelect}
          disabled={disabled}
          required={required}
          className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50"
        >
          <option value="" disabled>Select State / UT</option>
          {INDIA_STATES.map((stateName) => (
            <option key={stateName} value={stateName}>
              {stateName}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="district-select" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          District {required && <span className="text-destructive">*</span>}
        </Label>
        <select
          id="district-select"
          value={selectedDistrict}
          onChange={handleDistrictSelect}
          disabled={disabled || !selectedState}
          required={required}
          className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50"
        >
          <option value="">{selectedState ? "Select District" : "Select State first"}</option>
          {districts.map((dist) => (
            <option key={dist} value={dist}>
              {dist}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
