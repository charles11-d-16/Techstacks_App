import { Head, useForm } from '@inertiajs/react';
import { ArrowLeft, Download, Plus, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type AddLeadForm = {
    full_name: string;
    company: string;
    email: string;
    phone: string;
    address: string;
    discovery_platform: string;
    concern_type: string;
    message: string;
};

export default function LeadAdd() {
    const [mode, setMode] = useState<'single' | 'bulk'>('single');
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Leads', href: '/leads/inquiries/new-inquiry' },
        { title: 'Add Leads', href: '/leads/inquiries/add' },
    ];

    const {
        data: singleData,
        setData: setSingleData,
        post: postSingle,
        processing: singleProcessing,
        errors: singleErrors,
    } = useForm<AddLeadForm>({
        full_name: '',
        company: '',
        email: '',
        phone: '',
        address: '',
        discovery_platform: '',
        concern_type: '',
        message: '',
    });
    const {
        data: bulkData,
        setData: setBulkData,
        post: postBulk,
        processing: bulkProcessing,
        errors: bulkErrors,
    } = useForm<{ import_file: File | null }>({
        import_file: null,
    });

    const downloadXlsxTemplate = () => {
        window.location.href = '/leads/inquiries/import-template';
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add Leads" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Card className="w-full">
                    <CardContent className="space-y-6 p-6">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10"
                                    onClick={() => window.history.back()}
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <h1 className="text-2xl font-semibold">Add Leads</h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant={mode === 'single' ? 'default' : 'outline'}
                                className={
                                    mode === 'single'
                                        ? 'bg-[#23d6c8] text-black hover:bg-[#1fc4b7]'
                                        : undefined
                                }
                                onClick={() => setMode('single')}
                            >
                                Single
                            </Button>
                            <Button
                                type="button"
                                variant={mode === 'bulk' ? 'default' : 'outline'}
                                className={
                                    mode === 'bulk'
                                        ? 'bg-[#23d6c8] text-black hover:bg-[#1fc4b7]'
                                        : undefined
                                }
                                onClick={() => setMode('bulk')}
                            >
                                Bulk Import
                            </Button>
                        </div>

                        {mode === 'single' ? (
                            <>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="full_name">Full Name</Label>
                                        <Input
                                            id="full_name"
                                            value={singleData.full_name}
                                            onChange={(e) =>
                                                setSingleData('full_name', e.target.value)
                                            }
                                        />
                                        {singleErrors.full_name ? (
                                            <p className="text-xs text-destructive">
                                                {singleErrors.full_name}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={singleData.email}
                                            onChange={(e) =>
                                                setSingleData('email', e.target.value)
                                            }
                                        />
                                        {singleErrors.email ? (
                                            <p className="text-xs text-destructive">
                                                {singleErrors.email}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="company">Company</Label>
                                        <Input
                                            id="company"
                                            value={singleData.company}
                                            onChange={(e) =>
                                                setSingleData('company', e.target.value)
                                            }
                                        />
                                        {singleErrors.company ? (
                                            <p className="text-xs text-destructive">
                                                {singleErrors.company}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input
                                            id="phone"
                                            value={singleData.phone}
                                            onChange={(e) =>
                                                setSingleData('phone', e.target.value)
                                            }
                                        />
                                        {singleErrors.phone ? (
                                            <p className="text-xs text-destructive">
                                                {singleErrors.phone}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="address">Address</Label>
                                        <Input
                                            id="address"
                                            value={singleData.address}
                                            onChange={(e) =>
                                                setSingleData('address', e.target.value)
                                            }
                                        />
                                        {singleErrors.address ? (
                                            <p className="text-xs text-destructive">
                                                {singleErrors.address}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Source</Label>
                                        <Select
                                            value={singleData.discovery_platform || undefined}
                                            onValueChange={(value) =>
                                                setSingleData('discovery_platform', value)
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select source" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="facebook">Facebook</SelectItem>
                                                <SelectItem value="instagram">
                                                    Instagram
                                                </SelectItem>
                                                <SelectItem value="linkedIn">LinkedIn</SelectItem>
                                                <SelectItem value="referral">Referral</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {singleErrors.discovery_platform ? (
                                            <p className="text-xs text-destructive">
                                                {singleErrors.discovery_platform}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Concern</Label>
                                        <Select
                                            value={singleData.concern_type || undefined}
                                            onValueChange={(value) =>
                                                setSingleData('concern_type', value)
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select concern" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="proposal">
                                                    Project Proposal
                                                </SelectItem>
                                                <SelectItem value="maintenance">
                                                    Maintenance Support
                                                </SelectItem>
                                                <SelectItem value="security">
                                                    Security Consultation
                                                </SelectItem>
                                                <SelectItem value="general">
                                                    General Inquiry
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {singleErrors.concern_type ? (
                                            <p className="text-xs text-destructive">
                                                {singleErrors.concern_type}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="message">Message (Optional)</Label>
                                    <textarea
                                        id="message"
                                        value={singleData.message}
                                        onChange={(e) =>
                                            setSingleData('message', e.target.value)
                                        }
                                        rows={4}
                                        className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[120px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px]"
                                    />
                                    {singleErrors.message ? (
                                        <p className="text-xs text-destructive">
                                            {singleErrors.message}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="flex justify-end">
                                    <Button
                                        type="button"
                                        disabled={singleProcessing}
                                        onClick={() =>
                                            postSingle('/leads/inquiries/add', {
                                                preserveScroll: true,
                                            })
                                        }
                                    >
                                        <Plus className="mr-1 h-4 w-4" />
                                        {singleProcessing ? 'Adding...' : 'Add'}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-dashed border-border p-6">
                                    <p className="mb-3 text-sm text-muted-foreground">
                                        Upload a CSV or XLSX file with this format:
                                        <span className="ml-1 font-medium text-foreground">
                                            Full Name, Email Address, Phone, Company, address, Dicovered Via, Inquiry, Message
                                        </span>
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={downloadXlsxTemplate}
                                        >
                                            <Download className="mr-1 h-4 w-4" />
                                            Download Template
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload className="mr-1 h-4 w-4" />
                                            Choose File
                                        </Button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".csv,.xlsx,.xls,text/csv"
                                            className="hidden"
                                            onChange={(e) =>
                                                setBulkData(
                                                    'import_file',
                                                    e.currentTarget.files?.[0] ?? null,
                                                )
                                            }
                                        />
                                        <span className="text-sm text-muted-foreground">
                                            {bulkData.import_file
                                                ? bulkData.import_file.name
                                                : 'No file selected'}
                                        </span>
                                    </div>
                                    {bulkErrors.import_file ? (
                                        <p className="mt-2 text-xs text-destructive">
                                            {bulkErrors.import_file}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="flex justify-end">
                                    <Button
                                        type="button"
                                        disabled={bulkProcessing || !bulkData.import_file}
                                        onClick={() =>
                                            postBulk('/leads/inquiries/import', {
                                                preserveScroll: true,
                                                forceFormData: true,
                                            })
                                        }
                                    >
                                        <Upload className="mr-1 h-4 w-4" />
                                        {bulkProcessing ? 'Importing...' : 'Import'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
