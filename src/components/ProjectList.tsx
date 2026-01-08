'use client';

import { useState } from 'react';
import { Project } from '@/lib/projects';

interface ProjectListProps {
    initialProjects: Project[];
}

export default function ProjectList({ initialProjects }: ProjectListProps) {
    const [search, setSearch] = useState('');

    const filteredProjects = initialProjects.filter(project => {
        const s = search.toLowerCase();
        return (
            project.name.toLowerCase().includes(s) ||
            project.categories.toLowerCase().includes(s) ||
            project.award.toLowerCase().includes(s)
        );
    });

    return (
        <div className="space-y-6">
            {/* Search */}
            <div className="bg-[var(--bg-secondary)] rounded-2xl p-8 shadow-sm">
                <div className="relative">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search projects by name, category, or award..."
                        className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all pl-11 shadow-inner"
                    />
                    <svg className="w-5 h-5 text-[var(--text-muted)] absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProjects.map((project, index) => (
                    <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        key={index}
                        className="block bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
                    >
                        {/* Background glow effect */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--primary)]/5 blur-3xl rounded-full -mr-10 -mt-10 group-hover:bg-[var(--primary)]/10 transition-colors" />

                        <div className="flex items-start justify-between mb-4 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-lg font-bold text-[var(--primary)] group-hover:scale-110 transition-transform">
                                    {project.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-[var(--text-primary)] font-medium group-hover:text-[var(--primary)] transition-colors truncate max-w-[200px]">
                                        {project.name}
                                    </h3>
                                    <p className="text-[var(--text-muted)] text-xs">
                                        {project.categories}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 relative z-10">
                            <div className="flex flex-col gap-1.5 p-3 rounded bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-[var(--text-muted)]">Funding</span>
                                    <span className="text-[var(--text-primary)] font-mono font-medium">{project.amount}</span>
                                </div>
                                <div className="h-px bg-[var(--border-subtle)]" />
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-[var(--text-muted)]">Award</span>
                                    <span className="text-[var(--text-secondary)] text-right truncate max-w-[140px]" title={project.award}>{project.award}</span>
                                </div>
                            </div>
                        </div>

                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 duration-200">
                            <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </div>
                    </a>
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
