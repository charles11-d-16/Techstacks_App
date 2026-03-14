import { Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    CirclePlus,
    ChevronRight,
    CircleCheck,
    CircleX,
    FilePenLine,
    History,
    LayoutGrid,
    ListChecks,
    LogIn,
    PhoneCall,
    RefreshCcw,
    Trash2,
    UserRoundPlus,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavUser } from '@/components/nav-user';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

type RoleKey = 'admin' | 'super_admin';

type RoleNavItem = NavItem & {
    roles?: RoleKey[];
};

const mainNavItems: RoleNavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
        roles: ['admin', 'super_admin'],
    },
    {
        title: 'Admin List',
        href: '/admin-list',
        icon: Users,
        roles: ['super_admin'],
    },
    {
        title: 'Add Leads',
        href: '/leads/inquiries/add',
        icon: CirclePlus,
        roles: ['admin', 'super_admin'],
    },
];

const leadsNavItems: Array<{
    title: string;
    href: string;
    icon: LucideIcon;
    roles?: RoleKey[];
}> = [
    {
        title: 'New',
        href: '/leads/inquiries/new-inquiry',
        icon: UserRoundPlus,
        roles: ['admin', 'super_admin'],
    },
    {
        title: 'Contacted',
        href: '/leads/inquiries/contacted',
        icon: PhoneCall,
        roles: ['admin', 'super_admin'],
    },
    {
        title: 'In Progress',
        href: '/leads/inquiries/in-progress',
        icon: RefreshCcw,
        roles: ['admin', 'super_admin'],
    },
    {
        title: 'Completed',
        href: '/leads/inquiries/completed',
        icon: CircleCheck,
        roles: ['admin', 'super_admin'],
    },
    {
        title: 'Cancelled',
        href: '/leads/inquiries/cancelled',
        icon: CircleX,
        roles: ['admin', 'super_admin'],
    },
];

const auditTrailNavItems: Array<{
    title: string;
    href: string;
    icon: LucideIcon;
    roles?: RoleKey[];
}> = [
    {
        title: 'Login History',
        href: '/audit-trail/login-history',
        icon: LogIn,
        roles: ['admin', 'super_admin'],
    },
    {
        title: 'Change History',
        href: '/audit-trail/change-history',
        icon: FilePenLine,
        roles: ['admin', 'super_admin'],
    },
    {
        title: 'Deletion History',
        href: '/audit-trail/deletion-history',
        icon: Trash2,
        roles: ['admin', 'super_admin'],
    },
];

export function AppSidebar() {
    const { auth } = usePage().props as { auth: { user: { role?: string } } };
    const { isCurrentUrl } = useCurrentUrl();
    const leadsGroupActive =
        isCurrentUrl('/leads/inquiries', undefined, true) &&
        !isCurrentUrl('/leads/inquiries/add');
    const auditTrailGroupActive = isCurrentUrl('/audit-trail', undefined, true);
    const currentRole = (() => {
        const role = (auth.user.role ?? '').toLowerCase().replace(/\s+/g, '_');
        if (role === 'superadmin') {
            return 'super_admin' as RoleKey;
        }
        if (role === 'super_admin') {
            return 'super_admin' as RoleKey;
        }
        if (role === 'admin') {
            return 'admin' as RoleKey;
        }

        return null;
    })();

    const visibleMainNavItems = mainNavItems.filter((item) => {
        if (!item.roles || item.roles.length === 0) {
            return true;
        }

        return currentRole !== null && item.roles.includes(currentRole);
    });
    const visibleLeadsNavItems = leadsNavItems.filter((item) => {
        if (!item.roles || item.roles.length === 0) {
            return true;
        }

        return currentRole !== null && item.roles.includes(currentRole);
    });
    const visibleAuditTrailNavItems = auditTrailNavItems.filter((item) => {
        if (!item.roles || item.roles.length === 0) {
            return true;
        }

        return currentRole !== null && item.roles.includes(currentRole);
    });
    const platformLabel =
        currentRole === 'super_admin'
            ? 'Super Admin'
            : currentRole === 'admin'
              ? 'Admin'
              : 'Platform';

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup className="px-2 py-0">
                    <SidebarGroupLabel>{platformLabel}</SidebarGroupLabel>
                    <SidebarMenu>
                        {visibleMainNavItems.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={isCurrentUrl(item.href)}
                                    tooltip={{ children: item.title }}
                                >
                                    <Link href={item.href} prefetch>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}

                        <Collapsible
                            asChild
                            defaultOpen={leadsGroupActive}
                            className="group/collapsible"
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton
                                        tooltip={{ children: 'Leads' }}
                                        isActive={leadsGroupActive}
                                    >
                                        <ListChecks />
                                        <span>Leads / Inquirer</span>
                                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub className="mx-0 mt-2 rounded-xl border border-sidebar-border/60 bg-sidebar px-1.5 py-2 shadow-sm">
                                        {visibleLeadsNavItems.map((item) => (
                                            <SidebarMenuSubItem key={item.title}>
                                                <SidebarMenuSubButton
                                                    asChild
                                                    isActive={isCurrentUrl(
                                                        item.href,
                                                    )}
                                                    className="h-10 rounded-lg px-2.5 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                                                >
                                                    <Link
                                                        href={item.href}
                                                        prefetch
                                                        className="grid w-full grid-cols-[20px_1fr] items-center gap-3"
                                                    >
                                                        <item.icon className="size-4" />
                                                        <span className="text-sm">
                                                            {item.title}
                                                        </span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>

                        <Collapsible
                            asChild
                            defaultOpen={auditTrailGroupActive}
                            className="group/collapsible"
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton
                                        tooltip={{ children: 'Audit Trail' }}
                                        isActive={auditTrailGroupActive}
                                    >
                                        <History />
                                        <span>Audit Trail</span>
                                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub className="mx-0 mt-2 rounded-xl border border-sidebar-border/60 bg-sidebar px-1.5 py-2 shadow-sm">
                                        {visibleAuditTrailNavItems.map((item) => (
                                            <SidebarMenuSubItem key={item.title}>
                                                <SidebarMenuSubButton
                                                    asChild
                                                    isActive={isCurrentUrl(item.href)}
                                                    className="h-10 rounded-lg px-2.5 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                                                >
                                                    <Link
                                                        href={item.href}
                                                        prefetch
                                                        className="grid w-full grid-cols-[20px_1fr] items-center gap-3"
                                                    >
                                                        <item.icon className="size-4" />
                                                        <span className="text-sm">
                                                            {item.title}
                                                        </span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
