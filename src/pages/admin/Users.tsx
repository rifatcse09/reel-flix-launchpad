import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, ShieldOff, Eye, UserX, UserCheck, KeyRound, Search, ArrowUpDown, UserPlus, Trash2 } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { UserDetailsDialog } from "@/components/admin/UserDetailsDialog";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";

interface UserData {
  id: string;
  email: string;
  created_at: string;
  full_name: string | null;
  referral_code: string | null;
  isAdmin: boolean;
  status: string;
}

type SortField = 'email' | 'full_name' | 'created_at' | 'status';
type SortDirection = 'asc' | 'desc';

const AdminUsers = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/dashboard/profile');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      // Get profiles with email
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get admin roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

      // Combine data
      const combinedData: UserData[] = profiles?.map(profile => ({
        id: profile.id,
        email: profile.email || 'No email',
        created_at: profile.created_at,
        full_name: profile.full_name,
        referral_code: profile.referral_code,
        isAdmin: adminUserIds.has(profile.id),
        status: 'active', // Default status, you can add a status column to profiles table
      })) || [];

      setUsers(combinedData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminRole = async (userId: string, currentlyAdmin: boolean) => {
    setUpdatingRole(userId);
    try {
      if (currentlyAdmin) {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;

        toast({
          title: "Success",
          description: "Admin role removed",
        });
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });

        if (error) throw error;

        toast({
          title: "Success",
          description: "User promoted to admin",
        });
      }

      await loadUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update admin role",
        variant: "destructive",
      });
    } finally {
      setUpdatingRole(null);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Password reset email sent to ${email}`,
      });
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast({
        title: "Error",
        description: "Failed to send password reset email",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete user ${email}? This action cannot be undone.`)) {
      return;
    }

    setUpdatingStatus(userId);
    try {
      // Delete trial IP usage records
      await supabase
        .from('trial_ip_usage')
        .delete()
        .eq('user_id', userId);

      // Delete user sessions
      await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', userId);

      // Delete profile (this will cascade delete related data)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      // Delete auth user using admin API
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) {
        console.error('Error deleting auth user:', authError);
        // Don't throw - profile is already deleted
      }

      toast({
        title: "Success",
        description: "User deleted successfully",
      });

      await loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort users
  const filteredUsers = users
    .filter(user => {
      const matchesSearch = 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.referral_code?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      if (sortField === 'created_at') {
        return direction * (new Date(aVal).getTime() - new Date(bVal).getTime());
      }
      
      return direction * String(aVal).localeCompare(String(bVal));
    });

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
          <h1 className="text-3xl font-bold">Users Management</h1>
          <p className="text-muted-foreground">View and manage all users</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} variant="cta">
          <UserPlus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users ({filteredUsers.length})</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, name, or referral code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 focus:border-primary focus:ring-primary"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('email')}>
                    Email
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('full_name')}>
                    Full Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Referral Code</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('status')}>
                    Status
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('created_at')}>
                    Joined
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {searchQuery || statusFilter !== 'all' ? "No users found matching your filters" : "No users found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.full_name || '-'}</TableCell>
                    <TableCell>
                      {user.referral_code ? (
                        <Badge variant="secondary">{user.referral_code}</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {user.isAdmin ? (
                              <Badge variant="default" className="gap-1 cursor-help">
                                <Shield className="h-3 w-3" />
                                Admin
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="cursor-help">User</Badge>
                            )}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{user.isAdmin ? "Full admin privileges - Can manage all users and settings" : "Standard user - Limited to own profile and subscriptions"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          user.status === 'active' ? 'outline' : 
                          user.status === 'suspended' ? 'secondary' : 
                          'secondary'
                        }
                        className={`gap-1 ${
                          user.status === 'active' ? 'border-primary text-primary' :
                          user.status === 'suspended' ? 'border-warning text-warning' :
                          'border-destructive text-destructive'
                        }`}
                      >
                        {user.status === 'active' && '🟢'}
                        {user.status === 'suspended' && '🟠'}
                        {user.status === 'banned' && '🔴'}
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <div className="flex items-center justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedUserId(user.id)}
                                className="hover:shadow-[0_0_8px_rgba(255,0,128,0.4)] transition-all"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View user profile and activity</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => resetPassword(user.email)}
                                className="hover:shadow-[0_0_8px_rgba(255,0,128,0.4)] transition-all"
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Send password reset email</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={user.isAdmin ? "default" : "default"}
                                size="sm"
                                onClick={() => toggleAdminRole(user.id, user.isAdmin)}
                                disabled={updatingRole === user.id}
                                className={`hover:shadow-[0_0_8px_rgba(255,0,128,0.4)] transition-all ${
                                  user.isAdmin ? "bg-primary/20 hover:bg-primary/30" : ""
                                }`}
                              >
                                {updatingRole === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : user.isAdmin ? (
                                  <ShieldOff className="h-4 w-4" />
                                ) : (
                                  <Shield className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {user.isAdmin ? "Remove admin privileges" : "Grant admin access"}
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteUser(user.id, user.email)}
                                disabled={updatingStatus === user.id}
                                className="text-primary hover:text-accent hover:bg-primary/10 hover:shadow-[0_0_8px_rgba(255,0,128,0.4)] transition-all"
                              >
                                {updatingStatus === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Permanently delete user account</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedUserId && (
        <UserDetailsDialog
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUserUpdated={loadUsers}
        />
      )}

      {showCreateDialog && (
        <CreateUserDialog
          onClose={() => setShowCreateDialog(false)}
          onUserCreated={loadUsers}
        />
      )}
    </div>
  );
};

export default AdminUsers;
