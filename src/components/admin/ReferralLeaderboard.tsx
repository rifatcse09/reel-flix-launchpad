import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Award } from "lucide-react";

interface ReferralCode {
  code: string;
  label: string | null;
  revenue?: number;
  use_count?: number;
  creator_name?: string;
  active: boolean;
}

interface ReferralLeaderboardProps {
  referralCodes: ReferralCode[];
}

export const ReferralLeaderboard = ({ referralCodes }: ReferralLeaderboardProps) => {
  // Get top 10 codes by revenue
  const topByRevenue = [...referralCodes]
    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
    .slice(0, 10);

  // Get top 10 codes by uses
  const topByUses = [...referralCodes]
    .sort((a, b) => (b.use_count || 0) - (a.use_count || 0))
    .slice(0, 10);

  const getMedalIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (index === 1) return <Star className="h-4 w-4 text-gray-400" />;
    if (index === 2) return <Award className="h-4 w-4 text-amber-600" />;
    return <span className="text-xs text-muted-foreground">#{index + 1}</span>;
  };

  const getBadgeVariant = (index: number) => {
    if (index === 0) return "default";
    if (index <= 2) return "secondary";
    return "outline";
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Top by Revenue */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Performers by Revenue
          </CardTitle>
          <p className="text-sm text-muted-foreground">Highest revenue generators</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topByRevenue.map((code, index) => (
                <TableRow key={code.code} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {getMedalIcon(index)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{code.code}</span>
                      {code.label && (
                        <span className="text-xs text-muted-foreground">({code.label})</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(index)} className="text-xs">
                      {code.creator_name || 'System'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-green-600 dark:text-green-400">
                    ${(code.revenue || 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top by Usage */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-pink-500" />
            Top Performers by Usage
          </CardTitle>
          <p className="text-sm text-muted-foreground">Most redeemed codes</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead className="text-right">Uses</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topByUses.map((code, index) => (
                <TableRow key={code.code} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {getMedalIcon(index)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{code.code}</span>
                      {code.label && (
                        <span className="text-xs text-muted-foreground">({code.label})</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(index)} className="text-xs">
                      {code.creator_name || 'System'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">
                    {code.use_count || 0}
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
