import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { GitBranch, RotateCcw, Download, ChevronDown, ChevronUp } from 'lucide-react';

interface ProfileVersion {
  id: string;
  profileId: string;
  versionNumber: number;
  name: string;
  description?: string;
  triggerPhrase: string;
  commands: any[];
  changeLog?: string;
  createdAt: string;
}

interface VersionDiff {
  nameChanged: boolean;
  triggerPhraseChanged: boolean;
  commandsChanged: boolean;
  changes: {
    name: { old: string; new: string };
    triggerPhrase: { old: string; new: string };
    commandCount: { old: number; new: number };
  };
}

interface VersionComparisonViewerProps {
  profileId: string;
  versions: ProfileVersion[];
  onRollback?: (versionNumber: number, reason: string) => void;
  onExport?: (versionNumber: number) => void;
}

export const VersionComparisonViewer: React.FC<VersionComparisonViewerProps> = ({
  profileId,
  versions,
  onRollback,
  onExport,
}) => {
  const [selectedV1, setSelectedV1] = useState<number>(versions[0]?.versionNumber || 1);
  const [selectedV2, setSelectedV2] = useState<number>(
    versions[Math.max(0, versions.length - 1)]?.versionNumber || 1
  );
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [rollbackReason, setRollbackReason] = useState('');

  const v1 = versions.find((v) => v.versionNumber === selectedV1);
  const v2 = versions.find((v) => v.versionNumber === selectedV2);

  const calculateDiff = (): VersionDiff | null => {
    if (!v1 || !v2) return null;

    return {
      nameChanged: v1.name !== v2.name,
      triggerPhraseChanged: v1.triggerPhrase !== v2.triggerPhrase,
      commandsChanged: JSON.stringify(v1.commands) !== JSON.stringify(v2.commands),
      changes: {
        name: { old: v1.name, new: v2.name },
        triggerPhrase: { old: v1.triggerPhrase, new: v2.triggerPhrase },
        commandCount: { old: v1.commands.length, new: v2.commands.length },
      },
    };
  };

  const diff = calculateDiff();

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const DiffHighlight: React.FC<{ changed: boolean; children: React.ReactNode }> = ({
    changed,
    children,
  }) => (
    <div className={changed ? 'bg-yellow-50 border-l-2 border-yellow-400 pl-2' : ''}>
      {children}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Version Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Compare Versions
          </CardTitle>
          <CardDescription>Select two versions to compare changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">From Version</label>
              <Select value={selectedV1.toString()} onValueChange={(v) => setSelectedV1(parseInt(v))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.versionNumber.toString()}>
                      v{v.versionNumber} - {v.name} ({formatDate(v.createdAt)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">To Version</label>
              <Select value={selectedV2.toString()} onValueChange={(v) => setSelectedV2(parseInt(v))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.versionNumber.toString()}>
                      v{v.versionNumber} - {v.name} ({formatDate(v.createdAt)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {v1 && v2 && diff && (
        <>
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Changes Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className={`p-3 rounded ${diff.nameChanged ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-600">Profile Name</p>
                  <p className={`text-sm font-mono ${diff.nameChanged ? 'text-yellow-700' : 'text-gray-700'}`}>
                    {diff.nameChanged ? '✓ Changed' : '○ Unchanged'}
                  </p>
                </div>
                <div className={`p-3 rounded ${diff.triggerPhraseChanged ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-600">Trigger Phrase</p>
                  <p className={`text-sm font-mono ${diff.triggerPhraseChanged ? 'text-yellow-700' : 'text-gray-700'}`}>
                    {diff.triggerPhraseChanged ? '✓ Changed' : '○ Unchanged'}
                  </p>
                </div>
                <div className={`p-3 rounded ${diff.commandsChanged ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-600">Commands</p>
                  <p className={`text-sm font-mono ${diff.commandsChanged ? 'text-yellow-700' : 'text-gray-700'}`}>
                    {diff.commandsChanged ? '✓ Changed' : '○ Unchanged'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detailed Changes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Profile Name */}
              <div className="border rounded-lg">
                <button
                  onClick={() => toggleSection('name')}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
                >
                  <span className="font-medium text-sm flex items-center gap-2">
                    Profile Name
                    {diff.nameChanged && <Badge variant="outline" className="text-xs">Changed</Badge>}
                  </span>
                  {expandedSections.has('name') ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedSections.has('name') && (
                  <div className="border-t p-3 space-y-2 bg-gray-50">
                    <DiffHighlight changed={diff.nameChanged}>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Version {selectedV1}</p>
                          <p className="text-sm font-mono bg-white p-2 rounded border">
                            {diff.changes.name.old}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Version {selectedV2}</p>
                          <p className="text-sm font-mono bg-white p-2 rounded border">
                            {diff.changes.name.new}
                          </p>
                        </div>
                      </div>
                    </DiffHighlight>
                  </div>
                )}
              </div>

              {/* Trigger Phrase */}
              <div className="border rounded-lg">
                <button
                  onClick={() => toggleSection('trigger')}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
                >
                  <span className="font-medium text-sm flex items-center gap-2">
                    Trigger Phrase
                    {diff.triggerPhraseChanged && (
                      <Badge variant="outline" className="text-xs">
                        Changed
                      </Badge>
                    )}
                  </span>
                  {expandedSections.has('trigger') ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedSections.has('trigger') && (
                  <div className="border-t p-3 space-y-2 bg-gray-50">
                    <DiffHighlight changed={diff.triggerPhraseChanged}>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Version {selectedV1}</p>
                          <p className="text-sm font-mono bg-white p-2 rounded border">
                            {diff.changes.triggerPhrase.old}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Version {selectedV2}</p>
                          <p className="text-sm font-mono bg-white p-2 rounded border">
                            {diff.changes.triggerPhrase.new}
                          </p>
                        </div>
                      </div>
                    </DiffHighlight>
                  </div>
                )}
              </div>

              {/* Commands */}
              <div className="border rounded-lg">
                <button
                  onClick={() => toggleSection('commands')}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
                >
                  <span className="font-medium text-sm flex items-center gap-2">
                    Commands
                    {diff.commandsChanged && (
                      <Badge variant="outline" className="text-xs">
                        Changed
                      </Badge>
                    )}
                  </span>
                  {expandedSections.has('commands') ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedSections.has('commands') && (
                  <div className="border-t p-3 space-y-2 bg-gray-50">
                    <DiffHighlight changed={diff.commandsChanged}>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Version {selectedV1}</p>
                          <p className="text-sm font-mono bg-white p-2 rounded border">
                            {diff.changes.commandCount.old} command
                            {diff.changes.commandCount.old !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Version {selectedV2}</p>
                          <p className="text-sm font-mono bg-white p-2 rounded border">
                            {diff.changes.commandCount.new} command
                            {diff.changes.commandCount.new !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </DiffHighlight>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Change Log */}
          {v2.changeLog && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Change Log</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{v2.changeLog}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onExport?.(selectedV2)}
              >
                <Download className="w-4 h-4 mr-2" />
                Export v{selectedV2}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Rollback to v{selectedV1}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Rollback</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will create a new version based on v{selectedV1}. The current version (v{selectedV2}) will be preserved in history.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Reason for rollback (optional)</label>
                      <textarea
                        value={rollbackReason}
                        onChange={(e) => setRollbackReason(e.target.value)}
                        placeholder="Why are you rolling back?"
                        className="w-full mt-1 p-2 border rounded text-sm"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        onRollback?.(selectedV1, rollbackReason);
                        setRollbackReason('');
                      }}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Confirm Rollback
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </>
      )}

      {/* No Versions */}
      {versions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-8 pb-8 text-center">
            <GitBranch className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No versions available</p>
            <p className="text-xs text-gray-400 mt-1">Versions are created automatically when you update profiles</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VersionComparisonViewer;
