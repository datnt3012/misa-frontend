import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
// // import { supabase } from "@/integrations/supabase/client"; // Removed - using API instead // Removed - using API instead

interface Province {
  code: string;
  name: string;
  districts: District[];
}

interface District {
  code: string;
  name: string;
  wards: Ward[];
}

interface Ward {
  code: string;
  name: string;
}

interface AddressData {
  province_code: string;
  province_name: string;
  district_code: string;
  district_name: string;
  ward_code: string;
  ward_name: string;
  address_detail: string;
}

interface AddressComponentProps {
  value?: Partial<AddressData>;
  onChange: (address: AddressData) => void;
  disabled?: boolean;
  required?: boolean;
}

export const AddressComponent: React.FC<AddressComponentProps> = ({
  value = {},
  onChange,
  disabled = false,
  required = false
}) => {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedProvince, setSelectedProvince] = useState(value.province_code || '');
  const [selectedDistrict, setSelectedDistrict] = useState(value.district_code || '');
  const [selectedWard, setSelectedWard] = useState(value.ward_code || '');
  const [addressDetail, setAddressDetail] = useState(value.address_detail || '');

  // Load provinces from API or cache
  const loadProvinces = async () => {
    try {
      setLoading(true);
      
      // Try to get from cache first
      const { data: cached } = await supabase
        .from('provinces_cache')
        .select('*')
        .order('name');

      if (cached && cached.length > 0) {
        const provincesData = cached.map(p => ({
          code: p.code,
          name: p.name,
          districts: (p.districts as any) || []
        }));
        setProvinces(provincesData);
        return;
      }

      // If no cache, fetch from API
      const response = await fetch('https://provinces.open-api.vn/api/?depth=3');
      if (!response.ok) throw new Error('API not available');
      
      const data = await response.json();
      const provincesData = data.map((p: any) => ({
        code: p.code,
        name: p.name,
        districts: p.districts.map((d: any) => ({
          code: d.code,
          name: d.name,
          wards: d.wards.map((w: any) => ({
            code: w.code,
            name: w.name
          }))
        }))
      }));

      setProvinces(provincesData);

      // Cache the data
      for (const province of provincesData) {
        await supabase
          .from('provinces_cache')
          .upsert({
            code: province.code,
            name: province.name,
            districts: province.districts,
            last_updated: new Date().toISOString()
          }, { onConflict: 'code' });
      }

    } catch (error: any) {
      console.error('Error loading provinces:', error);
      toast.error(error.message || 'Không thể tải danh sách tỉnh/thành. Sử dụng dữ liệu cache.');
      
      // Try to use cached data even if outdated
      const { data: cached } = await supabase
        .from('provinces_cache')
        .select('*')
        .order('name');

      if (cached && cached.length > 0) {
        const provincesData = cached.map(p => ({
          code: p.code,
          name: p.name,
          districts: (p.districts as any) || []
        }));
        setProvinces(provincesData);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProvinces();
  }, []);

  // Update districts when province changes
  useEffect(() => {
    if (selectedProvince) {
      const province = provinces.find(p => p.code === selectedProvince);
      if (province) {
        setDistricts(province.districts);
        // Reset lower levels
        setSelectedDistrict('');
        setSelectedWard('');
        setWards([]);
      }
    } else {
      setDistricts([]);
      setWards([]);
    }
  }, [selectedProvince, provinces]);

  // Update wards when district changes
  useEffect(() => {
    if (selectedDistrict) {
      const district = districts.find(d => d.code === selectedDistrict);
      if (district) {
        setWards(district.wards);
        // Reset ward
        setSelectedWard('');
      }
    } else {
      setWards([]);
    }
  }, [selectedDistrict, districts]);

  // Notify parent component when address changes
  useEffect(() => {
    const provinceName = provinces.find(p => p.code === selectedProvince)?.name || '';
    const districtName = districts.find(d => d.code === selectedDistrict)?.name || '';
    const wardName = wards.find(w => w.code === selectedWard)?.name || '';

    onChange({
      province_code: selectedProvince,
      province_name: provinceName,
      district_code: selectedDistrict,
      district_name: districtName,
      ward_code: selectedWard,
      ward_name: wardName,
      address_detail: addressDetail
    });
  }, [selectedProvince, selectedDistrict, selectedWard, addressDetail, provinces, districts, wards, onChange]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Province Selection */}
        <div className="space-y-2">
          <Label htmlFor="province">
            Tỉnh/Thành phố {required && <span className="text-red-500">*</span>}
          </Label>
          <Select
            value={selectedProvince}
            onValueChange={setSelectedProvince}
            disabled={disabled || loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn tỉnh/thành phố" />
            </SelectTrigger>
            <SelectContent>
              {provinces.map((province) => (
                <SelectItem key={province.code} value={province.code}>
                  {province.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* District Selection */}
        <div className="space-y-2">
          <Label htmlFor="district">
            Quận/Huyện {required && <span className="text-red-500">*</span>}
          </Label>
          <Select
            value={selectedDistrict}
            onValueChange={setSelectedDistrict}
            disabled={disabled || !selectedProvince || districts.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn quận/huyện" />
            </SelectTrigger>
            <SelectContent>
              {districts.map((district) => (
                <SelectItem key={district.code} value={district.code}>
                  {district.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ward Selection */}
        <div className="space-y-2">
          <Label htmlFor="ward">
            Phường/Xã {required && <span className="text-red-500">*</span>}
          </Label>
          <Select
            value={selectedWard}
            onValueChange={setSelectedWard}
            disabled={disabled || !selectedDistrict || wards.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn phường/xã" />
            </SelectTrigger>
            <SelectContent>
              {wards.map((ward) => (
                <SelectItem key={ward.code} value={ward.code}>
                  {ward.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Address Detail */}
      <div className="space-y-2">
        <Label htmlFor="address-detail">
          Địa chỉ chi tiết {required && <span className="text-red-500">*</span>}
        </Label>
        <Input
          id="address-detail"
          placeholder="Số nhà, tên đường..."
          value={addressDetail}
          onChange={(e) => setAddressDetail(e.target.value)}
          disabled={disabled}
        />
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Đang tải dữ liệu địa chỉ...</p>
      )}
    </div>
  );
};

export default AddressComponent;

