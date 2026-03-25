import { Head, Link, usePage } from '@inertiajs/react';
import { dashboard, login, register } from '@/routes';

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth } = usePage().props as { auth: { user?: unknown } };

    return (
        <>
            <Head title="Techstacks" />

            <div className="min-h-screen bg-background text-foreground">
                <main className="flex min-h-screen items-center justify-center p-6 md:p-10">
                    <div className="w-full max-w-4xl rounded-[24px] border border-sidebar-border/70 bg-gradient-to-br from-background to-muted/20 text-foreground shadow-[0_16px_80px_rgba(0,0,0,0.22)] dark:border-sidebar-border dark:shadow-[0_16px_80px_rgba(0,0,0,0.35)]">
                        <div className="grid grid-cols-1 items-center gap-5 p-7 md:p-9 lg:grid-cols-2 lg:gap-2">
                            <div>
                                <h1 className="text-balance text-4xl font-semibold leading-[1.05] md:text-[46px]">
                                    Client{' '}
                                    <span className="font-semibold italic text-[#23d6c8]">
                                        Inquiry
                                    </span>{' '}
                                    <br />
                                    and{' '}
                                    <span className="font-semibold italic text-[#23d6c8]">
                                        Leads
                                    </span>{' '}
                                    <br />
                                    Management <br />
                                    System
                                </h1>

                                <div className="mt-9 flex flex-wrap items-center gap-4">
                                    {auth.user ? (
                                        <Link
                                            href={dashboard()}
                                            className="inline-flex items-center justify-center rounded-full bg-[#23d6c8] px-7 py-3 text-sm font-semibold text-black hover:bg-[#1dc7ba]"
                                        >
                                            Go to Dashboard
                                        </Link>
                                    ) : (
                                        <>
                                            <Link
                                                href={login()}
                                                className="inline-flex items-center justify-center rounded-full bg-[#23d6c8] px-8 py-3 text-sm font-semibold text-black hover:bg-[#1dc7ba]"
                                            >
                                                Log in
                                            </Link>
                                            {canRegister && (
                                                <Link
                                                    href={register()}
                                                    className="inline-flex items-center justify-center rounded-full border-2 border-[#23d6c8] bg-transparent px-8 py-3 text-sm font-semibold text-foreground hover:bg-foreground/5"
                                                >
                                                    Register
                                                </Link>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-center lg:justify-center">
                                <img
                                    src="/3Dlogo.png"
                                    alt="Techstacks"
                                    className="h-auto w-[240px] max-w-full select-none object-contain md:w-[280px] lg:w-[320px]"
                                    draggable={false}
                                />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
