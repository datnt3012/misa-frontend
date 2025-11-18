import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { organizationApi } from "@/api/organization.api";

interface Organization {
  code: string;
  name: string;
  level: string;
  parentCode?: string;
}

interface AddressData {
  address: string;
  provinceCode?: string;
  districtCode?: string;
  wardCode?: string;
  provinceName?: string;
  districtName?: string;
  wardName?: string;
}

interface AddressFormSeparateProps {
  value?: Partial<AddressData>;
  onChange: (data: AddressData) => void;
  disabled?: boolean;
  required?: boolean;
}

export const AddressFormSeparate: React.FC<AddressFormSeparateProps> = ({
  value = {},
  onChange,
  disabled = false,
  required = false
}) => {
  // Store all data loaded from API
  const [allProvinces, setAllProvinces] = useState<Organization[]>([]);
  const [allDistricts, setAllDistricts] = useState<Organization[]>([]);
  const [allWards, setAllWards] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [selectedProvince, setSelectedProvince] = useState(value.provinceCode || '');
  const [selectedDistrict, setSelectedDistrict] = useState(value.districtCode || '');
  const [selectedWard, setSelectedWard] = useState(value.wardCode || '');
  const [selectedProvinceName, setSelectedProvinceName] = useState(value.provinceName || '');
  const [selectedDistrictName, setSelectedDistrictName] = useState(value.districtName || '');
  const [selectedWardName, setSelectedWardName] = useState(value.wardName || '');
  const [addressDetail, setAddressDetail] = useState(value.address || '');

  // Filtered lists based on selection (computed after state declarations)
  // These are filtered from already-loaded data - NO API CALLS when selecting options
  const provinces = allProvinces;
  const districts = selectedProvince 
    ? allDistricts.filter(d => d.parentCode === selectedProvince)
    : [];
  const wards = selectedDistrict
    ? allWards.filter(w => w.parentCode === selectedDistrict)
    : [];

  // Autocomplete popover states
  const [openProvince, setOpenProvince] = useState(false);
  const [openDistrict, setOpenDistrict] = useState(false);
  const [openWard, setOpenWard] = useState(false);
  
  // Track if component has been initialized to avoid re-hydration
  const initializedRef = useRef(false);

  // Accent-insensitive search helper (remove diacritics)
  const normalizeText = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const hydratingRef = useRef(false);
  // Track if we're updating from user selection (internal) vs prop change (external)
  const isInternalUpdateRef = useRef(false);
  
  // Track if data has been loaded to prevent multiple API calls
  const dataLoadStartedRef = useRef(false);

  // Load all address data from API (all 3 levels at once)
  // This is called ONLY ONCE when component mounts, not when selecting options
  const loadAllAddressData = async () => {
    // Prevent multiple calls even if component remounts
    if (dataLoadStartedRef.current) {
      return;
    }
    dataLoadStartedRef.current = true;
    
    try {
      setLoading(true);
      console.log('[AddressForm] Loading all address data - ONE TIME ONLY');
      
      // Load all 3 levels in parallel - ONLY CALLED ONCE on mount
      const [provincesRes, districtsRes, wardsRes] = await Promise.all([
        organizationApi.getOrganizations({ noPaging: true, level: '1' }),
        organizationApi.getOrganizations({ noPaging: true, level: '2' }),
        organizationApi.getOrganizations({ noPaging: true, level: '3' })
      ]);
      
      console.log('[AddressForm] Address data loaded successfully');

      const provincesList = (provincesRes.organizations || []).filter(org => String(org.level) === '1');
      const districtsList = (districtsRes.organizations || []).filter(org => String(org.level) === '2');
      const wardsList = (wardsRes.organizations || []).filter(org => String(org.level) === '3');

      setAllProvinces(provincesList);
      setAllDistricts(districtsList);
      setAllWards(wardsList);
      setDataLoaded(true);

      // Update names if we have selections but no names
      if (selectedProvince && !selectedProvinceName) {
        const found = provincesList.find(p => p.code === selectedProvince);
        if (found) setSelectedProvinceName(found.name);
      }
      if (selectedDistrict && !selectedDistrictName) {
        const found = districtsList.find(d => d.code === selectedDistrict);
        if (found) setSelectedDistrictName(found.name);
      }
      if (selectedWard && !selectedWardName) {
        const found = wardsList.find(w => w.code === selectedWard);
        if (found) setSelectedWardName(found.name);
      }
    } catch (error: any) {
      console.error('Error loading address data:', error);
      setAllProvinces([]);
      setAllDistricts([]);
      setAllWards([]);
    } finally {
      setLoading(false);
    }
  };

  // Load all data once on mount
  useEffect(() => {
    loadAllAddressData();
  }, []);

  // Update names when selections change (data is already loaded)
  useEffect(() => {
    if (!dataLoaded) return;
    
    if (selectedProvince && !selectedProvinceName) {
      const found = allProvinces.find(p => p.code === selectedProvince);
      if (found) setSelectedProvinceName(found.name);
    }
  }, [selectedProvince, selectedProvinceName, allProvinces, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    
    if (selectedDistrict && !selectedDistrictName) {
      const found = allDistricts.find(d => d.code === selectedDistrict);
      if (found) setSelectedDistrictName(found.name);
    }
    
    // Clear ward when district changes
    if (!selectedDistrict) {
      setSelectedWard('');
      setSelectedWardName('');
    }
  }, [selectedDistrict, selectedDistrictName, allDistricts, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    
    if (selectedWard && !selectedWardName) {
      const found = allWards.find(w => w.code === selectedWard);
      if (found) setSelectedWardName(found.name);
    }
  }, [selectedWard, selectedWardName, allWards, dataLoaded]);

  // Track if address change is from user typing
  const isAddressTypingRef = useRef(false);

  // Update address detail when value.address changes (e.g., when customer is selected)
  useEffect(() => {
    // Skip if user is currently typing in the textarea
    if (isAddressTypingRef.current) {
      return;
    }
    
    // Skip if this is an internal update from other fields (province/district/ward selection)
    if (isInternalUpdateRef.current) {
      return;
    }
    
    // Update addressDetail when value.address is provided from parent and it's different
    if (value?.address !== undefined && value.address !== addressDetail) {
      setAddressDetail(value.address || '');
    }
  }, [value?.address, addressDetail]);

  // Hydrate selections when opening edit with existing values
  useEffect(() => {
    // Skip hydration if this is an internal update (user selection)
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false; // Reset flag
      return;
    }
    
    // Wait for data to be loaded
    if (!dataLoaded) return;
    
    if (!value) return;
    if (!value.provinceCode) {
      // If value has no provinceCode, clear everything only if we have selections
      if (selectedProvince || selectedDistrict || selectedWard) {
        setSelectedProvince('');
        setSelectedDistrict('');
        setSelectedWard('');
        setSelectedProvinceName('');
        setSelectedDistrictName('');
        setSelectedWardName('');
        initializedRef.current = false;
      }
      return;
    }
    
    // Only hydrate if values are actually different and we haven't initialized yet
    const codesMatch = value.provinceCode === selectedProvince && 
                       (value.districtCode || '') === (selectedDistrict || '') && 
                       (value.wardCode || '') === (selectedWard || '');
    
    if (codesMatch && initializedRef.current) {
      // Just update names if they're missing, but codes match
      if (value.provinceName && !selectedProvinceName) {
        setSelectedProvinceName(value.provinceName);
      } else if (!selectedProvinceName && selectedProvince) {
        const found = allProvinces.find(p => p.code === selectedProvince);
        if (found) setSelectedProvinceName(found.name);
      }
      if (value.districtName && !selectedDistrictName) {
        setSelectedDistrictName(value.districtName);
      } else if (!selectedDistrictName && selectedDistrict) {
        const found = allDistricts.find(d => d.code === selectedDistrict);
        if (found) setSelectedDistrictName(found.name);
      }
      if (value.wardName && !selectedWardName) {
        setSelectedWardName(value.wardName);
      } else if (!selectedWardName && selectedWard) {
        const found = allWards.find(w => w.code === selectedWard);
        if (found) setSelectedWardName(found.name);
      }
      return;
    }
    
    // Check if values actually changed
    const provinceChanged = value.provinceCode !== selectedProvince;
    // District changed if: value has districtCode and it's different from selected, OR value has districtCode but we don't have one
    const districtChanged = (value.districtCode && value.districtCode !== selectedDistrict) || 
                          (value.districtCode && !selectedDistrict);
    // Ward changed if: value has wardCode and it's different from selected, OR value has wardCode but we don't have one
    const wardChanged = (value.wardCode && value.wardCode !== selectedWard) || 
                       (value.wardCode && !selectedWard);
    
    // If any code changed, this is an external update (e.g., from customer selection)
    const hasAnyChange = provinceChanged || districtChanged || wardChanged;
    
    // CRITICAL: If we have selectedDistrict but value.districtCode is undefined,
    // NEVER clear! This prevents losing user selections
    // BUT: Allow if province changed (which would invalidate district anyway)
    if (initializedRef.current && selectedDistrict && !value.districtCode && !provinceChanged) {
      return; // Don't hydrate - preserve user selection
    }
    
    // If codes match, don't hydrate
    if (initializedRef.current && !hasAnyChange) {
      return;
    }
    
    // Hydrate with new values
    initializedRef.current = true;
    hydratingRef.current = true;
    
    // Set province
    setSelectedProvince(value.provinceCode);
    const province = allProvinces.find(p => p.code === value.provinceCode);
    setSelectedProvinceName(value.provinceName || province?.name || '');
    
    // Set district if provided
    if (value.districtCode) {
      setSelectedDistrict(value.districtCode);
      const district = allDistricts.find(d => d.code === value.districtCode);
      setSelectedDistrictName(value.districtName || district?.name || '');
      
      // Set ward if provided
      if (value.wardCode) {
        setSelectedWard(value.wardCode);
        const ward = allWards.find(w => w.code === value.wardCode);
        setSelectedWardName(value.wardName || ward?.name || '');
      } else {
        setSelectedWard('');
        setSelectedWardName('');
      }
    } else {
      // Only clear if province changed (fresh init or province change)
      if (!initializedRef.current || provinceChanged) {
        setSelectedDistrict('');
        setSelectedDistrictName('');
        setSelectedWard('');
        setSelectedWardName('');
      }
      // Otherwise keep current selection
    }
    
    hydratingRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.provinceCode, value.districtCode, value.wardCode, dataLoaded, allProvinces, allDistricts, allWards]);

  // Track previous values to avoid unnecessary onChange calls
  const prevValuesRef = useRef<{ province?: string; district?: string; ward?: string; address?: string }>({});

  // Notify parent when address changes
  useEffect(() => {
    // Skip onChange during hydration to avoid loops
    if (hydratingRef.current) return;
    
    // Wait for data to be loaded
    if (!dataLoaded) return;
    
    // Mark as internal update so hydration effect doesn't reset
    isInternalUpdateRef.current = true;
    
    // Get names from state or from loaded data
    const provinceName = selectedProvinceName || allProvinces.find(p => p.code === selectedProvince)?.name || '';
    const districtName = selectedDistrictName || allDistricts.find(d => d.code === selectedDistrict)?.name || '';
    const wardName = selectedWardName || allWards.find(w => w.code === selectedWard)?.name || '';

    // Check if values actually changed to avoid unnecessary onChange calls
    const currentValues = {
      province: selectedProvince || undefined,
      district: selectedDistrict || undefined,
      ward: selectedWard || undefined,
      address: addressDetail
    };

    const prevValues = prevValuesRef.current;
    const valuesChanged = 
      currentValues.province !== prevValues.province ||
      currentValues.district !== prevValues.district ||
      currentValues.ward !== prevValues.ward ||
      currentValues.address !== prevValues.address;

    if (!valuesChanged) {
      return; // No actual change, skip onChange
    }

    // Update previous values
    prevValuesRef.current = { ...currentValues };

    // CRITICAL: Always preserve districtCode when we have selectedDistrict
    // This ensures districtCode is never lost when selecting wards
    const addressData: AddressData = {
      address: addressDetail,
      provinceCode: selectedProvince || undefined,
      districtCode: selectedDistrict || undefined, // Always include if selectedDistrict exists
      wardCode: selectedWard || undefined,
      provinceName: provinceName || undefined,
      districtName: districtName || undefined,
      wardName: wardName || undefined
    };

    onChange(addressData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvince, selectedDistrict, selectedWard, selectedProvinceName, selectedDistrictName, selectedWardName, addressDetail, dataLoaded, allProvinces, allDistricts, allWards]);

  return (
    <div className="space-y-3">
      {/* Address Selection Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Province Autocomplete */}
        <div className="space-y-1">
          <Label className="text-xs">Tỉnh/TP {required}</Label>
          <Popover open={openProvince} onOpenChange={setOpenProvince}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-8" disabled={disabled || loading}>
                {selectedProvince
                  ? (selectedProvinceName || provinces.find(p => p.code === selectedProvince)?.name || (loading ? 'Đang tải...' : 'Chọn tỉnh'))
                  : (loading ? 'Đang tải...' : 'Chọn tỉnh')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[300px]" onWheelCapture={(e) => e.stopPropagation()}>
              <Command>
                <CommandInput placeholder="Tìm tỉnh/TP..." className="h-9" />
                <CommandList className="max-h-60 overflow-y-auto overscroll-contain" onWheel={(e) => e.stopPropagation()}>
                  <CommandEmpty>Không tìm thấy</CommandEmpty>
                  <CommandGroup>
                    {provinces.map((p) => (
                      <CommandItem key={p.code} value={`${p.code} ${p.name} ${normalizeText(p.name)}`} onSelect={() => { setSelectedProvince(p.code); setSelectedProvinceName(p.name); setSelectedDistrict(''); setSelectedDistrictName(''); setSelectedWard(''); setSelectedWardName(''); setOpenProvince(false); }}>
                        {p.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* District Autocomplete */}
        <div className="space-y-1">
          <Label className="text-xs">Quận/Huyện {required}</Label>
          <Popover open={openDistrict} onOpenChange={setOpenDistrict}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-8" disabled={disabled || !selectedProvince}>
                {selectedDistrict
                  ? (selectedDistrictName || districts.find(d => d.code === selectedDistrict)?.name || 'Đang tải...')
                  : 'Chọn quận/huyện'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[300px]" onWheelCapture={(e) => e.stopPropagation()}>
              <Command>
                <CommandInput placeholder="Tìm quận/huyện..." className="h-9" />
                <CommandList className="max-h-60 overflow-y-auto overscroll-contain" onWheel={(e) => e.stopPropagation()}>
                  <CommandEmpty>Không tìm thấy</CommandEmpty>
                  <CommandGroup>
                    {districts.map((d) => (
                      <CommandItem key={d.code} value={`${d.code} ${d.name} ${normalizeText(d.name)}`} onSelect={() => { setSelectedDistrict(d.code); setSelectedDistrictName(d.name); setSelectedWard(''); setSelectedWardName(''); setOpenDistrict(false); }}>
                        {d.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Ward Autocomplete */}
        <div className="space-y-1">
          <Label className="text-xs">Phường/Xã {required}</Label>
          <Popover open={openWard} onOpenChange={setOpenWard}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-8" disabled={disabled || !selectedDistrict}>
                {selectedWard
                  ? (selectedWardName || wards.find(w => w.code === selectedWard)?.name || 'Đang tải...')
                  : 'Chọn phường/xã'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[300px]" onWheelCapture={(e) => e.stopPropagation()}>
              <Command>
                <CommandInput placeholder="Tìm phường/xã..." className="h-9" />
                <CommandList className="max-h-60 overflow-y-auto overscroll-contain" onWheel={(e) => e.stopPropagation()}>
                  <CommandEmpty>Không có phường/xã phù hợp</CommandEmpty>
                  <CommandGroup>
                    {wards.map((w) => (
                      <CommandItem key={w.code} value={`${w.code} ${w.name} ${normalizeText(w.name)}`} onSelect={() => { setSelectedWard(w.code); setSelectedWardName(w.name); setOpenWard(false); }}>
                        {w.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Address Detail - Full Width */}
      <div className="space-y-1">
        <Label htmlFor="address-detail" className="text-xs">
          Địa chỉ chi tiết {required && <span className="text-red-500">*</span>}
        </Label>
        <Textarea
          id="address-detail"
          placeholder="Số nhà, tên đường, tòa nhà, căn hộ..."
          value={addressDetail}
          onChange={(e) => {
            isAddressTypingRef.current = true;
            setAddressDetail(e.target.value);
            // Reset flag after a short delay to allow external updates again
            setTimeout(() => {
              isAddressTypingRef.current = false;
            }, 100);
          }}
          disabled={disabled}
          className="min-h-[60px] resize-none"
          rows={2}
        />
      </div>

      {/* Address Options removed per requirement */}

      {loading && (
        <p className="text-xs text-muted-foreground">Đang tải danh sách địa chỉ...</p>
      )}
    </div>
  );
};

export default AddressFormSeparate;
