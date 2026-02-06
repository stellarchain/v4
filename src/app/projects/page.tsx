
import { fetchProjects } from '@/lib/projects';
import ProjectList from '@/components/ProjectList';
import Badge from '@/components/ui/Badge';

export const revalidate = 3600;

export default async function ProjectsPage() {
    const projects = await fetchProjects();

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Ecosystem Projects</h1>
                        <Badge>Directory</Badge>
                    </div>
                    <p className="text-[var(--text-muted)] text-xs">Discover applications and services built on Stellar</p>
                </div>
            </div>

            <ProjectList initialProjects={projects} />
        </div>
    );
}
