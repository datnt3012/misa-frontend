import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { organizationApi } from "@/api/organization.api";

interface Organization {
  code: string;
  name: string;
  level: string;
  parentCode?: string;
  children?: Organization[];
}

interface AddressOption {
  value: string;
  label: string;
  level: string;
  parentCode?: string;
  fullPath: string; // Đường dẫn đầy đủ như "Hà Nội > Quận Ba Đình > Phường Phúc Xá"
}

interface AddressSelectorProps {
  value?: string;
  onChange: (value: string, addressData?: {
    provinceCode?: string;
    districtCode?: string;
    wardCode?: string;
    provinceName?: string;
    districtName?: string;
    wardName?: string;
  }) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}

export const AddressSelector: React.FC<AddressSelectorProps> = ({
  value = '',
  onChange,
  disabled = false,
  required = false,
  placeholder = "Chọn địa chỉ..."
}) => {
  const [addressOptions, setAddressOptions] = useState<AddressOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Load all address options from organization API
  const loadAddressOptions = async () => {
    try {
      setLoading(true);
      
      const allOptions: AddressOption[] = [];
      
      // Fetch provinces (level 1)
      const provincesResponse = await organizationApi.getOrganizations({
        noPaging: true,
        level: '1'
      });
      
      for (const province of provincesResponse.organizations) {
        // Add province option
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
          // Add district option
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
            // Add ward option
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
      const fallbackOptions: AddressOption[] = [
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
          value: 'HNBĐP2',
          label: 'Phường Trúc Bạch',
          level: '3',
          parentCode: 'HNBĐ',
          fullPath: 'Hà Nội > Quận Ba Đình > Phường Trúc Bạch'
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
        },
        {
          value: 'HCMQ1P1',
          label: 'Phường Bến Nghé',
          level: '3',
          parentCode: 'HCMQ1',
          fullPath: 'TP. Hồ Chí Minh > Quận 1 > Phường Bến Nghé'
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

  const handleValueChange = (selectedValue: string) => {
    const selectedOption = addressOptions.find(option => option.value === selectedValue);
    
    if (selectedOption) {
      // Parse the address data based on the selected option
      let addressData: any = {};
      
      if (selectedOption.level === '1') {
        // Province selected
        addressData = {
          provinceCode: selectedOption.value,
          provinceName: selectedOption.label
        };
      } else if (selectedOption.level === '2') {
        // District selected
        const province = addressOptions.find(opt => opt.value === selectedOption.parentCode);
        addressData = {
          provinceCode: selectedOption.parentCode,
          provinceName: province?.label,
          districtCode: selectedOption.value,
          districtName: selectedOption.label
        };
      } else if (selectedOption.level === '3') {
        // Ward selected
        const district = addressOptions.find(opt => opt.value === selectedOption.parentCode);
        const province = addressOptions.find(opt => opt.value === district?.parentCode);
        addressData = {
          provinceCode: district?.parentCode,
          provinceName: province?.label,
          districtCode: selectedOption.parentCode,
          districtName: district?.label,
          wardCode: selectedOption.value,
          wardName: selectedOption.label
        };
      }
      
      onChange(selectedValue, addressData);
    }
  };

  return (
    <div className="space-y-2">
      <Label>
        Địa chỉ {required && <span className="text-red-500">*</span>}
      </Label>
      <Select
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled || loading}
      >
        <SelectTrigger>
          <SelectValue placeholder={loading ? "Đang tải..." : placeholder} />
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
      
      {loading && (
        <p className="text-sm text-muted-foreground">Đang tải danh sách địa chỉ...</p>
      )}
    </div>
  );
};

export default AddressSelector;
