import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";

interface ReferralCode {
  id: string;
  code: string;
  active: boolean;
  created_at: string;
  expires_at: string | null;
  max_uses: number | null;
  label: string | null;
  discount_amount_cents: number;
  trial_hours: number;
  discount_type: string;
  use_count?: number;
}

const AdminReferralCodes = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/dashboard/profile');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadReferralCodes();
    }
  }, [isAdmin]);

  const loadReferralCodes = async () => {
    try {
      const { data: codes, error } = await supabase
        .from('referral_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get use counts for each code
      const { data: uses } = await supabase
        .from('referral_uses')
        .select('code_id');

      const codesWithCounts = codes?.map(code => ({
        ...code,
        use_count: uses?.filter(use => use.code_id === code.id).length || 0
      })) || [];

      setReferralCodes(codesWithCounts);
    } catch (error) {
      console.error('Error loading referral codes:', error);
    } finally {
      setLoading(false);
    }
  };

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
      <div>
        <h1 className="text-3xl font-bold">Referral Codes Management</h1>
        <p className="text-muted-foreground">View and manage all referral codes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Referral Codes ({referralCodes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Benefits</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Max Uses</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referralCodes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell className="font-mono font-bold">{code.code}</TableCell>
                  <TableCell>{code.label || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={code.active ? 'default' : 'destructive'}>
                      {code.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {(code.discount_type === 'trial' || code.discount_type === 'both') && (
                        <Badge variant="secondary" className="text-xs">
                          {code.trial_hours}h Free Trial
                        </Badge>
                      )}
                      {(code.discount_type === 'discount' || code.discount_type === 'both') && (
                        <Badge variant="secondary" className="text-xs">
                          ${(code.discount_amount_cents / 100).toFixed(2)} Off
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{code.use_count}</TableCell>
                  <TableCell>{code.max_uses || 'Unlimited'}</TableCell>
                  <TableCell>
                    {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell>{new Date(code.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReferralCodes;
