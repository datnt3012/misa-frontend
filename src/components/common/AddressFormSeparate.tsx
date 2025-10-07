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
  const [addressDetail, setAddressDetail] = useState(value.address || '');
  // Removed primary/default flags per requirement

  // Autocomplete popover states
  const [openProvince, setOpenProvince] = useState(false);
  const [openDistrict, setOpenDistrict] = useState(false);
  const [openWard, setOpenWard] = useState(false);

  // Accent-insensitive search helper (remove diacritics)
  const normalizeText = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const hydratingRef = useRef(false);

  // Load provinces from API (level 1)
  const loadProvinces = async () => {
    try {
      setLoading(true);
      const response = await organizationApi.getOrganizations({
        noPaging: true,
        level: '1'
      });
      setProvinces((response.organizations || []).filter(org => String(org.level) === '1'));
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
      setDistricts(response.organizations || []);
      setWards([]);
      if (!preserveSelection) {
        setSelectedDistrict('');
        setSelectedWard('');
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
      setWards(response.organizations || []);
      if (!preserveSelection) {
        setSelectedWard('');
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
      loadWards(selectedDistrict, false);
    }
  }, [selectedDistrict]);

  // Hydrate selections when opening edit with existing values
  useEffect(() => {
    if (!value) return;
    if (!value.provinceCode) return;
    hydratingRef.current = true;
    (async () => {
      setSelectedProvince(value.provinceCode!);
      await loadDistricts(value.provinceCode!, true);
      if (value.districtCode) {
        setSelectedDistrict(value.districtCode);
        await loadWards(value.districtCode, true);
        if (value.wardCode) setSelectedWard(value.wardCode);
      } else {
        setSelectedWard('');
      }
    })().finally(() => {
      hydratingRef.current = false;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.provinceCode, value.districtCode, value.wardCode]);

  // Notify parent when address changes
  useEffect(() => {
    const provinceName = provinces.find(p => p.code === selectedProvince)?.name || '';
    const districtName = districts.find(d => d.code === selectedDistrict)?.name || '';
    const wardName = wards.find(w => w.code === selectedWard)?.name || '';

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
  }, [selectedProvince, selectedDistrict, selectedWard, addressDetail, provinces, districts, wards, onChange]);

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
                {selectedProvince ? (provinces.find(p => p.code === selectedProvince)?.name || selectedProvince) : (loading ? 'Đang tải...' : 'Chọn tỉnh')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[300px]" onWheelCapture={(e) => e.stopPropagation()}>
              <Command>
                <CommandInput placeholder="Tìm tỉnh/TP..." className="h-9" />
                <CommandList className="max-h-60 overflow-y-auto overscroll-contain" onWheel={(e) => e.stopPropagation()}>
                  <CommandEmpty>Không tìm thấy</CommandEmpty>
                  <CommandGroup>
                    {provinces.map((p) => (
                      <CommandItem key={p.code} value={`${p.code} ${p.name} ${normalizeText(p.name)}`} onSelect={() => { setSelectedProvince(p.code); setOpenProvince(false); }}>
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
                {selectedDistrict ? (districts.find(d => d.code === selectedDistrict)?.name || selectedDistrict) : 'Chọn quận/huyện'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[300px]" onWheelCapture={(e) => e.stopPropagation()}>
              <Command>
                <CommandInput placeholder="Tìm quận/huyện..." className="h-9" />
                <CommandList className="max-h-60 overflow-y-auto overscroll-contain" onWheel={(e) => e.stopPropagation()}>
                  <CommandEmpty>Không tìm thấy</CommandEmpty>
                  <CommandGroup>
                    {districts.map((d) => (
                      <CommandItem key={d.code} value={`${d.code} ${d.name} ${normalizeText(d.name)}`} onSelect={() => { setSelectedDistrict(d.code); setOpenDistrict(false); }}>
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
                {selectedWard ? (wards.find(w => w.code === selectedWard)?.name || selectedWard) : 'Chọn phường/xã'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[300px]" onWheelCapture={(e) => e.stopPropagation()}>
              <Command>
                <CommandInput placeholder="Tìm phường/xã..." className="h-9" />
                <CommandList className="max-h-60 overflow-y-auto overscroll-contain" onWheel={(e) => e.stopPropagation()}>
                  <CommandEmpty>Không có phường/xã phù hợp</CommandEmpty>
                  <CommandGroup>
                    {wards.map((w) => (
                      <CommandItem key={w.code} value={`${w.code} ${w.name} ${normalizeText(w.name)}`} onSelect={() => { setSelectedWard(w.code); setOpenWard(false); }}>
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
