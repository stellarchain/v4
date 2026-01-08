import projectsData from '@/data/projects.json';

export interface TeamMember {
    name: string;
    role: string;
    github?: string;
    linkedin?: string;
    twitter?: string;
    discord?: string;
}

export interface SCFAward {
    amount: string;
    round: string;
    type: string;
}

export interface ProjectSocials {
    twitter?: string;
    linkedin?: string;
    discord?: string;
    telegram?: string;
    instagram?: string;
    medium?: string;
    youtube?: string;
}

export interface ProjectResources {
    video: string | null;
    pitchDeck: string | null;
    technicalDocs: string | null;
}

export interface Project {
    id: string;
    slug: string;
    name: string;
    description: string;
    category: string;
    website: string | null;
    github: string | null;
    socials: ProjectSocials;
    scfAward: SCFAward;
    team: TeamMember[];
    resources: ProjectResources;
}

export async function fetchProjects(): Promise<Project[]> {
    return projectsData.projects as Project[];
}

export async function fetchProjectBySlug(slug: string): Promise<Project | null> {
    const project = projectsData.projects.find(p => p.slug === slug);
    return (project as Project) || null;
}

export async function fetchProjectById(id: string): Promise<Project | null> {
    const project = projectsData.projects.find(p => p.id === id);
    return (project as Project) || null;
}

export function getCategories(): string[] {
    return projectsData.categories;
}

export function getProjectsMeta() {
    return projectsData.meta;
}
