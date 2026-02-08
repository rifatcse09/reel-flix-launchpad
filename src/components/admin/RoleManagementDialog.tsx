import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAllRoles, getRoleLabel, type AdminRole } from "@/hooks/usePermissions";
import { RoleBadge } from "@/components/admin/RoleBadge";

interface RoleManagementDialogProps {
  userId: string;
  userEmail: string;
  onClose: () => void;
  onRolesUpdated: () => void;
}

export function RoleManagementDialog({ userId, userEmail, onClose, onRolesUpdated }: RoleManagementDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentRoles, setCurrentRoles] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const allRoles = getAllRoles();

  useEffect(() => {
    loadCurrentRoles();
  }, [userId]);

  const loadCurrentRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) throw error;
      const roles = data?.map(r => r.role) || [];
      setCurrentRoles(roles);
      // Filter to only show assignable roles (not 'admin', 'moderator', 'user')
      setSelectedRoles(roles.filter(r => allRoles.includes(r as AdminRole)));
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      type AppRole = "admin" | "moderator" | "user" | "super_admin" | "support_agent" | "billing_admin" | "analyst" | "fulfillment_agent";
      // Remove old assignable roles
      const rolesToRemove = currentRoles.filter(r => allRoles.includes(r as AdminRole) && !selectedRoles.includes(r));
      const rolesToAdd = selectedRoles.filter(r => !currentRoles.includes(r));

      for (const role of rolesToRemove) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role as AppRole);
      }

      for (const role of rolesToAdd) {
        await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: role as AppRole });
      }

      // Also ensure 'admin' role is present if any admin role is selected (backward compat)
      if (selectedRoles.length > 0 && !currentRoles.includes('admin')) {
        await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' as const })
          .select();
      } else if (selectedRoles.length === 0 && currentRoles.includes('admin')) {
        // Remove admin role if no granular roles selected
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');
      }

      toast({ title: "Success", description: "Roles updated successfully" });
      onRolesUpdated();
      onClose();
    } catch (error) {
      console.error('Error saving roles:', error);
      toast({ title: "Error", description: "Failed to update roles", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Manage Roles
          </DialogTitle>
          <DialogDescription>
            Assign roles for {userEmail}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {allRoles.map(role => (
                <label
                  key={role}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/30 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedRoles.includes(role)}
                    onCheckedChange={() => handleToggleRole(role)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <RoleBadge role={role} size="sm" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {role === 'super_admin' && 'Full access to all features and settings'}
                      {role === 'support_agent' && 'View users, subscriptions, resend emails (no delete)'}
                      {role === 'billing_admin' && 'Manage refunds, invoices, and payments'}
                      {role === 'analyst' && 'Read-only access to analytics and reports'}
                      {role === 'fulfillment_agent' && 'Mark credentials sent in fulfillment queue'}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Roles
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
