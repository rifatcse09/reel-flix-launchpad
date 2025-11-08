import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Bell, AlertCircle, Info, MessageSquare, Eye, Trash2, Calendar, Send, Mail, Smartphone, Monitor, ShieldAlert, Megaphone, User, Wrench, RefreshCw, Edit, Pause, Play, TrendingUp, History, BarChart3 } from "lucide-react";
import { CTRTrendChart } from "@/components/admin/CTRTrendChart";
import { EngagementTimeline } from "@/components/admin/EngagementTimeline";
import { RecurrenceHistoryModal } from "@/components/admin/RecurrenceHistoryModal";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  target_audience: string;
  priority: string;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  read_count?: number;
  channel?: string;
  clicks?: number;
  click_url?: string;
  recurrence_type?: string;
  template_id?: string;
}

const AdminNotifications = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'scheduled'>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterAudience, setFilterAudience] = useState<string>('all');
  const [sortByReads, setSortByReads] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("marketing");
  const [targetAudience, setTargetAudience] = useState("all");
  const [priority, setPriority] = useState("normal");
  const [scheduledFor, setScheduledFor] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [channel, setChannel] = useState("in_app");
  const [clickUrl, setClickUrl] = useState("");
  const [recurrenceType, setRecurrenceType] = useState<string>("");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/dashboard/profile');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadNotifications();
    }
  }, [isAdmin]);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get read counts
      const { data: reads } = await supabase
        .from('notification_reads')
        .select('notification_id');

      const notificationsWithReads = data?.map(notif => ({
        ...notif,
        read_count: reads?.filter(r => r.notification_id === notif.id).length || 0
      })) || [];

      setNotifications(notificationsWithReads);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const notificationData: any = {
        title,
        message,
        type,
        target_audience: targetAudience,
        priority,
        scheduled_for: scheduledFor || null,
        expires_at: expiresAt || null,
        is_active: isActive,
        created_by: user?.id,
        sent_at: !scheduledFor ? new Date().toISOString() : null,
        channel: channel,
        click_url: clickUrl || null,
        recurrence_type: recurrenceType || null
      };

      const { error } = await supabase
        .from('notifications')
        .insert(notificationData);

      if (error) throw error;

      toast({
        title: "Success",
        description: scheduledFor ? "Notification scheduled successfully" : "Notification sent successfully"
      });

      // Reset form
      setTitle("");
      setMessage("");
      setType("marketing");
      setTargetAudience("all");
      setPriority("normal");
      setScheduledFor("");
      setExpiresAt("");
      setIsActive(true);
      setChannel("in_app");
      setClickUrl("");
      setRecurrenceType("");
      setDialogOpen(false);

      await loadNotifications();
    } catch (error: any) {
      console.error('Error creating notification:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create notification",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notification deleted successfully"
      });

      await loadNotifications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete notification",
        variant: "destructive"
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'system': return <ShieldAlert className="h-4 w-4" />;
      case 'marketing': return <Megaphone className="h-4 w-4" />;
      case 'account': return <User className="h-4 w-4" />;
      case 'maintenance': return <Wrench className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'system': return 'destructive';
      case 'marketing': return 'default';
      case 'account': return 'secondary';
      case 'maintenance': return 'outline';
      default: return 'default';
    }
  };

  const getStatusBadge = (notif: Notification) => {
    if (notif.sent_at) {
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">🟢 Sent</Badge>;
    } else if (notif.scheduled_for) {
      return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">🟠 Scheduled</Badge>;
    } else {
      return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">🔴 Failed</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'low':
        return <Badge variant="outline" className="text-muted-foreground">Low</Badge>;
      case 'normal':
        return <Badge variant="secondary">Normal</Badge>;
      case 'high':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">High</Badge>;
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getChannelIcon = (channel?: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <Smartphone className="h-4 w-4" />;
      case 'in_app':
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getRecurrenceIcon = (recurrence?: string) => {
    if (!recurrence) return null;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <RefreshCw className="h-4 w-4 text-blue-500" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Recurs: {recurrence}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const filteredNotifications = notifications
    .filter(notif => {
      const matchesType = filterType === 'all' || notif.type === filterType;
      const matchesStatus = 
        filterStatus === 'all' ||
        (filterStatus === 'sent' && notif.sent_at) ||
        (filterStatus === 'scheduled' && !notif.sent_at && notif.scheduled_for);
      const matchesChannel = filterChannel === 'all' || notif.channel === filterChannel;
      const matchesAudience = filterAudience === 'all' || notif.target_audience === filterAudience;
      return matchesType && matchesStatus && matchesChannel && matchesAudience;
    })
    .sort((a, b) => {
      if (sortByReads) {
        return (b.read_count || 0) - (a.read_count || 0);
      }
      return 0;
    });

  const totalNotifications = notifications.length;
  const sentNotifications = notifications.filter(n => n.sent_at).length;
  const scheduledNotifications = notifications.filter(n => !n.sent_at && n.scheduled_for).length;
  const totalReads = notifications.reduce((sum, n) => sum + (n.read_count || 0), 0);
  const totalClicks = notifications.reduce((sum, n) => sum + (n.clicks || 0), 0);
  
  // Analytics
  const mostReadNotification = notifications.reduce((max, n) => 
    (n.read_count || 0) > (max.read_count || 0) ? n : max
  , notifications[0]);
  
  const averageReadRate = sentNotifications > 0 
    ? ((totalReads / sentNotifications) * 100).toFixed(1) 
    : '0';
    
  const averageCTR = totalReads > 0 
    ? ((totalClicks / totalReads) * 100).toFixed(1) 
    : '0';

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications & Messaging</h1>
          <p className="text-muted-foreground">Send announcements and alerts to users</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Template Library
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="cta">
              <Plus className="h-4 w-4 mr-2" />
              Create Notification
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Notification</DialogTitle>
              <DialogDescription>
                Send a notification or announcement to your users
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Notification title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Notification message"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Notification Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="system">🛡️ System Alert</SelectItem>
                      <SelectItem value="marketing">📢 Marketing</SelectItem>
                      <SelectItem value="account">👤 Account</SelectItem>
                      <SelectItem value="maintenance">🔧 Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="channel">Channel</Label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger id="channel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="in_app">📱 In-App</SelectItem>
                      <SelectItem value="email">📧 Email</SelectItem>
                      <SelectItem value="sms">💬 SMS (Coming Soon)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target">Target Audience</Label>
                  <Select value={targetAudience} onValueChange={setTargetAudience}>
                    <SelectTrigger id="target">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="all">👥 All Users</SelectItem>
                      <SelectItem value="active_subscribers">✅ Active Subscribers</SelectItem>
                      <SelectItem value="trial_users">🎯 Trial Users</SelectItem>
                      <SelectItem value="expired_subscribers">⏰ Expired Subscribers</SelectItem>
                      <SelectItem value="lapsed_users">💤 Lapsed Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduled">Schedule For (Optional)</Label>
                  <Input
                    id="scheduled"
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurrence">Recurrence (Optional)</Label>
                  <Select value={recurrenceType || "none"} onValueChange={(value) => setRecurrenceType(value === "none" ? "" : value)}>
                    <SelectTrigger id="recurrence">
                      <SelectValue placeholder="One-time" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="none">One-time</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expires">Expires At (Optional)</Label>
                  <Input
                    id="expires"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clickUrl">Click URL (Optional)</Label>
                  <Input
                    id="clickUrl"
                    type="url"
                    value={clickUrl}
                    onChange={(e) => setClickUrl(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  scheduledFor ? "Schedule" : "Send Now"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{sentNotifications}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{scheduledNotifications}</div>
          </CardContent>
        </Card>
        
        <CTRTrendChart notifications={notifications} />
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">{totalReads}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Performer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium truncate">{mostReadNotification?.title || 'None'}</div>
            <div className="text-xs text-muted-foreground">
              {mostReadNotification && mostReadNotification.read_count ? (
                <>
                  {((mostReadNotification.clicks || 0) / mostReadNotification.read_count * 100).toFixed(1)}% CTR this week
                </>
              ) : (
                '0 reads'
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <TooltipProvider>
        <div className="grid gap-4 md:grid-cols-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  setFilterStatus('all');
                  setFilterType('all');
                  setSortByReads(false);
                  toast({
                    title: "Filter Applied",
                    description: "Showing all notifications",
                  });
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalNotifications}</div>
                  <p className="text-xs text-muted-foreground mt-1">All notification records</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>🔔 Total number of notifications created</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  setFilterStatus('sent');
                  setFilterType('all');
                  setSortByReads(false);
                  toast({
                    title: "Filter Applied",
                    description: "Showing sent notifications only",
                  });
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sent</CardTitle>
                  <Send className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sentNotifications}</div>
                  <p className="text-xs text-muted-foreground mt-1">{averageReadRate}% avg read rate</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>📨 Successfully sent notifications</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  setFilterStatus('scheduled');
                  setFilterType('all');
                  setSortByReads(false);
                  toast({
                    title: "Filter Applied",
                    description: "Showing scheduled notifications only",
                  });
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
                  <Calendar className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{scheduledNotifications}</div>
                  <p className="text-xs text-muted-foreground mt-1">Pending delivery</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>⏰ Notifications scheduled for future delivery</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  setFilterStatus('all');
                  setFilterType('all');
                  setSortByReads(true);
                  toast({
                    title: "Sorted by Reads",
                    description: "Showing most read notifications first",
                  });
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Reads</CardTitle>
                  <Eye className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalReads}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {mostReadNotification ? `Top: ${mostReadNotification.read_count || 0} reads` : 'No reads yet'}
                  </p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>👁️ Total views across all notifications</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Filter Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="system">System Alerts</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="account">Account</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={filterChannel} onValueChange={setFilterChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="in_app">In-App</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={filterAudience} onValueChange={setFilterAudience}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">All Audiences</SelectItem>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="active_subscribers">Active Subscribers</SelectItem>
                  <SelectItem value="trial_users">Trial Users</SelectItem>
                  <SelectItem value="expired_subscribers">Expired Subscribers</SelectItem>
                  <SelectItem value="lapsed_users">Lapsed Users</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as 'all' | 'sent' | 'scheduled')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Notifications ({filteredNotifications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first broadcast to engage users and keep them informed.
              </p>
              <Button variant="cta" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Notification
              </Button>
            </div>
          ) : (
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Recurrence</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>CTR</TableHead>
                <TableHead>Reads</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotifications.map((notif) => {
                const ctr = notif.read_count && notif.read_count > 0 
                  ? ((notif.clicks || 0) / notif.read_count * 100).toFixed(1) 
                  : '0';
                
                return (
                  <TableRow key={notif.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={getTypeColor(notif.type) as any} className="gap-1">
                          {getTypeIcon(notif.type)}
                          {notif.type}
                        </Badge>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {getChannelIcon(notif.channel)}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Channel: {notif.channel || 'in_app'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="font-medium cursor-help">
                              {notif.title}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-2">
                              <div className="font-semibold text-sm">{notif.title}</div>
                              <div className="text-xs">{notif.message}</div>
                              <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                                <div><strong>Sent:</strong> {notif.read_count || 0}</div>
                                <div><strong>Reads:</strong> {notif.read_count || 0}</div>
                                <div><strong>Clicks:</strong> {notif.clicks || 0}</div>
                                <div><strong>CTR:</strong> {ctr}%</div>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {notif.target_audience.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {notif.recurrence_type ? (
                          <>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => {
                                      setSelectedNotification(notif);
                                      setHistoryDialogOpen(true);
                                    }}
                                  >
                                    <RefreshCw className="h-4 w-4 text-blue-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View recurrence history</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Badge variant="outline" className="text-xs">
                              {notif.recurrence_type}
                            </Badge>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-xs">One-time</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPriorityBadge(notif.priority)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(notif)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {notif.clicks !== undefined && notif.clicks > 0 ? (
                          <>
                            <div className="font-medium text-green-500">
                              {ctr}%
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div 
                                className="bg-green-500 h-1.5 rounded-full transition-all" 
                                style={{ width: `${Math.min(parseFloat(ctr), 100)}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{notif.read_count || 0}</span>
                        </div>
                        {notif.read_count && notif.read_count > 0 && (
                          <div className="mt-1">
                            <EngagementTimeline 
                              notificationId={notif.id} 
                              reads={notif.read_count} 
                            />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit notification</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        {notif.recurrence_type && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedNotification(notif);
                                    setHistoryDialogOpen(true);
                                  }}
                                >
                                  <History className="h-4 w-4 text-blue-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View history</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(notif.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete notification</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Template Library Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notification Templates</DialogTitle>
            <DialogDescription>
              Reusable templates for common notifications
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Welcome Message</CardTitle>
                    <p className="text-sm text-muted-foreground">Sent to new subscribers</p>
                  </div>
                  <Badge>Marketing</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  "Welcome to ReelFlix! Get started with our exclusive content library..."
                </p>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline">Use Template</Button>
                  <Button size="sm" variant="ghost">Edit</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Payment Reminder</CardTitle>
                    <p className="text-sm text-muted-foreground">Subscription expiring soon</p>
                  </div>
                  <Badge variant="destructive">System</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  "Your subscription expires in 3 days. Renew now to continue enjoying..."
                </p>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline">Use Template</Button>
                  <Button size="sm" variant="ghost">Edit</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">New Release</CardTitle>
                    <p className="text-sm text-muted-foreground">Weekly content update</p>
                  </div>
                  <Badge className="bg-blue-500">Marketing</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  "New shows just dropped! Check out this week's fresh content..."
                </p>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline">Use Template</Button>
                  <Button size="sm" variant="ghost">Edit</Button>
                </div>
              </CardContent>
            </Card>

            <Button className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create New Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recurrence History Modal */}
      <RecurrenceHistoryModal
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        notificationTitle={selectedNotification?.title || ''}
        recurrenceType={selectedNotification?.recurrence_type}
      />
    </div>
  );
};

export default AdminNotifications;