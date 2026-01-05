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
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
                <div className="relative">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search projects by name, category, or award..."
                        className="w-full bg-[#111] border border-[#222] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#BFF549] transition-colors pl-11"
                    />
                    <svg className="w-5 h-5 text-[#555] absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProjects.map((project, index) => (
                    <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        key={index}
                        className="block bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5 hover:bg-[#151515] hover:border-[#BFF549]/30 transition-all group relative overflow-hidden"
                    >
                        {/* Background glow effect */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#BFF549]/5 blur-3xl rounded-full -mr-10 -mt-10 group-hover:bg-[#BFF549]/10 transition-colors" />

                        <div className="flex items-start justify-between mb-4 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#222] to-[#111] border border-[#222] flex items-center justify-center text-sm font-bold text-white group-hover:text-[#BFF549] transition-colors">
                                    {project.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-white font-medium group-hover:text-[#BFF549] transition-colors truncate max-w-[200px]">
                                        {project.name}
                                    </h3>
                                    <p className="text-[#666] text-xs">
                                        {project.categories}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 relative z-10">
                            <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#111] border border-[#1a1a1a]">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-[#555]">Funding</span>
                                    <span className="text-white font-mono">{project.amount}</span>
                                </div>
                                <div className="h-px bg-[#222]" />
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-[#555]">Award</span>
                                    <span className="text-[#888] text-right truncate max-w-[140px]" title={project.award}>{project.award}</span>
                                </div>
                            </div>
                        </div>

                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 duration-200">
                            <svg className="w-4 h-4 text-[#BFF549]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </div>
                    </a>
                ))}
                {filteredProjects.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                        <div className="w-16 h-16 bg-[#1a1a1a] rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-[#444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <h3 className="text-white font-medium mb-1">No projects found</h3>
                        <p className="text-[#666] text-sm max-w-md mx-auto">
                            We couldn't find any projects matching your search.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
