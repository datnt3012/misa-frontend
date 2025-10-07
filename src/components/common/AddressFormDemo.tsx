import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddressForm } from './AddressForm';
import { AddressComponent } from './AddressComponent';
import { SimpleAddressForm } from './SimpleAddressForm';
import { AddressSelector } from './AddressSelector';

export const AddressFormDemo: React.FC = () => {
  const [addressFormData, setAddressFormData] = useState({
    address: '',
    addressInfo: {
      provinceCode: '',
      districtCode: '',
      wardCode: '',
      postalCode: '',
      isPrimary: false
    },
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    isPrimary: false,
    isDefault: false
  });

  const [addressComponentData, setAddressComponentData] = useState({
    province_code: '',
    province_name: '',
    district_code: '',
    district_name: '',
    ward_code: '',
    ward_name: '',
    address_detail: '',
    postal_code: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    is_primary: false,
    is_default: false
  });

  const [simpleAddressData, setSimpleAddressData] = useState({
    address: '',
    provinceCode: '',
    districtCode: '',
    wardCode: '',
    provinceName: '',
    districtName: '',
    wardName: '',
    postalCode: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    isPrimary: false,
    isDefault: false
  });

  const [addressSelectorValue, setAddressSelectorValue] = useState('');
  const [addressSelectorData, setAddressSelectorData] = useState<any>({});

  const handleAddressFormChange = (data: any) => {
    setAddressFormData(data);
    console.log('AddressForm Data:', data);
  };

  const handleAddressComponentChange = (data: any) => {
    setAddressComponentData(data);
    console.log('AddressComponent Data:', data);
  };

  const handleSimpleAddressChange = (data: any) => {
    setSimpleAddressData(data);
    console.log('SimpleAddressForm Data:', data);
  };

  const handleAddressSelectorChange = (value: string, data?: any) => {
    setAddressSelectorValue(value);
    setAddressSelectorData(data || {});
    console.log('AddressSelector Value:', value, 'Data:', data);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Demo Address Forms</h1>
        <p className="text-muted-foreground">
          Giao diện đầy đủ các trường địa chỉ với dropdown chọn từ API Organization
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SimpleAddressForm Demo */}
        <Card>
          <CardHeader>
            <CardTitle>SimpleAddressForm - Một Dropdown</CardTitle>
            <p className="text-sm text-muted-foreground">
              Component với một dropdown duy nhất cho địa chỉ
            </p>
          </CardHeader>
          <CardContent>
            <SimpleAddressForm
              value={simpleAddressData}
              onChange={handleSimpleAddressChange}
              required={true}
            />
          </CardContent>
        </Card>

        {/* AddressSelector Demo */}
        <Card>
          <CardHeader>
            <CardTitle>AddressSelector - Chọn Địa Chỉ</CardTitle>
            <p className="text-sm text-muted-foreground">
              Component chỉ để chọn địa chỉ từ dropdown
            </p>
          </CardHeader>
          <CardContent>
            <AddressSelector
              value={addressSelectorValue}
              onChange={handleAddressSelectorChange}
              required={true}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AddressForm Demo */}
        <Card>
          <CardHeader>
            <CardTitle>AddressForm - 3 Dropdowns</CardTitle>
            <p className="text-sm text-muted-foreground">
              Component với 3 dropdown riêng biệt
            </p>
          </CardHeader>
          <CardContent>
            <AddressForm
              value={addressFormData}
              onChange={handleAddressFormChange}
              required={true}
            />
          </CardContent>
        </Card>

        {/* AddressComponent Demo */}
        <Card>
          <CardHeader>
            <CardTitle>AddressComponent - 3 Dropdowns</CardTitle>
            <p className="text-sm text-muted-foreground">
              Component với 3 dropdown riêng biệt
            </p>
          </CardHeader>
          <CardContent>
            <AddressComponent
              value={addressComponentData}
              onChange={handleAddressComponentChange}
              required={true}
            />
          </CardContent>
        </Card>
      </div>

      {/* Data Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>SimpleAddressForm Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
              {JSON.stringify(simpleAddressData, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AddressSelector Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <strong>Selected Value:</strong> {addressSelectorValue}
              </div>
              <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
                {JSON.stringify(addressSelectorData, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features List */}
      <Card>
        <CardHeader>
          <CardTitle>Tính năng đã bổ sung</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">🎯 SimpleAddressForm</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Một dropdown duy nhất</li>
                <li>• Hiển thị đường dẫn đầy đủ</li>
                <li>• Tự động phân tích cấp độ</li>
                <li>• Dễ sử dụng</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">📍 AddressSelector</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Chỉ chọn địa chỉ</li>
                <li>• Trả về dữ liệu cấu trúc</li>
                <li>• Nhẹ và nhanh</li>
                <li>• Tích hợp dễ dàng</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">📝 Trường thông tin</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Địa chỉ chi tiết</li>
                <li>• Mã bưu điện</li>
                <li>• Tọa độ GPS</li>
                <li>• Tùy chọn địa chỉ</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">⚙️ Tính năng</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• API Organization</li>
                <li>• Loading states</li>
                <li>• Error handling</li>
                <li>• Responsive design</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddressFormDemo;
