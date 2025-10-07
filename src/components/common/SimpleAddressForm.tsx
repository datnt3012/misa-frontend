import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { organizationApi } from "@/api/organization.api";

interface AddressData {
  address: string;
  provinceCode?: string;
  districtCode?: string;
  wardCode?: string;
  provinceName?: string;
  districtName?: string;
  wardName?: string;
  isPrimary?: boolean;
  isDefault?: boolean;
}

interface SimpleAddressFormProps {
  value?: Partial<AddressData>;
  onChange: (data: AddressData) => void;
  disabled?: boolean;
  required?: boolean;
}

export const SimpleAddressForm: React.FC<SimpleAddressFormProps> = ({
  value = {},
  onChange,
  disabled = false,
  required = false
}) => {
  const [addressOptions, setAddressOptions] = useState<Array<{
    value: string;
    label: string;
    level: string;
    parentCode?: string;
    fullPath: string;
  }>>([]);
  const [loading, setLoading] = useState(false);

  const [selectedAddress, setSelectedAddress] = useState(value.provinceCode || value.districtCode || value.wardCode || '');
  const [addressDetail, setAddressDetail] = useState(value.address || '');
  const [isPrimary, setIsPrimary] = useState(value.isPrimary || false);
  const [isDefault, setIsDefault] = useState(value.isDefault || false);

  // Load all address options
  const loadAddressOptions = async () => {
    try {
      setLoading(true);
      
      const allOptions: Array<{
        value: string;
        label: string;
        level: string;
        parentCode?: string;
        fullPath: string;
      }> = [];
      
      // Fetch provinces (level 1)
      const provincesResponse = await organizationApi.getOrganizations({
        noPaging: true,
        level: '1'
      });
      
      for (const province of provincesResponse.organizations) {
        allOptions.push({
          value: province.code,
          label: province.name,
          level: province.level,
          fullPath: province.name
        });
        
        // Fetch districts for this province
        const districtsResponse = await organizationApi.getOrganizations({
          noPaging: true,
          level: '2',
          parentCode: province.code
        });
        
        for (const district of districtsResponse.organizations) {
          allOptions.push({
            value: district.code,
            label: district.name,
            level: district.level,
            parentCode: district.parentCode,
            fullPath: `${province.name} > ${district.name}`
          });
          
          // Fetch wards for this district
          const wardsResponse = await organizationApi.getOrganizations({
            noPaging: true,
            level: '3',
            parentCode: district.code
          });
          
          for (const ward of wardsResponse.organizations) {
            allOptions.push({
              value: ward.code,
              label: ward.name,
              level: ward.level,
              parentCode: ward.parentCode,
              fullPath: `${province.name} > ${district.name} > ${ward.name}`
            });
          }
        }
      }
      
      setAddressOptions(allOptions);

    } catch (error: any) {
      console.error('Error loading address options:', error);
      
      // Fallback data
      const fallbackOptions = [
        {
          value: 'HN',
          label: 'Hà Nội',
          level: '1',
          fullPath: 'Hà Nội'
        },
        {
          value: 'HNBĐ',
          label: 'Quận Ba Đình',
          level: '2',
          parentCode: 'HN',
          fullPath: 'Hà Nội > Quận Ba Đình'
        },
        {
          value: 'HNBĐP1',
          label: 'Phường Phúc Xá',
          level: '3',
          parentCode: 'HNBĐ',
          fullPath: 'Hà Nội > Quận Ba Đình > Phường Phúc Xá'
        },
        {
          value: 'HCM',
          label: 'TP. Hồ Chí Minh',
          level: '1',
          fullPath: 'TP. Hồ Chí Minh'
        },
        {
          value: 'HCMQ1',
          label: 'Quận 1',
          level: '2',
          parentCode: 'HCM',
          fullPath: 'TP. Hồ Chí Minh > Quận 1'
        }
      ];
      setAddressOptions(fallbackOptions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddressOptions();
  }, []);

  // Handle address selection
  const handleAddressChange = (selectedValue: string) => {
    setSelectedAddress(selectedValue);
    
    const selectedOption = addressOptions.find(option => option.value === selectedValue);
    
    if (selectedOption) {
      let addressData: AddressData = {
        address: addressDetail,
        isPrimary,
        isDefault
      };
      
      if (selectedOption.level === '1') {
        // Province selected
        addressData.provinceCode = selectedOption.value;
        addressData.provinceName = selectedOption.label;
      } else if (selectedOption.level === '2') {
        // District selected
        const province = addressOptions.find(opt => opt.value === selectedOption.parentCode);
        addressData.provinceCode = selectedOption.parentCode;
        addressData.provinceName = province?.label;
        addressData.districtCode = selectedOption.value;
        addressData.districtName = selectedOption.label;
      } else if (selectedOption.level === '3') {
        // Ward selected
        const district = addressOptions.find(opt => opt.value === selectedOption.parentCode);
        const province = addressOptions.find(opt => opt.value === district?.parentCode);
        addressData.provinceCode = district?.parentCode;
        addressData.provinceName = province?.label;
        addressData.districtCode = selectedOption.parentCode;
        addressData.districtName = district?.label;
        addressData.wardCode = selectedOption.value;
        addressData.wardName = selectedOption.label;
      }
      
      onChange(addressData);
    }
  };

  // Notify parent when other fields change
  useEffect(() => {
    const selectedOption = addressOptions.find(option => option.value === selectedAddress);
    
    if (selectedOption) {
      let addressData: AddressData = {
        address: addressDetail,
        isPrimary,
        isDefault
      };
      
      if (selectedOption.level === '1') {
        addressData.provinceCode = selectedOption.value;
        addressData.provinceName = selectedOption.label;
      } else if (selectedOption.level === '2') {
        const province = addressOptions.find(opt => opt.value === selectedOption.parentCode);
        addressData.provinceCode = selectedOption.parentCode;
        addressData.provinceName = province?.label;
        addressData.districtCode = selectedOption.value;
        addressData.districtName = selectedOption.label;
      } else if (selectedOption.level === '3') {
        const district = addressOptions.find(opt => opt.value === selectedOption.parentCode);
        const province = addressOptions.find(opt => opt.value === district?.parentCode);
        addressData.provinceCode = district?.parentCode;
        addressData.provinceName = province?.label;
        addressData.districtCode = selectedOption.parentCode;
        addressData.districtName = district?.label;
        addressData.wardCode = selectedOption.value;
        addressData.wardName = selectedOption.label;
      }
      
      onChange(addressData);
    }
  }, [selectedAddress, addressDetail, isPrimary, isDefault, addressOptions, onChange]);

  return (
    <div className="space-y-4">
      {/* Single Address Dropdown */}
      <div className="space-y-2">
        <Label>
          Địa chỉ {required && <span className="text-red-500">*</span>}
        </Label>
        <Select
          value={selectedAddress}
          onValueChange={handleAddressChange}
          disabled={disabled || loading}
        >
          <SelectTrigger>
            <SelectValue placeholder={loading ? "Đang tải..." : "Chọn địa chỉ..."} />
          </SelectTrigger>
          <SelectContent>
            {addressOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.fullPath}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      {/* Address Options */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is-primary"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            disabled={disabled}
            className="rounded border-gray-300"
          />
          <Label htmlFor="is-primary" className="text-sm">Địa chỉ chính</Label>
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
          <Label htmlFor="is-default" className="text-sm">Mặc định</Label>
        </div>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Đang tải danh sách địa chỉ...</p>
      )}
    </div>
  );
};

export default SimpleAddressForm;

