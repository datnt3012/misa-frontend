import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Package } from "lucide-react";
import { Lock } from "lucide-react";

const Inventory = (props) => {
    const {errorStates, productStockData, inventoryData, loadingStates, lowStockProducts} = props;

    return (
        <>
             {/* Detailed Product Stock Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Chi Tiết Tồn Kho Theo Sản Phẩm</CardTitle>
                <CardDescription>Tình trạng tồn kho của từng sản phẩm</CardDescription>
              </CardHeader>
              <CardContent>
                {errorStates.inventory || loadingStates.inventory ? (
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertDescription>
                      {errorStates.inventory || 'Đang tải dữ liệu tồn kho...'}
                    </AlertDescription>
                  </Alert>
                ) : productStockData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart 
                      data={productStockData} 
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        allowDecimals={false}
                      />
                      <Tooltip 
                        formatter={(value: any, name: string) => [
                          `${value} sản phẩm`, 
                          'Số lượng tồn kho'
                        ]}
                        labelFormatter={(label) => `Sản phẩm: ${label}`}
                      />
                      <Bar 
                        dataKey="stock" 
                        fill="#3b82f6"
                        name="Số lượng tồn kho"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[400px]">
                    <div className="text-center">
                      <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Chưa có dữ liệu sản phẩm</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Product Stock Table */}
            <Card>
              <CardHeader>
                <CardTitle>Bảng Chi Tiết Tồn Kho</CardTitle>
                <CardDescription>Thông tin chi tiết về tồn kho từng sản phẩm</CardDescription>
              </CardHeader>
              <CardContent>
                {errorStates.inventory || loadingStates.inventory ? (
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertDescription>
                      {errorStates.inventory || 'Đang tải dữ liệu tồn kho...'}
                    </AlertDescription>
                  </Alert>
                ) : productStockData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Sản phẩm</th>
                          <th className="text-right p-2">Tồn kho</th>
                          <th className="text-right p-2">Tồn tối thiểu</th>
                          <th className="text-center p-2">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productStockData.map((product, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-2">
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-xs text-gray-500">{product.code}</div>
                              </div>
                            </td>
                            <td className="text-right p-2 font-medium">{product.stock}</td>
                            <td className="text-right p-2 text-gray-500">{product.minStock}</td>
                            <td className="text-center p-2">
                              <span 
                                className="px-2 py-1 rounded-full text-xs font-medium"
                                style={{ 
                                  backgroundColor: `${product.color}20`,
                                  color: product.color
                                }}
                              >
                                {product.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Chưa có dữ liệu sản phẩm</p>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tình Trạng Tồn Kho</CardTitle>
                  <CardDescription>Phân bổ tình trạng hàng hóa</CardDescription>
                </CardHeader>
                <CardContent>
                  {errorStates.inventory || loadingStates.inventory ? (
                    <Alert>
                      <Lock className="h-4 w-4" />
                      <AlertDescription>
                        {errorStates.inventory || 'Đang tải dữ liệu tồn kho...'}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={inventoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={90}
                            dataKey="value"
                            label={({ name, value }) => value > 0 ? `${name}: ${value}%` : ''}
                            labelLine={false}
                          >
                            {inventoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any, name: string) => [`${value}%`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-4 space-y-2">
                        {inventoryData.map((item, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm">{item.name}: {item.value}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sản Phẩm Cần Chú Ý</CardTitle>
                  <CardDescription>Danh sách hàng sắp hết hoặc hết hàng</CardDescription>
                </CardHeader>
                <CardContent>
                  {errorStates.inventory || loadingStates.inventory ? (
                    <Alert>
                      <Lock className="h-4 w-4" />
                      <AlertDescription>
                        {errorStates.inventory || 'Đang tải dữ liệu tồn kho...'}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      {lowStockProducts.length > 0 ? (
                        lowStockProducts.map((product, index) => (
                          <div key={index} className={`flex justify-between items-center p-3 rounded-lg ${
                            product.status === 'Hết hàng' ? 'bg-red-50' : 'bg-orange-50'
                          }`}>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-muted-foreground">Còn lại: {product.stock} sản phẩm</p>
                            </div>
                            <span className={`text-sm font-medium ${
                              product.status === 'Hết hàng' ? 'text-red-600' : 'text-orange-600'
                            }`}>
                              {product.status}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-4">Tất cả sản phẩm đều có đủ hàng</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
        </>
    );
}

export default Inventory;