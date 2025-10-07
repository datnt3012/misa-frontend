import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddressInfo } from "@/api/customer.api";
import { organizationApi } from "@/api/organization.api";

interface Organization {
  code: string;
  name: string;
  level: string;
  parentCode?: string;
  children?: Organization[];
}

interface Province extends Organization {
  districts: District[];
}

interface District extends Organization {
  wards: Ward[];
}

interface Ward extends Organization {
}

interface AddressFormProps {
  value?: {
    address?: string;
    addressInfo?: AddressInfo;
    latitude?: number;
    longitude?: number;
    isPrimary?: boolean;
    isDefault?: boolean;
  };
  onChange: (data: { 
    address: string; 
    addressInfo: AddressInfo;
    latitude?: number;
    longitude?: number;
    isPrimary?: boolean;
    isDefault?: boolean;
  }) => void;
  disabled?: boolean;
  required?: boolean;
}

export const AddressForm: React.FC<AddressFormProps> = ({
  value = {},
  onChange,
  disabled = false,
  required = false
}) => {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedProvince, setSelectedProvince] = useState(value.addressInfo?.provinceCode || '');
  const [selectedDistrict, setSelectedDistrict] = useState(value.addressInfo?.districtCode || '');
  const [selectedWard, setSelectedWard] = useState(value.addressInfo?.wardCode || '');
  const [addressDetail, setAddressDetail] = useState(value.address || '');
  const [postalCode, setPostalCode] = useState(value.addressInfo?.postalCode || '');
  const [latitude, setLatitude] = useState(value.latitude || '');
  const [longitude, setLongitude] = useState(value.longitude || '');
  const [isPrimary, setIsPrimary] = useState(value.isPrimary || false);
  const [isDefault, setIsDefault] = useState(value.isDefault || false);

  // Load provinces from organization API
  const loadProvinces = async () => {
    try {
      setLoading(true);
      
      // Fetch provinces (level 1) from organization API
      const response = await organizationApi.getOrganizations({
        noPaging: true,
        level: '1'
      });
      
      const provincesData: Province[] = [];
      
      for (const province of response.organizations) {
        // Fetch districts for each province
        const districtsResponse = await organizationApi.getOrganizations({
          noPaging: true,
          level: '2',
          parentCode: province.code
        });
        
        const districts: District[] = [];
        
        for (const district of districtsResponse.organizations) {
          // Fetch wards for each district
          const wardsResponse = await organizationApi.getOrganizations({
            noPaging: true,
            level: '3',
            parentCode: district.code
          });
          
          const wards: Ward[] = wardsResponse.organizations.map(ward => ({
            code: ward.code,
            name: ward.name,
            level: ward.level,
            parentCode: ward.parentCode
          }));
          
          districts.push({
            code: district.code,
            name: district.name,
            level: district.level,
            parentCode: district.parentCode,
            wards
          });
        }
        
        provincesData.push({
          code: province.code,
          name: province.name,
          level: province.level,
          parentCode: province.parentCode,
          districts
        });
      }

      setProvinces(provincesData);

    } catch (error: any) {
      console.error('Error loading provinces:', error);
      // Fallback data for common provinces
      const fallbackProvinces: Province[] = [
        {
          code: 'HN',
          name: 'Hà Nội',
          level: '1',
          districts: [
            {
              code: 'HNBĐ',
              name: 'Quận Ba Đình',
              level: '2',
              parentCode: 'HN',
              wards: [
                { code: 'HNBĐP1', name: 'Phường Phúc Xá', level: '3', parentCode: 'HNBĐ' },
                { code: 'HNBĐP2', name: 'Phường Trúc Bạch', level: '3', parentCode: 'HNBĐ' },
                { code: 'HNBĐP3', name: 'Phường Vĩnh Phú', level: '3', parentCode: 'HNBĐ' }
              ]
            }
          ]
        },
        {
          code: 'HCM',
          name: 'TP. Hồ Chí Minh',
          level: '1',
          districts: [
            {
              code: 'HCMQ1',
              name: 'Quận 1',
              level: '2',
              parentCode: 'HCM',
              wards: [
                { code: 'HCMQ1P1', name: 'Phường Bến Nghé', level: '3', parentCode: 'HCMQ1' },
                { code: 'HCMQ1P2', name: 'Phường Bến Thành', level: '3', parentCode: 'HCMQ1' },
                { code: 'HCMQ1P3', name: 'Phường Cầu Kho', level: '3', parentCode: 'HCMQ1' }
              ]
            }
          ]
        }
      ];
      setProvinces(fallbackProvinces);
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

    const addressInfo: AddressInfo = {
      provinceCode: selectedProvince || undefined,
      districtCode: selectedDistrict || undefined,
      wardCode: selectedWard || undefined,
      postalCode: postalCode || undefined,
      isPrimary: isPrimary
    };

    onChange({
      address: addressDetail,
      addressInfo,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      isPrimary,
      isDefault
    });
  }, [selectedProvince, selectedDistrict, selectedWard, addressDetail, postalCode, latitude, longitude, isPrimary, isDefault, provinces, districts, wards, onChange]);

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Postal Code */}
        <div className="space-y-2">
          <Label htmlFor="postal-code">
            Mã bưu điện
          </Label>
          <Input
            id="postal-code"
            placeholder="Mã bưu điện"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Coordinates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="latitude">
            Vĩ độ (Latitude)
          </Label>
          <Input
            id="latitude"
            type="number"
            step="any"
            placeholder="21.0285"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="longitude">
            Kinh độ (Longitude)
          </Label>
          <Input
            id="longitude"
            type="number"
            step="any"
            placeholder="105.8542"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Address Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is-primary"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            disabled={disabled}
            className="rounded border-gray-300"
          />
          <Label htmlFor="is-primary" className="text-sm font-medium">
            Địa chỉ chính
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is-default"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            disabled={disabled}
            className="rounded border-gray-300"
          />
          <Label htmlFor="is-default" className="text-sm font-medium">
            Địa chỉ mặc định
          </Label>
        </div>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Đang tải dữ liệu địa chỉ...</p>
      )}
    </div>
  );
};

export default AddressForm;
