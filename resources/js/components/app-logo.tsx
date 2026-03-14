export default function AppLogo() {
    return (
        <>
            <div className="flex size-9 items-center justify-center overflow-hidden rounded-md">
                <img
                    src="/greenlogo2.png"
                    alt="Techstacks logo"
                    className="size-8 object-contain"
                />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold text-[#23d6c8]">
                    Techstacks
                </span>
            </div>
        </>
    );
}
