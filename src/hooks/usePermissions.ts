import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminRole = 'super_admin' | 'admin' | 'support_agent' | 'billing_admin' | 'analyst' | 'fulfillment_agent';

export type Permission =
  | 'view_users'
  | 'edit_users'
  | 'delete_users'
  | 'manage_roles'
  | 'view_subscriptions'
  | 'edit_subscriptions'
  | 'view_payments'
  | 'manage_payments'
  | 'refund_payments'
  | 'view_invoices'
  | 'edit_invoices'
  | 'view_fulfillment'
  | 'manage_fulfillment'
  | 'view_analytics'
  | 'view_referrals'
  | 'manage_referrals'
  | 'view_notifications'
  | 'manage_notifications'
  | 'view_settings'
  | 'manage_settings'
  | 'view_system_audit'
  | 'view_system_health'
  | 'send_emails'
  | 'impersonate_users'
  | 'simulate_payments'
  | 'export_data';

const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: [
    'view_users', 'edit_users', 'delete_users', 'manage_roles',
    'view_subscriptions', 'edit_subscriptions',
    'view_payments', 'manage_payments', 'refund_payments',
    'view_invoices', 'edit_invoices',
    'view_fulfillment', 'manage_fulfillment',
    'view_analytics',
    'view_referrals', 'manage_referrals',
    'view_notifications', 'manage_notifications',
    'view_settings', 'manage_settings',
    'view_system_audit', 'view_system_health',
    'send_emails', 'impersonate_users', 'simulate_payments', 'export_data',
  ],
  admin: [
    'view_users', 'edit_users', 'delete_users', 'manage_roles',
    'view_subscriptions', 'edit_subscriptions',
    'view_payments', 'manage_payments', 'refund_payments',
    'view_invoices', 'edit_invoices',
    'view_fulfillment', 'manage_fulfillment',
    'view_analytics',
    'view_referrals', 'manage_referrals',
    'view_notifications', 'manage_notifications',
    'view_settings', 'manage_settings',
    'view_system_audit', 'view_system_health',
    'send_emails', 'impersonate_users', 'simulate_payments', 'export_data',
  ],
  support_agent: [
    'view_users',
    'view_subscriptions',
    'view_payments',
    'view_invoices',
    'view_fulfillment',
    'view_referrals',
    'view_notifications',
    'send_emails',
    'view_system_health',
  ],
  billing_admin: [
    'view_users',
    'view_subscriptions', 'edit_subscriptions',
    'view_payments', 'manage_payments', 'refund_payments',
    'view_invoices', 'edit_invoices',
    'view_fulfillment',
    'view_analytics',
    'view_referrals',
    'simulate_payments',
  ],
  analyst: [
    'view_users',
    'view_subscriptions',
    'view_payments',
    'view_invoices',
    'view_fulfillment',
    'view_analytics',
    'view_referrals',
    'view_system_health',
    'export_data',
  ],
  fulfillment_agent: [
    'view_users',
    'view_subscriptions',
    'view_invoices',
    'view_fulfillment', 'manage_fulfillment',
    'send_emails',
  ],
};

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  support_agent: 'Support Agent',
  billing_admin: 'Billing Admin',
  analyst: 'Analyst',
  fulfillment_agent: 'Fulfillment',
};

const ROLE_COLORS: Record<AdminRole, string> = {
  super_admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  admin: 'bg-primary/20 text-primary border-primary/30',
  support_agent: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  billing_admin: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  analyst: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  fulfillment_agent: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export function getRoleLabel(role: AdminRole | string): string {
  return ROLE_LABELS[role as AdminRole] || role;
}

export function getRoleColor(role: AdminRole | string): string {
  return ROLE_COLORS[role as AdminRole] || 'bg-muted text-muted-foreground';
}

export function getRolePermissions(role: AdminRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function getAllRoles(): AdminRole[] {
  return ['super_admin', 'support_agent', 'billing_admin', 'analyst', 'fulfillment_agent'];
}

export const usePermissions = () => {
  const [role, setRole] = useState<AdminRole | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAnyAdmin, setIsAnyAdmin] = useState(false);

  useEffect(() => {
    loadRole();
  }, []);

  const loadRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading roles:', error);
        setLoading(false);
        return;
      }

      if (!roles || roles.length === 0) {
        setLoading(false);
        return;
      }

      // Pick highest-priority role
      const rolePriority: AdminRole[] = ['super_admin', 'admin', 'billing_admin', 'support_agent', 'fulfillment_agent', 'analyst'];
      const userRoles = roles.map(r => r.role as AdminRole);
      const highestRole = rolePriority.find(r => userRoles.includes(r)) || null;

      if (highestRole) {
        setRole(highestRole);
        setPermissions(ROLE_PERMISSIONS[highestRole] || []);
        setIsAnyAdmin(true);
      }
    } catch (error) {
      console.error('Error in loadRole:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    return permissions.includes(permission);
  };

  const canAccessPage = (page: string): boolean => {
    const pagePermissions: Record<string, Permission> = {
      '/admin/overview': 'view_analytics',
      '/admin/users': 'view_users',
      '/admin/payments-queue': 'view_payments',
      '/admin/fulfillment-queue': 'view_fulfillment',
      '/admin/subscriptions': 'view_subscriptions',
      '/admin/payments': 'view_payments',
      '/admin/referrals': 'view_referrals',
      '/admin/notifications': 'view_notifications',
      '/admin/analytics': 'view_analytics',
      '/admin/system-audit': 'view_system_audit',
      '/admin/system-health': 'view_system_health',
      '/admin/service-status': 'view_system_health',
      '/admin/incidents': 'view_system_health',
      '/admin/changes': 'view_system_health',
      '/admin/backup-restore': 'view_system_health',
      '/admin/disaster-recovery': 'view_system_health',
      '/admin/sla-monitoring': 'view_system_health',
      '/admin/staff-activity': 'view_system_audit',
      '/admin/runbooks': 'view_system_health',
      '/admin/elevated-permissions': 'manage_roles',
      '/admin/data-lifecycle': 'manage_settings',
      '/admin/settings': 'view_settings',
    };

    const requiredPermission = pagePermissions[page];
    if (!requiredPermission) return isAnyAdmin;
    return hasPermission(requiredPermission);
  };

  return {
    role,
    permissions,
    loading,
    isAnyAdmin,
    hasPermission,
    canAccessPage,
  };
};
