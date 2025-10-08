import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { ShoppingCart } from "lucide-react";
import { Lock } from "lucide-react";

const Order = (props) => {
    const { errorStates, orderStatus, loadingStates } = props;
    return (
        <Card>
            <CardHeader>
                <CardTitle>Trạng Thái Đơn Hàng</CardTitle>
                <CardDescription>Tổng quan tình trạng xử lý đơn hàng</CardDescription>
            </CardHeader>
            <CardContent>
                {errorStates.orders || loadingStates.orders ? (
                    <Alert>
                        <Lock className="h-4 w-4" />
                        <AlertDescription>
                            {errorStates.orders || 'Đang tải dữ liệu đơn hàng...'}
                        </AlertDescription>
                    </Alert>
                ) : orderStatus.length > 0 && orderStatus.some(item => item.soLuong > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                            data={orderStatus.filter(item => item.soLuong > 0)}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="trangThai"
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis
                                tick={{ fontSize: 12 }}
                                domain={[0, 'dataMax']}
                                tickCount={Math.max(...orderStatus.filter(item => item.soLuong > 0).map(item => item.soLuong)) + 1}
                                allowDecimals={false}
                            />
                            <Tooltip
                                formatter={(value: any, name: string) => [
                                    `${value} đơn hàng`,
                                    'Số lượng'
                                ]}
                                labelFormatter={(label) => `Trạng thái: ${label}`}
                            />
                            <Bar
                                dataKey="soLuong"
                                fill="#3b82f6"
                                name="Số lượng"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-[300px]">
                        <div className="text-center">
                            <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">Chưa có dữ liệu đơn hàng</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Tạo đơn hàng đầu tiên để xem biểu đồ trạng thái
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default Order;