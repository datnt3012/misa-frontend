import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/utils";

const Revenue = (props) => {
    const { errorStates, revenueData, loadingStates } = props;

    return (
        <>
            {errorStates.revenue || loadingStates.revenue ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Biểu Đồ Doanh Thu 6 Tháng Gần Nhất</CardTitle>
                        <CardDescription>Theo dõi xu hướng doanh thu theo tháng</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Alert>
                            <Lock className="h-4 w-4" />
                            <AlertDescription>
                                {errorStates.revenue || 'Đang tải dữ liệu doanh thu...'}
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Biểu Đồ Doanh Thu 6 Tháng Gần Nhất</CardTitle>
                        <CardDescription>Theo dõi xu hướng doanh thu theo tháng</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="month"
                                    tick={{ fontSize: 12 }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis
                                    tickFormatter={(value) => {
                                        if (value >= 1000000) {
                                            return `${(value / 1000000).toFixed(1)}M`;
                                        } else if (value >= 1000) {
                                            return `${(value / 1000).toFixed(0)}K`;
                                        } else {
                                            return value.toString();
                                        }
                                    }}
                                    tick={{ fontSize: 12 }}
                                />
                                <Tooltip
                                    formatter={(value: any, name: string) => [
                                        formatCurrency(value),
                                        name === 'revenue' ? 'Doanh thu' : 'Lợi nhuận'
                                    ]}
                                    labelFormatter={(label) => `Tháng: ${label}`}
                                />
                                <Bar dataKey="revenue" fill="#22c55e" name="Doanh thu" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}
        </>
    )
}

export default Revenue;