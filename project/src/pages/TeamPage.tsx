import { useEffect, useState } from 'react';
import { supabase, Profile, Project } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserCircle, Search, FolderKanban } from 'lucide-react';

interface TeamMember extends Profile {
  project_count?: number;
  shared_projects?: Project[];
}

export function TeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchTeamMembers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function fetchTeamMembers() {
    setLoading(true);

    try {
      // Get user's projects
      const { data: ownedProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user!.id);

      const { data: memberProjects } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user!.id);

      const projectIds = [
        ...(ownedProjects?.map((p) => p.id) || []),
        ...(memberProjects?.map((m) => m.project_id) || []),
      ];

      if (projectIds.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      // Get members from these projects
      const { data: projectMembers } = await supabase
        .from('project_members')
        .select(`
          profile:profiles(id, name, avatar_url, created_at)
        `)
        .in('project_id', projectIds);

      // Get owners of these projects
      const { data: projectOwners } = await supabase
        .from('projects')
        .select(`
          owner:profiles(id, name, avatar_url, created_at)
        `)
        .in('id', projectIds);

      // Combine and deduplicate members
      const allMembers: Map<string, TeamMember> = new Map();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      projectMembers?.forEach((pm: any) => {
        const profile = pm.profile as Profile | null;
        if (profile && !allMembers.has(profile.id)) {
          allMembers.set(profile.id, { ...profile, project_count: 0, shared_projects: [] });
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      projectOwners?.forEach((po: any) => {
        const owner = po.owner as Profile | null;
        if (owner && !allMembers.has(owner.id)) {
          allMembers.set(owner.id, { ...owner, project_count: 0, shared_projects: [] });
        }
      });

      setMembers(Array.from(allMembers.values()));
    } catch (error) {
      console.error('Error fetching team members:', error);
    }

    setLoading(false);
  }

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-secondary-900">Team</h1>
        <p className="text-secondary-500 mt-1">People you collaborate with across projects</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search team members..."
          className="input-field pl-10"
        />
      </div>

      {/* Members Grid */}
      {filteredMembers.length === 0 ? (
        <div className="text-center py-16">
          <UserCircle className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 mb-2">
            {searchQuery ? 'No members found' : 'No team members yet'}
          </h3>
          <p className="text-secondary-500 max-w-sm mx-auto">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Add members to your projects to see them here'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <div key={member.id} className="card p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.name}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <UserCircle className="w-8 h-8 text-primary-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-secondary-900">{member.name}</h3>
                  <p className="text-sm text-secondary-500">
                    Member since {new Date(member.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {member.project_count && member.project_count > 0 && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-secondary-100">
                  <FolderKanban className="w-4 h-4 text-secondary-400" />
                  <span className="text-sm text-secondary-600">
                    {member.project_count} shared project{member.project_count > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
