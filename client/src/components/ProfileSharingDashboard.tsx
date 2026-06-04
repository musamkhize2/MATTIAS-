import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Share2, Trash2, Edit2, Clock, Users, Lock, Eye, Zap } from 'lucide-react';

interface ProfileShare {
  id: string;
  profileId: string;
  sharedWithUserId?: number;
  sharedWithTeamId?: number;
  role: 'viewer' | 'executor' | 'editor' | 'admin';
  sharedAt: string;
  expiresAt?: string;
  createdAt: string;
}

interface ProfileSharingDashboardProps {
  profileId: string;
  profileName: string;
  shares: ProfileShare[];
  onShare?: (userId: number, role: string, expiresAt?: string) => void;
  onRevokeShare?: (shareId: string) => void;
  onUpdateRole?: (shareId: string, role: string) => void;
}

const roleDescriptions: Record<string, { icon: React.ReactNode; description: string; color: string }> = {
  viewer: {
    icon: <Eye className="w-4 h-4" />,
    description: 'Can view profile details and analytics',
    color: 'bg-blue-50 border-blue-200',
  },
  executor: {
    icon: <Zap className="w-4 h-4" />,
    description: 'Can view, execute profiles, and view results',
    color: 'bg-green-50 border-green-200',
  },
  editor: {
    icon: <Edit2 className="w-4 h-4" />,
    description: 'Can view, execute, and modify commands',
    color: 'bg-yellow-50 border-yellow-200',
  },
  admin: {
    icon: <Lock className="w-4 h-4" />,
    description: 'Full access including sharing and deletion',
    color: 'bg-red-50 border-red-200',
  },
};

export const ProfileSharingDashboard: React.FC<ProfileSharingDashboardProps> = ({
  profileId,
  profileName,
  shares,
  onShare,
  onRevokeShare,
  onUpdateRole,
}) => {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('viewer');
  const [expirationDays, setExpirationDays] = useState('30');

  const activeShares = shares.filter((s) => {
    if (!s.expiresAt) return true;
    return new Date(s.expiresAt) > new Date();
  });

  const expiredShares = shares.filter((s) => s.expiresAt && new Date(s.expiresAt) <= new Date());

  const handleShare = () => {
    if (!shareEmail) return;

    const expiresAt =
      expirationDays !== 'never'
        ? new Date(Date.now() + parseInt(expirationDays) * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

    onShare?.(parseInt(shareEmail), selectedRole, expiresAt);

    setShareEmail('');
    setSelectedRole('viewer');
    setExpirationDays('30');
    setIsShareDialogOpen(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysUntilExpiration = (expiresAt: string) => {
    const days = Math.ceil(
      (new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{profileName}</CardTitle>
              <CardDescription>Manage who has access to this profile</CardDescription>
            </div>
            <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Profile
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share Profile</DialogTitle>
                  <DialogDescription>
                    Grant access to {profileName} with specific permissions
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* User Input */}
                  <div>
                    <label className="text-sm font-medium">User ID or Email</label>
                    <Input
                      placeholder="Enter user ID or email"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  {/* Role Selection */}
                  <div>
                    <label className="text-sm font-medium">Role</label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleDescriptions).map(([role, { icon, description }]) => (
                          <SelectItem key={role} value={role}>
                            <div className="flex items-center gap-2">
                              {icon}
                              <span className="capitalize">{role}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      {roleDescriptions[selectedRole]?.description}
                    </p>
                  </div>

                  {/* Expiration */}
                  <div>
                    <label className="text-sm font-medium">Access Duration</label>
                    <Select value={expirationDays} onValueChange={setExpirationDays}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="never">Never expires</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleShare} disabled={!shareEmail}>
                      Share
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Active Shares */}
      {activeShares.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Active Shares ({activeShares.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeShares.map((share) => {
              const roleInfo = roleDescriptions[share.role];
              const daysUntilExpiration = share.expiresAt
                ? getDaysUntilExpiration(share.expiresAt)
                : null;

              return (
                <div
                  key={share.id}
                  className={`border rounded-lg p-3 ${roleInfo?.color || 'bg-gray-50 border-gray-200'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {roleInfo?.icon}
                        <span className="font-medium capitalize">{share.role}</span>
                        <Badge variant="outline" className="text-xs">
                          {share.sharedWithUserId ? `User #${share.sharedWithUserId}` : `Team #${share.sharedWithTeamId}`}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{roleInfo?.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Shared: {formatDate(share.sharedAt)}</span>
                        {share.expiresAt && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              Expires in {daysUntilExpiration} day
                              {daysUntilExpiration !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        {!share.expiresAt && <span className="text-blue-600">Never expires</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Update Role</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Select
                              defaultValue={share.role}
                              onValueChange={(newRole) => {
                                onUpdateRole?.(share.id, newRole);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(roleDescriptions).map(([role, { icon }]) => (
                                  <SelectItem key={role} value={role}>
                                    <div className="flex items-center gap-2">
                                      {icon}
                                      <span className="capitalize">{role}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onRevokeShare?.(share.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Expired Shares */}
      {expiredShares.length > 0 && (
        <Card className="border-gray-300">
          <CardHeader>
            <CardTitle className="text-base text-gray-600">Expired Shares ({expiredShares.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expiredShares.map((share) => (
              <div key={share.id} className="border rounded-lg p-3 bg-gray-50 opacity-60">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize text-gray-600">{share.role}</span>
                      <Badge variant="outline" className="text-xs">
                        {share.sharedWithUserId ? `User #${share.sharedWithUserId}` : `Team #${share.sharedWithTeamId}`}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Expired on {formatDate(share.expiresAt || '')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRevokeShare?.(share.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Shares State */}
      {activeShares.length === 0 && expiredShares.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-8 pb-8 text-center">
            <Share2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No active shares</p>
            <p className="text-xs text-gray-400 mt-1">Share this profile to collaborate with team members</p>
          </CardContent>
        </Card>
      )}

      {/* Role Reference */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-sm">Role Permissions Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(roleDescriptions).map(([role, { icon, description }]) => (
              <div key={role} className="flex items-start gap-2">
                <div className="mt-0.5">{icon}</div>
                <div>
                  <p className="text-sm font-medium capitalize">{role}</p>
                  <p className="text-xs text-gray-600">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSharingDashboard;
