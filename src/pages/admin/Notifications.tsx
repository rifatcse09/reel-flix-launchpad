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
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Bell, AlertCircle, Info, MessageSquare, Eye, Trash2 } from "lucide-react";
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
}

const AdminNotifications = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'scheduled'>('all');
  const [sortByReads, setSortByReads] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("announcement");
  const [targetAudience, setTargetAudience] = useState("all");
  const [priority, setPriority] = useState("normal");
  const [scheduledFor, setScheduledFor] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isActive, setIsActive] = useState(true);

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
        sent_at: !scheduledFor ? new Date().toISOString() : null
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
      setType("announcement");
      setTargetAudience("all");
      setPriority("normal");
      setScheduledFor("");
      setExpiresAt("");
      setIsActive(true);
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
      case 'announcement': return <MessageSquare className="h-4 w-4" />;
      case 'alert': return <AlertCircle className="h-4 w-4" />;
      case 'warning': return <AlertCircle className="h-4 w-4" />;
      case 'info': return <Info className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'announcement': return 'default';
      case 'alert': return 'destructive';
      case 'warning': return 'secondary';
      case 'info': return 'outline';
      default: return 'default';
    }
  };

  const filteredNotifications = notifications
    .filter(notif => {
      const matchesType = filterType === 'all' || notif.type === filterType;
      const matchesStatus = 
        filterStatus === 'all' ||
        (filterStatus === 'sent' && notif.sent_at) ||
        (filterStatus === 'scheduled' && !notif.sent_at && notif.scheduled_for);
      return matchesType && matchesStatus;
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
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
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
                  <Label htmlFor="type">Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="alert">Alert</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
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

              <div className="space-y-2">
                <Label htmlFor="target">Target Audience</Label>
                <Select value={targetAudience} onValueChange={setTargetAudience}>
                  <SelectTrigger id="target">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="active_subscribers">Active Subscribers</SelectItem>
                    <SelectItem value="expired_subscribers">Expired Subscribers</SelectItem>
                  </SelectContent>
                </Select>
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
                  <Label htmlFor="expires">Expires At (Optional)</Label>
                  <Input
                    id="expires"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
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
          </CardContent>
        </Card>

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
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sentNotifications}</div>
          </CardContent>
        </Card>

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
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledNotifications}</div>
          </CardContent>
        </Card>

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
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReads}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="announcement">Announcements</SelectItem>
            <SelectItem value="alert">Alerts</SelectItem>
            <SelectItem value="warning">Warnings</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Notifications ({filteredNotifications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reads</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotifications.map((notif) => (
                <TableRow key={notif.id}>
                  <TableCell>
                    <Badge variant={getTypeColor(notif.type) as any} className="gap-1">
                      {getTypeIcon(notif.type)}
                      {notif.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{notif.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {notif.target_audience.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={notif.priority === 'urgent' ? 'destructive' : 'secondary'}>
                      {notif.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {notif.sent_at ? (
                      <Badge variant="default">Sent</Badge>
                    ) : notif.scheduled_for ? (
                      <Badge variant="secondary">Scheduled</Badge>
                    ) : (
                      <Badge variant="outline">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell>{notif.read_count || 0}</TableCell>
                  <TableCell>{new Date(notif.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(notif.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminNotifications;