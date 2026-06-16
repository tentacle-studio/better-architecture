const LabStatus = () => (
    <div className="bg-surface-container-low p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-sm">computer</span>
            </div>
            <h3 className="font-headline font-bold text-lg text-on-surface">Lab Status</h3>
        </div>
        <div className="space-y-4">
            <div
                className="p-4 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10"
            >
                <div className="flex items-center justify-between mb-2">
                    <span className="font-label text-xs font-bold text-on-surface-variant uppercase">AWS Sandbox</span>
                    <span
                        className="flex items-center gap-1 font-label text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded"
                    >
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Online
                    </span>
                </div>
                <p className="font-body text-xs text-on-surface-variant">us-east-1 region ready for deployments.</p>
            </div>
            <div
                className="p-4 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10"
            >
                <div className="flex items-center justify-between mb-2">
                    <span className="font-label text-xs font-bold text-on-surface-variant uppercase">K8s Cluster</span>
                    <span
                        className="flex items-center gap-1 font-label text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded"
                    >
                        <span className="material-symbols-outlined text-[10px]">sleep</span> Standby
                    </span>
                </div>
                <p className="font-body text-xs text-on-surface-variant">Spinning up on demand for Module 3.</p>
            </div>
        </div>
    </div>
);

const TopMentors = () => (
    <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/10">
        <div className="flex items-center justify-between mb-6">
            <h3 className="font-headline font-bold text-lg text-on-surface">Top Mentors</h3>
            <button className="text-primary font-label text-xs font-bold uppercase hover:underline">View All</button>
        </div>
        <div className="space-y-4">
            {[
                { name: "Sarah Jenkins", role: "Sr. SRE @ CloudCorp", avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDZD4ULpvx9ZhoMTYY_TD6KVnF2BHnyAYYUuOSLE6ZgkEhloDaqXumk1CHdJdSxq8FysHVJy8Rk0j-60kYnH2FMR59vhZACwM_hlQHY0m4arbI7FttewfAtjtnL51w52glmP7enr2vErt09UT7QG9tFzNXiYD-dl-8lNs-o8ZbXlJD7PCoMX1c9Q5ukyykbBjlj5FrEjsSiR8FfB3yDmbGmu-_t4PzkszHy0WxfXQSoeS4MlHhqroUkRfaiUBG__WTcCDy63FhaMYw" },
                { name: "David Chen", role: "DevOps Lead", avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCfv0VGfG1Y5jer7tUHr8joP84cXrYCP4nzeGI-E4_JpPCaUcwOJyzToAbyuvThxZqDbivFRXDwtbA_0yivggKO6JWQaIilDhrgK_-POLLOmOgAErmLB2xOBvrtdMwh1owfeomOxqjUM1RK9VWPgROZ0xCtiIt1mXLB1nUsfbJln-Ipb6WdGpkR3Mfhe53uBFMMCfbKu8Sg2T-HE0yrZad_y9_ZWugx2WWryYZBhq9oJ22WlJ-oc1GNBUnqfFQCU4EA90f5w6gAf1s" }
            ].map((mentor, idx) => (
                <div key={idx} className="flex items-center gap-4 group cursor-pointer">
                    <img 
                        alt={mentor.name} 
                        className="w-10 h-10 rounded-full border-2 border-transparent group-hover:border-primary transition-colors object-cover"
                        src={mentor.avatar} 
                    />
                    <div>
                        <p className="font-headline font-bold text-sm text-on-surface group-hover:text-primary transition-colors">
                            {mentor.name}
                        </p>
                        <p className="font-body text-xs text-on-surface-variant">{mentor.role}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const RecentlyJoined = () => (
    <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/10">
        <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline font-bold text-lg text-on-surface">Recently Joined</h3>
        </div>
        <p className="font-body text-sm text-on-surface-variant mb-4">Say hi to the newest learners in cohort #42.</p>
        <div className="flex flex-wrap gap-2">
            {[
                "https://lh3.googleusercontent.com/aida-public/AB6AXuCB7nH9W8riwfo3M4wEUU5yN0iPyPxvffnjDQOav3BwhoalGK-_OB1mIWbMDH2lelpFU5XOtHE0bo3BcpqXpcKoJNnGBcDfAj85h6a-AUw0iPz2LfiA9HTgTe7dsm_zQiBT7rvQcDufH-jbvF0wHdTs0H9IjSmPr-GGTJnQ2IxZvZCTRqO9GA74rncQuFL6gqqNkCuNS72j0hX0sA_c11bi3jkSPP-MOlin4NFIjKbxNile2bkwM01blxbyXJusWWstfVC6eEYyky0",
                "https://lh3.googleusercontent.com/aida-public/AB6AXuCBBs9OIfdqQHZRW63-zIz4ZgsKCHCY-2lQREOA28Rw_Nv4XvjFhOo-cn9NILvg25Q5rG-I1sbgaiEMy0WXlEAnEKoffbwC7FcTIpU0SJll5VVqS2p0H8n5qsfM8Cjp0ASAgpG4ndQiQ6QmXFWrHRry2kWEyn5KAZI5-fHzuiFINHVZP2mQneLlIAIUTmajM14VqNPQrafcffIlNx6m3eTphzfaz620Epk32AVOpmUHLFvsS5fiU4jUD28UZ6hLyyippPYiz_TDvbA",
                "https://lh3.googleusercontent.com/aida-public/AB6AXuCJIhHNgXJ2OloN04dtM8wHYH4iW6pYaBggu5jjch7ByePOGVE_7BqyAbPF_ItM9THPr1n_sAkMxR1OKkIjmsrIumQKRfF5xhIq1CBIyqmzcslmIwzQzu3Qoat5fEwdoE-MSEq-DoYYiObdBanYKLkNaVdn2VhQN6bxC8FOp98QdzDbYREPL1TuhPVhmvab-jfNdONP1VZb8Rjx-rzS4HmvVbWZd8XBF7gj8i7AKvT52USOMHGYepuAsrxnWQlRFQDXrhYa7_ds4h8",
                "https://lh3.googleusercontent.com/aida-public/AB6AXuD_ukYrPN3-zT7Tf9GjXdyXuFlFqJTK16jzcxywdRnF8sokaFT-5iOn--LDIlWhRZoOiT-qO07Ue-ORuzUzf1zq_t5rdj7Mi03BzkdV3Hsb-0Kbf6joxKhmugyGC0_nJyheoTF2clvWw9KmkvL_v6UoEUV6XHQOy-Nvc8a9oiOzIrWa3aj86-SKHIoueNHQ4y0KpLWHBVQqqLYkmqGZFouhkAIK2sVq0BFYyUHpf8FUuaidixDfFictojjPpT_vzCKuX7bA3jmD3jM"
            ].map((avatar, idx) => (
                <img 
                    key={idx} 
                    alt="Learner avatar" 
                    className="w-8 h-8 rounded-full border border-outline-variant/20 object-cover"
                    src={avatar} 
                />
            ))}
            <div
                className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant/20 text-xs font-label font-bold text-on-surface-variant"
            >
                +12
            </div>
        </div>
    </div>
);

export const RoadmapSidebar = () => {
    return (
        <aside className="lg:col-span-1 flex flex-col gap-8">
            <LabStatus />
            <TopMentors />
            <RecentlyJoined />
        </aside>
    );
};
