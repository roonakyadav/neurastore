"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FolderOpen } from "lucide-react";
import { motion } from "framer-motion";

interface ConfirmUploadDialogProps {
    isOpen: boolean;
    fileCount: number;
    folderName?: string;
    totalSize: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmUploadDialog({
    isOpen,
    fileCount,
    folderName,
    totalSize,
    onConfirm,
    onCancel
}: ConfirmUploadDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onCancel}>
            <DialogContent className="sm:max-w-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                >
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                                <FolderOpen className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-left">Confirm Folder Upload</DialogTitle>
                                <DialogDescription className="text-left">
                                    You are about to upload {fileCount} file{fileCount !== 1 ? 's' : ''} {folderName ? `from the folder '${folderName}'` : ''}. Continue?
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="py-4">
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Files to upload:</span>
                                <span className="font-medium">{fileCount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total size:</span>
                                <span className="font-medium">{totalSize}</span>
                            </div>
                        </div>

                        <div className="flex items-start gap-2 mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                Please ensure all files are supported formats. Large uploads may take time to complete.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button onClick={onConfirm} className="min-w-20">
                            Upload
                        </Button>
                    </DialogFooter>
                </motion.div>
            </DialogContent>
        </Dialog>
    );
}
