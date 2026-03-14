import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    BadgeInfo,
    Building2,
    CircleHelp,
    Globe,
    Mail,
    MapPin,
    Phone,
    Save,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type InquiryDetail = {
    id: string;
    full_name: string;
    email: string;
    discovery_platform: string;
    concern_type: string;
    message: string;
    status: string;
    inquiry_date: string | null;
    status_date: string | null;
    inquiry_id: string;
    __v: number;
    type: string;
    company: string;
    phone: string;
    address: string;
};

const statusChipClass = (status: string): string => {
    const normalized = status.trim().toLowerCase();

    if (normalized === 'new') {
        return 'bg-emerald-500/15 text-emerald-400';
    }
    if (normalized === 'completed-successful') {
        return 'bg-teal-500/15 text-teal-400';
    }
    if (normalized === 'completed-unsuccessful') {
        return 'bg-rose-500/15 text-rose-400';
    }
    if (normalized === 'cancelled') {
        return 'bg-slate-500/15 text-slate-400';
    }
    if (normalized === 'contacted') {
        return 'bg-blue-500/15 text-blue-400';
    }
    if (normalized === 'in progress-active' || normalized === 'in progress') {
        return 'bg-amber-500/15 text-amber-400';
    }
    if (normalized === 'in progress-on hold') {
        return 'bg-orange-500/15 text-orange-400';
    }

    return 'bg-muted text-muted-foreground';
};

const textOrEmpty = (value: string | null | undefined): string => value ?? '';

export default function LeadEdit({ inquiry }: { inquiry: InquiryDetail }) {
    const [form, setForm] = useState({
        full_name: textOrEmpty(inquiry.full_name),
        company: textOrEmpty(inquiry.company),
        email: textOrEmpty(inquiry.email),
        phone: textOrEmpty(inquiry.phone),
        address: textOrEmpty(inquiry.address),
        discovery_platform: textOrEmpty(inquiry.discovery_platform),
        concern_type: textOrEmpty(inquiry.concern_type),
        message: textOrEmpty(inquiry.message),
    });
    const [saving, setSaving] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Leads', href: '/leads/inquiries/new-inquiry' },
        { title: 'Edit Details', href: `/leads/inquiries/${inquiry.id}/edit` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Inquiry" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Card className="w-full">
                    <CardContent className="space-y-6 p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="mt-0.5 h-10 w-10"
                                    onClick={() => window.history.back()}
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <div className="min-w-0 space-y-2">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <p className="text-2xl font-semibold">
                                            {textOrEmpty(inquiry.inquiry_id) || '-'}
                                        </p>
                                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                                            <Label htmlFor="full_name" className="text-base">
                                                Fullname:
                                            </Label>
                                            <Input
                                                id="full_name"
                                                value={form.full_name}
                                                onChange={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        full_name: e.target.value,
                                                    }))
                                                }
                                                className="h-7 w-full max-w-[18rem] sm:w-72"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusChipClass(
                                                textOrEmpty(inquiry.status),
                                            )}`}
                                        >
                                            {textOrEmpty(inquiry.status) || '-'}
                                        </span>
                                        <div className="flex flex-wrap items-center gap-2 md:hidden">
                                            <Button asChild type="button" variant="outline" size="sm">
                                                <Link href={`/leads/inquiries/${inquiry.id}`}>
                                                    <X className="mr-1 h-4 w-4" />
                                                    Cancel
                                                </Link>
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                disabled={saving}
                                                onClick={() => {
                                                    router.patch(`/leads/inquiries/${inquiry.id}`, form, {
                                                        preserveScroll: true,
                                                        onStart: () => setSaving(true),
                                                        onFinish: () => setSaving(false),
                                                    });
                                                }}
                                            >
                                                <Save className="mr-1 h-4 w-4" />
                                                {saving ? 'Saving...' : 'Save'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="hidden items-center gap-2 md:flex">
                                <Button asChild type="button" variant="outline" size="sm">
                                    <Link href={`/leads/inquiries/${inquiry.id}`}>
                                        <X className="mr-1 h-4 w-4" />
                                        Cancel
                                    </Link>
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={saving}
                                    onClick={() => {
                                        router.patch(`/leads/inquiries/${inquiry.id}`, form, {
                                            preserveScroll: true,
                                            onStart: () => setSaving(true),
                                            onFinish: () => setSaving(false),
                                        });
                                    }}
                                >
                                    <Save className="mr-1 h-4 w-4" />
                                    {saving ? 'Saving...' : 'Save'}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2 text-lg leading-tight">
                            <div className="flex items-center gap-2">
                                <BadgeInfo className="h-4 w-4 text-muted-foreground" />
                                <span className="w-24 whitespace-nowrap">Type :</span>
                                <Input value={textOrEmpty(inquiry.type)} className="h-7 max-w-md" readOnly />
                            </div>
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="w-24 whitespace-nowrap">Company :</span>
                                <Input
                                    value={form.company}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            company: e.target.value,
                                        }))
                                    }
                                    className="h-7 max-w-md"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="w-24 whitespace-nowrap">Email :</span>
                                <Input
                                    value={form.email}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            email: e.target.value,
                                        }))
                                    }
                                    className="h-7 max-w-md"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span className="w-24 whitespace-nowrap">Phone :</span>
                                <Input
                                    value={form.phone}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            phone: e.target.value,
                                        }))
                                    }
                                    className="h-7 max-w-md"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="w-24 whitespace-nowrap">Address :</span>
                                <Input
                                    value={form.address}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            address: e.target.value,
                                        }))
                                    }
                                    className="h-7 max-w-md"
                                />
                            </div>
                        </div>

                        <hr className="border-border" />

                        <div className="space-y-2 text-lg leading-tight">
                            <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                <span className="w-24 whitespace-nowrap">Source :</span>
                                <Input
                                    value={form.discovery_platform}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            discovery_platform: e.target.value,
                                        }))
                                    }
                                    className="h-7 max-w-md"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <CircleHelp className="h-4 w-4 text-muted-foreground" />
                                <span className="w-24 whitespace-nowrap">Concern :</span>
                                <Input
                                    value={form.concern_type}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            concern_type: e.target.value,
                                        }))
                                    }
                                    className="h-7 max-w-md"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="message" className="text-lg">
                                Message:
                            </Label>
                            <textarea
                                id="message"
                                value={form.message}
                                onChange={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        message: e.target.value,
                                    }))
                                }
                                rows={3}
                                className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[88px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px]"
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
