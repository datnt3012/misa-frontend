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
  const [provinces, setProvinces] = useState<Organization[]>([]);
  const [districts, setDistricts] = useState<Organization[]>([]);
  const [wards, setWards] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedProvince, setSelectedProvince] = useState(value.provinceCode || '');
  const [selectedDistrict, setSelectedDistrict] = useState(value.districtCode || '');
  const [selectedWard, setSelectedWard] = useState(value.wardCode || '');
  const [selectedProvinceName, setSelectedProvinceName] = useState(value.provinceName || '');
  const [selectedDistrictName, setSelectedDistrictName] = useState(value.districtName || '');
  const [selectedWardName, setSelectedWardName] = useState(value.wardName || '');
  const [addressDetail, setAddressDetail] = useState(value.address || '');
  // Removed primary/default flags per requirement

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

  // Load provinces from API (level 1)
  const loadProvinces = async () => {
    try {
      setLoading(true);
      const response = await organizationApi.getOrganizations({
        noPaging: true,
        level: '1'
      });
      const list = (response.organizations || []).filter(org => String(org.level) === '1');
      setProvinces(list);
      if (selectedProvince && !selectedProvinceName) {
        const found = list.find(p => p.code === selectedProvince);
        if (found) setSelectedProvinceName(found.name);
      }
    } catch (error: any) {
      console.error('Error loading provinces:', error);
      setProvinces([]);
    } finally {
      setLoading(false);
    }
  };

  // Load districts when province changes
  const loadDistricts = async (provinceCode: string, preserveSelection: boolean = false) => {
    if (!provinceCode) {
      setDistricts([]);
      setWards([]);
      setSelectedDistrict('');
      setSelectedWard('');
      return;
    }

    try {
      setLoading(true);
      const response = await organizationApi.getOrganizations({
        noPaging: true,
        level: '2',
        parentCode: provinceCode
      });
      // Backend already filters by level and parentCode
      const list = response.organizations || [];
      setDistricts(list);
      setWards([]);
      if (!preserveSelection) {
        // Province changed, always clear district and ward
        setSelectedDistrict('');
        setSelectedDistrictName('');
        setSelectedWard('');
        setSelectedWardName('');
      } else if (selectedDistrict) {
        // Preserve selection mode - check if district still exists
        const found = list.find(d => d.code === selectedDistrict);
        if (found) {
          // District still exists, update name if needed
          setSelectedDistrictName(found.name);
        } else {
          // District no longer exists in list, clear it
          setSelectedDistrict('');
          setSelectedDistrictName('');
          setSelectedWard('');
          setSelectedWardName('');
        }
      }
    } catch (error: any) {
      console.error('Error loading districts:', error);
      setDistricts([]);
    } finally {
      setLoading(false);
    }
  };

  // Load wards when district changes
  const loadWards = async (districtCode: string, preserveSelection: boolean = false) => {
    if (!districtCode) {
      setWards([]);
      setSelectedWard('');
      setSelectedWardName('');
      return;
    }

    try {
      setLoading(true);
      const response = await organizationApi.getOrganizations({
        noPaging: true,
        level: '3',
        parentCode: districtCode
      });
      // Backend already filters by level and parentCode
      const list = response.organizations || [];
      setWards(list);
      if (!preserveSelection) {
        // District changed, always clear ward
        setSelectedWard('');
        setSelectedWardName('');
      } else if (selectedWard) {
        // Preserve selection mode - check if ward still exists
        const found = list.find(w => w.code === selectedWard);
        if (found) {
          // Ward still exists, update name if needed
          setSelectedWardName(found.name);
        } else {
          // Ward no longer exists in list, clear it
          setSelectedWard('');
          setSelectedWardName('');
        }
      }
    } catch (error: any) {
      console.error('Error loading wards:', error);
      setWards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProvinces();
  }, []);

  useEffect(() => {
    if (selectedProvince) {
      if (hydratingRef.current) return; // avoid cascading during hydration
      loadDistricts(selectedProvince, false);
    }
  }, [selectedProvince]);

  useEffect(() => {
    if (selectedDistrict) {
      if (hydratingRef.current) return; // avoid cascading during hydration
      // Load wards for the selected district
      // Don't wait for districts list to be populated - just load based on selectedDistrict
      loadWards(selectedDistrict, false);
    } else {
      // Only clear wards if district is explicitly cleared
      setWards([]);
      setSelectedWard('');
      setSelectedWardName('');
    }
  }, [selectedDistrict]);

  // Hydrate selections when opening edit with existing values
  useEffect(() => {
    // Skip hydration if this is an internal update (user selection)
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false; // Reset flag
      return;
    }
    
    if (!value) return;
    if (!value.provinceCode) return;
    
    // Only hydrate if values are actually different and we haven't initialized yet
    // Don't reset if we're just updating names from the same codes
    const codesMatch = value.provinceCode === selectedProvince && 
                       (value.districtCode || '') === (selectedDistrict || '') && 
                       (value.wardCode || '') === (selectedWard || '');
    
    if (codesMatch && initializedRef.current) {
      // Just update names if they're missing, but codes match
      if (value.provinceName && !selectedProvinceName) {
        setSelectedProvinceName(value.provinceName);
      }
      if (value.districtName && !selectedDistrictName) {
        setSelectedDistrictName(value.districtName);
      }
      if (value.wardName && !selectedWardName) {
        setSelectedWardName(value.wardName);
      }
      return;
    }
    
    // Reset initialization if we have new values to hydrate that don't match current state
    if (!codesMatch) {
      initializedRef.current = false; // Allow re-hydration
    }
    
    if (initializedRef.current) return; // Already initialized for this set of values
    
    initializedRef.current = true;
    hydratingRef.current = true;
    
    (async () => {
      setSelectedProvince(value.provinceCode!);
      setSelectedProvinceName(value.provinceName || '');
      await loadDistricts(value.provinceCode!, true);
      if (value.districtCode) {
        setSelectedDistrict(value.districtCode);
        setSelectedDistrictName(value.districtName || '');
        await loadWards(value.districtCode, true);
        if (value.wardCode) {
          setSelectedWard(value.wardCode);
          setSelectedWardName(value.wardName || '');
        }
      } else {
        setSelectedWard('');
        setSelectedWardName('');
      }
    })().finally(() => {
      hydratingRef.current = false;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.provinceCode, value.districtCode, value.wardCode]);

  // Notify parent when address changes
  useEffect(() => {
    // Skip onChange during hydration to avoid loops
    if (hydratingRef.current) return;
    
    // Mark as internal update so hydration effect doesn't reset
    isInternalUpdateRef.current = true;
    
    // Only call onChange if we have valid selections or if explicitly clearing
    // Don't reset if districts/wards lists are still loading
    const provinceName = selectedProvinceName || provinces.find(p => p.code === selectedProvince)?.name || '';
    const districtName = selectedDistrictName || districts.find(d => d.code === selectedDistrict)?.name || '';
    const wardName = selectedWardName || wards.find(w => w.code === selectedWard)?.name || '';

    const addressData: AddressData = {
      address: addressDetail,
      provinceCode: selectedProvince || undefined,
      districtCode: selectedDistrict || undefined,
      wardCode: selectedWard || undefined,
      provinceName: provinceName || undefined,
      districtName: districtName || undefined,
      wardName: wardName || undefined
    };

    onChange(addressData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvince, selectedDistrict, selectedWard, selectedProvinceName, selectedDistrictName, selectedWardName, addressDetail]);

  return (
    <div className="space-y-3">
      {/* Address Selection Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Province Autocomplete */}
        <div className="space-y-1">
          <Label className="text-xs">Tỉnh/TP {required && <span className="text-red-500">*</span>}</Label>
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
          <Label className="text-xs">Quận/Huyện {required && <span className="text-red-500">*</span>}</Label>
          <Popover open={openDistrict} onOpenChange={setOpenDistrict}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-8" disabled={disabled || !selectedProvince}>
                {selectedDistrict
                  ? (selectedDistrictName || districts.find(d => d.code === selectedDistrict)?.name || (loading ? 'Đang tải...' : 'Chọn quận/huyện'))
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
          <Label className="text-xs">Phường/Xã {required && <span className="text-red-500">*</span>}</Label>
          <Popover open={openWard} onOpenChange={setOpenWard}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-8" disabled={disabled || !selectedDistrict}>
                {selectedWard
                  ? (selectedWardName || wards.find(w => w.code === selectedWard)?.name || (loading ? 'Đang tải...' : 'Chọn phường/xã'))
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
          onChange={(e) => setAddressDetail(e.target.value)}
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
