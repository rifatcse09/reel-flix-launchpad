import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Trash2 } from "lucide-react";

export interface ReferralCode {
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
  created_by: string | null;
  plan_type: string;
  use_count?: number;
  click_count?: number;
  revenue?: number;
  creator_name?: string;
}

interface ReferralCodesTableProps {
  codes: ReferralCode[];
  onViewDetails: (code: ReferralCode) => void;
  onDeleteCode: (codeId: string, codeName: string) => void;
}

export const ReferralCodesTable = ({ codes, onViewDetails, onDeleteCode }: ReferralCodesTableProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Label</TableHead>
          <TableHead>Creator</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Benefits</TableHead>
          <TableHead>Clicks</TableHead>
          <TableHead>Uses</TableHead>
          <TableHead>Revenue</TableHead>
          <TableHead>Max Uses</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {codes.map((code) => (
          <TableRow key={code.id} className="hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
            <TableCell className="font-mono font-bold">{code.code}</TableCell>
            <TableCell>{code.label || '-'}</TableCell>
            <TableCell>
              <Badge variant="outline">{code.creator_name}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant={code.active ? 'default' : 'destructive'}>
                {code.active ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="text-sm">
                ${(code.discount_amount_cents / 100).toFixed(0)} off{' '}
                {code.plan_type === 'one-year'
                  ? 'one-year'
                  : code.plan_type === 'six-months'
                  ? 'six-month'
                  : code.plan_type === 'one-month'
                  ? 'one-month'
                  : 'any'}{' '}
                subscription
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="font-mono">
                {code.click_count || 0}
              </Badge>
            </TableCell>
            <TableCell>{code.use_count}</TableCell>
            <TableCell className="font-semibold">${code.revenue?.toFixed(2) || '0.00'}</TableCell>
            <TableCell>{code.max_uses || 'Unlimited'}</TableCell>
            <TableCell>
              {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : 'Never'}
            </TableCell>
            <TableCell>{new Date(code.created_at).toLocaleDateString()}</TableCell>
            <TableCell className="text-right">
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => onViewDetails(code)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onDeleteCode(code.id, code.code)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
