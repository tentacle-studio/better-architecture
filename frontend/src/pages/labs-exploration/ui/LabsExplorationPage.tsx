import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Input } from "@/shared/ui/input"
import { Button } from "@/shared/ui/button"
import {
    Search,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Bell,
    Menu,
    CheckCircle2,
    PlayCircle,
    BookOpen,
    TrendingUp,
    List,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { getLabs } from "@entities/lab"
import type { Lab, DifficultyLevel, LabStatus } from "@entities/lab"

// ─── Types ───────────────────────────────────────────────────────────────────

interface TrendingSkill {
    name: string
    percentage: number
}

// ─── Static data (page-local, single use) ────────────────────────────────────

const TRENDING_SKILLS: TrendingSkill[] = [
    { name: "Docker",     percentage: 100 },
    { name: "Kubernetes", percentage: 90 },
    { name: "React",      percentage: 80 },
    { name: "Node.js",    percentage: 50 },
    { name: "SQL",        percentage: 30 },
]

const CAROUSEL_CARDS = [
    {
        title: "AWS Cloud Basics",
        gradient: "from-indigo-200 to-purple-100",
        textColor: "text-indigo-900",
        icon: (
            <svg className="w-24 h-24 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
                <path d="M12 12v6m0 0l-2-2m2 2l2-2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
            </svg>
        ),
    },
    {
        title: "Cybersecurity Fundamentals",
        gradient: "from-blue-200 to-indigo-100",
        textColor: "text-blue-900",
        icon: (
            <svg className="w-24 h-24 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
            </svg>
        ),
    },
    {
        title: "Python for Data Science",
        gradient: "from-white to-white",
        textColor: "text-slate-800",
        border: true,
        icon: (
            <svg className="w-20 h-20 text-indigo-700" fill="currentColor" viewBox="0 0 128 128">
                <path d="M64 6.72c-29.088 0-27.776 12.576-27.776 12.576l.032 13.12h28.16v4.064H30.432C15.008 36.48 12.096 48.512 12.096 61.28c0 13.984 2.496 23.36 15.392 23.36h12.192v-16.8c0-8.992 7.424-16.32 16.48-16.32h28.32c4.352 0 7.84-3.52 7.84-7.84V20.256c0-4.352-3.52-7.84-7.84-7.84H64zm-14.56 9.088a4.416 4.416 0 110 8.832 4.416 4.416 0 010-8.832zm49.92 19.392h-12.16v16.832c0 8.96-7.424 16.32-16.48 16.32H42.432c-4.32 0-7.84 3.52-7.84 7.84V93.44c0 4.352 3.52 7.84 7.84 7.84H64c29.088 0 27.808-12.576 27.808-12.576l-.032-13.12h-28.16V71.52h33.984c15.424 0 18.336-12.032 18.336-24.8 0-13.984-2.496-23.36-15.392-23.36zm-20.8 52.896a4.416 4.416 0 110 8.832 4.416 4.416 0 010-8.832z" />
            </svg>
        ),
    },
    {
        title: "Machine Learning 101",
        gradient: "from-white to-white",
        textColor: "text-slate-800",
        border: true,
        icon: (
            <svg className="w-20 h-20 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 0v18m0-18c-2.485 0-4.5 4.03-4.5 9s2.015 9 4.5 9m0-18c2.485 0 4.5 4.03 4.5 9s-2.015 9-4.5 9" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} />
                <circle cx="12" cy="12" fill="currentColor" r="3" />
            </svg>
        ),
    },
    {
        title: "Full-Stack Development",
        gradient: "from-white to-white",
        textColor: "text-slate-800",
        border: true,
        icon: (
            <svg className="w-20 h-20 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect height="14" rx="2" strokeWidth={1.5} width="18" x="3" y="5" />
                <path d="M3 9h18M8 13h4M8 16h8" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
            </svg>
        ),
    },
]

// ─── Sub-components (page-local, single use) ─────────────────────────────────

function DifficultyBadge({ difficulty }: { difficulty: DifficultyLevel }) {
    const styles: Record<DifficultyLevel, string> = {
        easy:   "bg-emerald-100 text-emerald-600",
        medium: "bg-orange-100 text-orange-600",
        hard:   "bg-rose-100 text-rose-600",
    }
    const labels: Record<DifficultyLevel, string> = {
        easy: "Easy", medium: "Medium", hard: "Hard",
    }
    return (
        <span className={cn("px-3 py-1 rounded-full text-xs font-bold", styles[difficulty])}>
            {labels[difficulty]}
        </span>
    )
}


function LabStatusIcon({ status }: { status: LabStatus }) {
    const base = "w-6 h-6 bg-[#41397b] rounded-full flex items-center justify-center text-white shrink-0"
    if (status === "completed") {
        return (
            <div className={base}>
                <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
        )
    }
    return (
        <div className={base}>
            <PlayCircle className="w-3.5 h-3.5" />
        </div>
    )
}

function TrendingSkillBar({ skill }: { skill: TrendingSkill }) {
    return (
        <div>
            <div className="flex justify-between text-xs mb-2">
                <span className="font-bold text-gray-700">{skill.name}</span>
                <span className="text-gray-400">{skill.percentage}%</span>
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div
                    className="bg-[#41397b] h-full rounded-full"
                    style={{ width: `${skill.percentage}%` }}
                />
            </div>
        </div>
    )
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function LabsExplorationPage() {
    const navigate = useNavigate()
    const [search, setSearch] = useState("")
    const [carouselIndex, setCarouselIndex] = useState(0)
    const [labs, setLabs] = useState<Lab[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        getLabs()
            .then((data) => { setLabs(data); setLoading(false) })
            .catch(() => { setError("Failed to load labs."); setLoading(false) })
    }, [])

    const visibleCards = CAROUSEL_CARDS.slice(carouselIndex, carouselIndex + 5)

    const filteredLabs = labs.filter((lab) =>
        lab.title.toLowerCase().includes(search.toLowerCase()) ||
        lab.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    )

    return (
        <div className="min-h-screen bg-[#f8f9fc] text-[#1e293b] font-sans">

            {/* ── Header ── */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-50 px-8 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-10">
                    {/* Logo */}
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xl italic bg-gradient-to-br from-blue-600 to-blue-400">
                            L
                        </div>
                        <span className="text-xl font-bold tracking-tight text-gray-800">LearnLab</span>
                    </div>

                    {/* Nav */}
                    <nav className="hidden md:flex space-x-8 text-sm font-medium text-gray-500">
                        <a href="#" className="hover:text-gray-900 transition">Explore</a>
                        <a href="#" className="text-gray-900 pb-1 border-b-2 border-indigo-600 font-semibold">Labs</a>
                        <a href="#" className="hover:text-gray-900 transition">Community</a>
                        <a href="#" className="hover:text-gray-900 transition">Pricing</a>
                    </nav>
                </div>

                {/* Right actions */}
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            className="bg-gray-100/80 border border-gray-200/50 rounded-full py-2 pl-10 pr-4 text-sm w-56 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
                            placeholder="Search"
                        />
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                        <Menu className="w-6 h-6" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-600 relative">
                        <Bell className="w-6 h-6" />
                    </button>
                    <img
                        alt="User Profile"
                        className="w-8 h-8 rounded-full border-2 border-gray-100 object-cover"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVf-LjTwUOIXJ-QaHNuZwFkYalpmwIk3Qdncnqf7bYEg9-ghE4Rdqs96PZKYqj1QzrgtRdetpo8RHqFufvTWpFamV9SvIsXAiZTkfYAV2qwDFHtIjSakoXUHqmwbCy24zjkYujaEaPMGjygUJDoeWMJ6eIHxr4whF0JwicWqVL3w5GYKqTqvYQUR7_FE_Wi8Z_6sWh7geqBTG0cgMW60_wuTrE0QxOqzkP5OSwb7YZbgW5kGXCLbscU49UuTXxZtaW4jwW0QLhN1s"
                    />
                </div>
            </header>

            <main className="max-w-[1440px] mx-auto p-8 space-y-8">

                {/* ── Featured Carousel ── */}
                <section className="relative">
                    <div className="flex items-center space-x-4 overflow-x-hidden">
                        {visibleCards.map((card, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "min-w-[240px] flex-1 rounded-[2rem] p-6 h-40 flex flex-col justify-between relative overflow-hidden shadow-sm",
                                    `bg-gradient-to-br ${card.gradient}`,
                                    card.border && "border border-gray-100"
                                )}
                            >
                                <div className={cn("z-10 font-bold text-lg leading-tight w-2/3", card.textColor)}>
                                    {card.title}
                                </div>
                                <div className="absolute -right-2 top-2 opacity-100">
                                    {card.icon}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination dots */}
                    <div className="flex justify-center space-x-2 mt-4">
                        {CAROUSEL_CARDS.map((_, i) => (
                            <span
                                key={i}
                                onClick={() => setCarouselIndex(i)}
                                className={cn(
                                    "h-2 rounded-full cursor-pointer transition-all",
                                    i === carouselIndex ? "w-4 bg-indigo-300" : "w-2 bg-gray-200"
                                )}
                            />
                        ))}
                    </div>

                    {/* Arrows */}
                    <button
                        onClick={() => setCarouselIndex((p) => Math.max(0, p - 1))}
                        className="absolute left-[-20px] top-[40%] -translate-y-1/2 bg-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center border border-gray-100 disabled:opacity-30"
                        disabled={carouselIndex === 0}
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <button
                        onClick={() => setCarouselIndex((p) => Math.min(CAROUSEL_CARDS.length - 1, p + 1))}
                        className="absolute right-[-20px] top-[40%] -translate-y-1/2 bg-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center border border-gray-100 disabled:opacity-30"
                        disabled={carouselIndex === CAROUSEL_CARDS.length - 1}
                    >
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                </section>

                {/* ── 3-col layout ── */}
                <div className="grid grid-cols-12 gap-8">

                    {/* ── Left Sidebar ── */}
                    <aside className="col-span-12 lg:col-span-2 space-y-6">
                        {/* Profile mini-card */}
                        <div className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex items-center space-x-3">
                            <img
                                alt="The Scholar"
                                className="w-12 h-12 rounded-lg object-cover"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDflDt0e6a8g_sgnjoq0xrzMHqKg2tM5gL23AB73nByVb4CROwx61Dzv_uKQV_KxiwY0ae8i44-Z9EsRgkuD8vduORBJpp2UW-xZ3GyYtOWWvqzCWTY0AXfOGYx-Br2NYgW9h2LD97_4kJG9jhCJEx4F9Do32M2phyPyMwBix5J8VpM58vxCnJ-TdZ57oAO2XcMnjW6zM9hfYDI7cfxkuDqRc-d6uAuCbaSK_qxNArdRwzveP1iQfaaOXOJlxCAMZsxGcmv_MYhREg"
                            />
                            <div>
                                <div className="text-sm font-bold">The Scholar</div>
                                <div className="text-xs text-gray-400">Profile</div>
                            </div>
                        </div>

                        {/* Sidebar nav */}
                        <nav className="space-y-1">
                            <a href="#" className="flex items-center space-x-3 bg-indigo-50 text-indigo-600 p-3 rounded-xl font-medium">
                                <BookOpen className="w-5 h-5" />
                                <span>Library</span>
                            </a>
                            <a href="#" className="flex items-center space-x-3 text-gray-500 p-3 rounded-xl hover:bg-gray-50 transition">
                                <TrendingUp className="w-5 h-5" />
                                <span>Paths</span>
                            </a>
                            <a href="#" className="flex items-center space-x-3 text-gray-500 p-3 rounded-xl hover:bg-gray-50 transition">
                                <List className="w-5 h-5" />
                                <span>Personal Lists</span>
                            </a>
                        </nav>
                    </aside>

                    {/* ── Main Content ── */}
                    <section className="col-span-12 lg:col-span-7 space-y-6">
                        <h1 className="text-2xl font-bold">Labs</h1>

                        {/* Search + Filter */}
                        <div className="flex items-center space-x-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-100"
                                    placeholder="Search labs..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" className="rounded-xl px-4 py-3 text-sm font-medium flex items-center space-x-2">
                                <ArrowUpDown className="w-4 h-4" />
                                <span>Filter</span>
                            </Button>
                        </div>

                        {/* Labs Table */}
                        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 font-medium text-gray-400 uppercase tracking-wider text-[11px]">Title</th>
                                        <th className="px-6 py-4 font-medium text-gray-400 uppercase tracking-wider text-[11px]">Difficulty</th>
                                        <th className="px-6 py-4 font-medium text-gray-400 uppercase tracking-wider text-[11px]">Tags</th>
                                        <th className="px-6 py-4 font-medium text-gray-400 uppercase tracking-wider text-[11px]">Est. Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-400">
                                                Loading labs…
                                            </td>
                                        </tr>
                                    )}
                                    {!loading && error && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-10 text-center text-sm text-rose-500">
                                                {error}
                                            </td>
                                        </tr>
                                    )}
                                    {!loading && !error && filteredLabs.map((lab, index) => (
                                        <tr
                                            key={lab.id}
                                            className="hover:bg-gray-50 transition cursor-pointer"
                                            onClick={() => navigate(`/labs/${lab.id}`)}
                                        >
                                            <td className="px-6 py-5">
                                                <div className="flex items-center space-x-3">
                                                    <LabStatusIcon status={lab.status} />
                                                    <span className="text-gray-800">Lab {index + 1}. {lab.title}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <DifficultyBadge difficulty={lab.difficulty} />
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-wrap gap-1">
                                                    {lab.tags.map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className="bg-slate-100 text-gray-500 px-2 py-1 rounded text-[10px] font-bold"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-gray-400 text-xs">
                                                {lab.estimatedMin} min
                                            </td>
                                        </tr>
                                    ))}
                                    {!loading && !error && filteredLabs.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-400">
                                                No labs match your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* ── Right Sidebar ── */}
                    <aside className="col-span-12 lg:col-span-3 space-y-8">
                        {/* Daily Progress Calendar */}
                        <div className="bg-white rounded-3xl p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold">Daily Progress</h3>
                                <div className="flex space-x-4 text-gray-400">
                                    <button><ChevronLeft className="w-4 h-4" /></button>
                                    <button><ChevronRight className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <div className="grid grid-cols-7 gap-y-3 text-center text-xs">
                                {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
                                    <span key={d} className="text-gray-400 font-medium">{d}</span>
                                ))}
                                {/* offset */}
                                {Array.from({ length: 7 }, (_, i) => <span key={`off-${i}`} className="py-2" />)}
                                {/* day 5 */}
                                <span className="py-2 font-semibold">5</span>
                                {/* days 6-9 completed */}
                                {[6,7,8,9].map((d) => (
                                    <span key={d} className="py-2 bg-indigo-600 text-white rounded-lg font-semibold flex items-center justify-center">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </span>
                                ))}
                                {/* days 10-30 */}
                                {Array.from({ length: 21 }, (_, i) => (
                                    <span key={i + 10} className="py-2 font-semibold">{i + 10}</span>
                                ))}
                                <span className="py-2" /><span className="py-2" />
                            </div>
                        </div>

                        {/* Trending Skills */}
                        <div className="bg-white rounded-3xl p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
                            <h3 className="font-bold mb-6">Trending Skills</h3>
                            <div className="space-y-5">
                                {TRENDING_SKILLS.map((skill) => (
                                    <TrendingSkillBar key={skill.name} skill={skill} />
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    )
}
