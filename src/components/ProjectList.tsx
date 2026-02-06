'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Project } from '@/lib/projects';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface ProjectListProps {
    initialProjects: Project[];
}

export default function ProjectList({ initialProjects }: ProjectListProps) {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const categories = [...new Set(initialProjects.map(p => p.category))].sort();

    const filteredProjects = initialProjects.filter(project => {
        const s = search.toLowerCase();
        const matchesSearch =
            project.name.toLowerCase().includes(s) ||
            project.category.toLowerCase().includes(s) ||
            project.description.toLowerCase().includes(s) ||
            project.scfAward.type.toLowerCase().includes(s);
        const matchesCategory = !selectedCategory || project.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6">
            {/* Search and Filters */}
            <Card className="p-6 shadow-sm space-y-4">
                <div className="relative">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search projects by name, category, or description..."
                        className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all pl-11 shadow-inner"
                    />
                    <svg className="w-5 h-5 text-[var(--text-muted)] absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        onClick={() => setSelectedCategory(null)}
                        variant="pill"
                        className={`rounded-lg text-xs font-medium transition-all ${!selectedCategory ? 'bg-[var(--info)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                    >
                        All
                    </Button>
                    {categories.map(category => (
                        <Button
                            type="button"
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            variant="pill"
                            className={`rounded-lg text-xs font-medium transition-all ${selectedCategory === category ? 'bg-[var(--info)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                        >
                            {category}
                        </Button>
                    ))}
                </div>
            </Card>

            {/* Results Count */}
            <div className="text-sm text-[var(--text-muted)]">
                Showing {filteredProjects.length} of {initialProjects.length} projects
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                    <Link
                        href={`/projects/${project.slug}`}
                        key={project.id}
                        className="block bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
                    >
                        {/* Background glow effect */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--primary)]/5 blur-3xl rounded-full -mr-10 -mt-10 group-hover:bg-[var(--primary)]/10 transition-colors" />

                        <div className="flex items-start justify-between mb-3 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-lg font-bold text-[var(--primary)] group-hover:scale-110 transition-transform">
                                    {project.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-[var(--text-primary)] font-medium group-hover:text-[var(--primary)] transition-colors line-clamp-1">
                                        {project.name}
                                    </h3>
                                    <Badge className="rounded-md">{project.category}</Badge>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-[var(--text-muted)] text-xs leading-relaxed mb-4 line-clamp-2 relative z-10">
                            {project.description}
                        </p>

                        <div className="space-y-3 relative z-10">
                            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-[var(--text-muted)]">Funding</span>
                                    <span className="text-[var(--text-primary)] font-mono font-medium">{project.scfAward.amount}</span>
                                </div>
                                <div className="h-px bg-[var(--border-subtle)]" />
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-[var(--text-muted)]">Award</span>
                                    <span className="text-[var(--text-secondary)] text-right truncate max-w-[140px]" title={`${project.scfAward.type} - ${project.scfAward.round}`}>
                                        {project.scfAward.type}
                                    </span>
                                </div>
                            </div>

                            {/* Quick Links */}
                            <div className="flex items-center justify-between">
                                <div className="flex gap-2">
                                    {project.website && (
                                        <span className="p-1.5 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                            </svg>
                                        </span>
                                    )}
                                    {project.github && (
                                        <span className="p-1.5 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                            </svg>
                                        </span>
                                    )}
                                </div>

                                {/* Team count and arrow */}
                                <div className="flex items-center gap-2">
                                    {project.team.length > 0 && (
                                        <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            {project.team.length}
                                        </span>
                                    )}
                                    <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
                {filteredProjects.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                        <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <h3 className="text-[var(--text-primary)] font-medium mb-1">No projects found</h3>
                        <p className="text-[var(--text-muted)] text-sm max-w-md mx-auto">
                            We couldn't find any projects matching your search.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
