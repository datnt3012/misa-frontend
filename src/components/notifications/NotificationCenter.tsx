import React from "react";
import { Bell, Check, CheckCheck, FileText, Package, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";

export const NotificationCenter = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loadMore, hasMore, isLoading } = useNotifications();


  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <Package className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <FileText className="w-4 h-4 text-red-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Vừa xong';
    } else if (diffInHours < 24) {
      return `${diffInHours} giờ trước`;
    } else {
      return date.toLocaleDateString('vi-VN');
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[450px] mr-4 ml-4">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Thông báo</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={markAllAsRead}
            className="text-xs"
            disabled={unreadCount === 0}
          >
            <CheckCheck className="w-4 h-4 mr-1" />
            Đánh dấu tất cả
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-96">
          <div
            className="h-full overflow-y-auto pr-2"
            onScroll={(event) => handleScroll(event, hasMore, isLoading, loadMore)}
          >
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                Không có thông báo nào
              </div>
            ) : (
              <>
                {notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`flex items-start gap-3 p-3 cursor-pointer ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium break-words">
                          {notification.title}
                        </h4>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))}
                {hasMore && (
                  <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Button variant="ghost" size="sm" onClick={loadMore}>
                        Tải thêm
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const handleScroll = (
  event: React.UIEvent<HTMLDivElement>,
  hasMore: boolean,
  isLoading: boolean,
  loadMore: () => Promise<void>
) => {
  const target = event.currentTarget;
  const nearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 50;
  if (nearBottom && hasMore && !isLoading) {
    loadMore();
  }
};