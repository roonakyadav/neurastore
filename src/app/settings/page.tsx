"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "react-i18next";

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const { addToast } = useToast();
    const { t, i18n } = useTranslation();
    const [mounted, setMounted] = useState(false);
    const [clearingHistory, setClearingHistory] = useState(false);
    const [settings, setSettings] = useState({
        notifications: true,
        autoAnalysis: true,
        defaultView: 'grid',
        language: 'en',
    });

    useEffect(() => {
        setMounted(true);
        // Load settings from localStorage or API
        const savedSettings = localStorage.getItem('neurastore-settings');
        if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
        }
        // Load language from localStorage
        const savedLanguage = localStorage.getItem('neurastore-language') || 'en';
        i18n.changeLanguage(savedLanguage);
        setSettings(prev => ({ ...prev, language: savedLanguage }));
    }, [i18n]);

    const updateSetting = (key: string, value: any) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        localStorage.setItem('neurastore-settings', JSON.stringify(newSettings));
    };

    const changeLanguage = (language: string) => {
        i18n.changeLanguage(language);
        updateSetting('language', language);
        localStorage.setItem('neurastore-language', language);
        addToast('info', 'Language Updated', `Language changed to ${language === 'en' ? 'English' : language === 'es' ? 'Español' : language === 'hi' ? 'हिंदी' : 'Français'}.`);
    };

    if (!mounted) {
        return null;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Customize your NeuraStore+ experience
                </p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Appearance</CardTitle>
                        <CardDescription>
                            Customize how NeuraStore+ looks and feels
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Theme</Label>
                                <p className="text-sm text-muted-foreground">
                                    Choose your preferred color scheme
                                </p>
                            </div>
                            <Select value={theme} onValueChange={setTheme}>
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="light">Light</SelectItem>
                                    <SelectItem value="dark">Dark</SelectItem>
                                    <SelectItem value="system">System</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Default View</Label>
                                <p className="text-sm text-muted-foreground">
                                    Choose how files are displayed by default
                                </p>
                            </div>
                            <Select
                                value={settings.defaultView}
                                onValueChange={(value) => updateSetting('defaultView', value)}
                            >
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="grid">Grid</SelectItem>
                                    <SelectItem value="list">List</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Behavior</CardTitle>
                        <CardDescription>
                            Configure how NeuraStore+ behaves
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Auto Analysis</Label>
                                <p className="text-sm text-muted-foreground">
                                    Automatically analyze files after upload
                                </p>
                            </div>
                            <Switch
                                checked={settings.autoAnalysis}
                                onCheckedChange={(checked) => updateSetting('autoAnalysis', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Notifications</Label>
                                <p className="text-sm text-muted-foreground">
                                    Receive notifications for file analysis completion
                                </p>
                            </div>
                            <Switch
                                checked={settings.notifications}
                                onCheckedChange={(checked) => updateSetting('notifications', checked)}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Language & Region</CardTitle>
                        <CardDescription>
                            Set your language and regional preferences
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Language</Label>
                                <p className="text-sm text-muted-foreground">
                                    Choose your preferred language
                                </p>
                            </div>
                            <Select
                                value={settings.language}
                                onValueChange={changeLanguage}
                            >
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="en">English</SelectItem>
                                    <SelectItem value="es">Español</SelectItem>
                                    <SelectItem value="fr">Français</SelectItem>
                                    <SelectItem value="de">Deutsch</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Data Management</CardTitle>
                        <CardDescription>
                            Manage your data and privacy settings
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Export Data</Label>
                                <p className="text-sm text-muted-foreground">
                                    Download all your data in JSON format
                                </p>
                            </div>
                            <Button variant="outline">Export</Button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Clear History</Label>
                                <p className="text-sm text-muted-foreground">
                                    Delete all uploaded files and metadata
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                disabled={clearingHistory}
                                onClick={async () => {
                                    if (confirm('Are you sure you want to delete all files and history? This action cannot be undone.')) {
                                        setClearingHistory(true);
                                        try {
                                            // Delete all files from storage
                                            const { data: files } = await supabase.from('files_metadata').select('public_url');
                                            if (files && files.length > 0) {
                                                for (const file of files) {
                                                    // Parse path from public_url
                                                    const urlParts = file.public_url.split('/storage/v1/object/public/');
                                                    if (urlParts.length >= 2) {
                                                        const path = urlParts[1].split('/').slice(1).join('/');
                                                        await supabase.storage.from('media').remove([path]);
                                                    }
                                                }
                                            }
                                            // Delete all metadata
                                            await supabase.from('files_metadata').delete().neq('id', '');
                                            addToast('success', 'History Cleared', 'All files and metadata have been deleted successfully.');
                                        } catch (error) {
                                            console.error('Error clearing history:', error);
                                            addToast('error', 'Clear History Failed', 'An error occurred while clearing history. Please try again.');
                                        } finally {
                                            setClearingHistory(false);
                                        }
                                    }
                                }}
                            >
                                {clearingHistory ? 'Clearing History...' : 'Clear History'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
