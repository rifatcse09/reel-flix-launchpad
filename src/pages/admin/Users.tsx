import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Eye, KeyRound, Search, ArrowUpDown, UserPlus, Trash2, UserCog, ShieldAlert } from "lucide-react";
import { usePermissions, getAllRoles, getRoleLabel, type AdminRole } from "@/hooks/usePermissions";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { UserDetailsDialog } from "@/components/admin/UserDetailsDialog";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { RoleBadge } from "@/components/admin/RoleBadge";
import { PermissionGuard, useGuardedAction } from "@/components/admin/PermissionGuard";
import { RoleManagementDialog } from "@/components/admin/RoleManagementDialog";
import { FraudRiskBadge } from "@/components/admin/FraudRiskBadge";

interface UserData {
  id: string;
  email: string;
  created_at: string;
  full_name: string | null;
  referral_code: string | null;
  roles: string[];
  status: string;
}

type SortField = 'email' | 'full_name' | 'created_at' | 'status';
type SortDirection = 'asc' | 'desc';

const AdminUsers = () => {
  const { isAnyAdmin, loading: permLoading, hasPermission } = usePermissions();
  const { startImpersonation, isDestructiveBlocked } = useImpersonation();
  const { guardAction } = useGuardedAction();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [roleManageUserId, setRoleManageUserId] = useState<string | null>(null);
  const [roleManageEmail, setRoleManageEmail] = useState<string>('');

  useEffect(() => {
    if (!permLoading && !isAnyAdmin) {
      navigate('/dashboard/profile');
    }
  }, [isAnyAdmin, permLoading, navigate]);

  useEffect(() => {
    if (isAnyAdmin) {
      loadUsers();
    }
  }, [isAnyAdmin]);

  const loadUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Group roles by user
      const rolesByUser = new Map<string, string[]>();
      allRoles?.forEach(r => {
        const existing = rolesByUser.get(r.user_id) || [];
        existing.push(r.role);
        rolesByUser.set(r.user_id, existing);
      });

      const combinedData: UserData[] = profiles?.map(profile => ({
        id: profile.id,
        email: profile.email || 'No email',
        created_at: profile.created_at,
        full_name: profile.full_name,
        referral_code: profile.referral_code,
        roles: rolesByUser.get(profile.id) || [],
        status: 'active',
      })) || [];

      setUsers(combinedData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    await guardAction('send_emails', async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });
      if (error) throw error;
      toast({ title: "Success", description: `Password reset email sent to ${email}` });
    }, { actionLabel: 'send password reset email' });
  };

  const deleteUser = async (userId: string, email: string) => {
    await guardAction('delete_users', async () => {
      if (!confirm(`Are you sure you want to delete user ${email}? This action cannot be undone.`)) return;
      setUpdatingStatus(userId);
      try {
        const { error } = await supabase.functions.invoke('delete-user', { body: { userId } });
        if (error) throw error;
        toast({ title: "Success", description: "User deleted successfully" });
        await loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        toast({ title: "Error", description: "Failed to delete user", variant: "destructive" });
      } finally {
        setUpdatingStatus(null);
      }
    }, { destructive: true, actionLabel: 'delete user' });
  };

  const handleImpersonate = async (user: UserData) => {
    await guardAction('impersonate_users', async () => {
      await startImpersonation(user.id, user.email, user.full_name);
      toast({
        title: "Impersonation Active",
        description: `Now viewing as ${user.email}. Destructive actions are blocked.`,
      });
    }, { actionLabel: 'impersonate user' });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

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

  if (permLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAnyAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users Management</h1>
          <p className="text-muted-foreground">View and manage all users</p>
        </div>
        <div className="flex gap-2">
          <PermissionGuard permission="view_system_audit">
            <Button
              variant="outline"
              onClick={async () => {
                toast({ title: "Running", description: "Fraud scan started…" });
                const { error } = await supabase.functions.invoke('scan-fraud');
                if (error) {
                  toast({ title: "Error", description: "Fraud scan failed.", variant: "destructive" });
                } else {
                  toast({ title: "Complete", description: "Fraud scan finished. Refresh to see results." });
                }
              }}
            >
              <ShieldAlert className="h-4 w-4 mr-2" />
              Scan Fraud
            </Button>
          </PermissionGuard>
          <PermissionGuard permission="edit_users">
            <Button onClick={() => setShowCreateDialog(true)} variant="cta">
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </PermissionGuard>
        </div>
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
                    Email <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('full_name')}>
                    Full Name <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Referral Code</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('created_at')}>
                    Joined <ArrowUpDown className="ml-2 h-4 w-4" />
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
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <FraudRiskBadge userId={user.id} showDetails />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length > 0 ? (
                          user.roles
                            .filter(r => r !== 'admin' || !user.roles.includes('super_admin'))
                            .map(r => <RoleBadge key={r} role={r} size="sm" />)
                        ) : (
                          <Badge variant="outline" className="text-xs">User</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setSelectedUserId(user.id)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View profile & timeline</TooltipContent>
                          </Tooltip>

                          <PermissionGuard permission="send_emails">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => resetPassword(user.email)}>
                                  <KeyRound className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Send password reset email</TooltipContent>
                            </Tooltip>
                          </PermissionGuard>

                          <PermissionGuard permission="manage_roles">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setRoleManageUserId(user.id);
                                    setRoleManageEmail(user.email);
                                  }}
                                >
                                  <UserCog className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Manage roles</TooltipContent>
                            </Tooltip>
                          </PermissionGuard>

                          <PermissionGuard permission="impersonate_users">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleImpersonate(user)}
                                  className="text-amber-400 hover:text-amber-300"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Impersonate user</TooltipContent>
                            </Tooltip>
                          </PermissionGuard>

                          <PermissionGuard permission="delete_users" destructive>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteUser(user.id, user.email)}
                                  disabled={updatingStatus === user.id}
                                  className="text-destructive hover:text-destructive/80"
                                >
                                  {updatingStatus === user.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete user</TooltipContent>
                            </Tooltip>
                          </PermissionGuard>
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

      {roleManageUserId && (
        <RoleManagementDialog
          userId={roleManageUserId}
          userEmail={roleManageEmail}
          onClose={() => setRoleManageUserId(null)}
          onRolesUpdated={loadUsers}
        />
      )}
    </div>
  );
};

export default AdminUsers;
