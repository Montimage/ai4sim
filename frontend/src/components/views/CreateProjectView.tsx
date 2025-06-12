import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../store/projectStore';
import { useThemeStore } from '../../store/themeStore';
import { Card } from '../shared/UI/Card';
import { Button } from '../shared/UI/Button';
import { 
  PlusIcon, 
  XMarkIcon,
  DocumentPlusIcon,
  MagnifyingGlassIcon,
  ArrowTopRightOnSquareIcon,
  UsersIcon,
  ChartBarIcon,
  FolderIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { CardHeader, CardBody, StatusBadge } from '../shared/UI';

interface ProjectFormData {
  name: string;
  description: string;
}

export const CreateProjectView: React.FC = () => {
  const navigate = useNavigate();
  const theme = useThemeStore(state => state.theme);
  const { projects, createProject, deleteProject, isLoading, error, fetchProjects } = useProjectStore();
  
  // Form States
  const [projectForm, setProjectForm] = useState<ProjectFormData>({ name: '', description: '' });
  const [formErrors, setFormErrors] = useState<Partial<ProjectFormData>>({});
  
  // UI States
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const validateForm = (): boolean => {
    const errors: Partial<ProjectFormData> = {};
    if (!projectForm.name.trim()) {
      errors.name = 'Project name is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProjectFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await createProject({
        name: projectForm.name,
        description: projectForm.description,
        owner: {
          _id: '',
          username: ''
        },
        sharedWith: [],
        campaigns: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      setSuccessMessage('Project created successfully!');
      setProjectForm({ name: '', description: '' });
      setShowProjectForm(false);

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject(projectId);
        setSuccessMessage('Project deleted successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err) {
        console.error('Failed to delete project:', err);
      }
    }
  };

  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getProjectStats = (project: any) => {
    const campaignCount = project.campaigns?.length || 0;
    let scenarioCount = 0;
    
    project.campaigns?.forEach((campaign: any) => {
      scenarioCount += campaign.scenarios?.length || 0;
    });

    return { campaignCount, scenarioCount };
  };

  return (
    <div className="space-y-8 max-h-full overflow-y-auto">
        {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
          <div className="flex items-center justify-between">
            <div>
            <h1 className="heading-1">Project Management</h1>
            <p className="text-body">
              Manage and monitor your security testing projects
            </p>
            </div>
          <Button
            variant="primary"
            icon={<DocumentPlusIcon className="w-5 h-5" />}
              onClick={() => setShowProjectForm(true)}
              disabled={isLoading}
            >
              New Project
          </Button>
        </div>
      </motion.div>

      {/* Success/Error Messages */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            className="p-4 rounded-xl bg-green-500/10 border border-green-500/20"
            >
            <p className="text-sm text-green-400">{successMessage}</p>
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            className="p-4 rounded-xl bg-red-500/10 border border-red-500/20"
            >
            <p className="text-sm text-red-400">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                  theme === 'light' ? 'text-slate-400' : 'text-white/40'
                }`} />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${theme === 'light' ? 'text-slate-600' : 'text-white/60'}`}>
                  {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <div className="loading-spinner w-6 h-6" />
            <span className={theme === 'light' ? 'text-slate-600' : 'text-white/60'}>
              Loading projects...
            </span>
          </div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="text-center py-12">
            <CardBody>
              <FolderIcon className={`w-16 h-16 mx-auto mb-4 ${
                theme === 'light' ? 'text-slate-400' : 'text-white/40'
              }`} />
              <h3 className="heading-3 mb-2">
                {searchTerm ? 'No projects found' : 'No projects'}
              </h3>
              <p className="text-body mb-6">
                {searchTerm 
                  ? 'Try adjusting your search criteria'
                  : 'Start by creating your first security testing project'
                }
              </p>
              {!searchTerm && (
                <Button
                  variant="primary"
                  icon={<PlusIcon className="w-4 h-4" />}
                  onClick={() => setShowProjectForm(true)}
                >
                  Create Project
                </Button>
              )}
            </CardBody>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {filteredProjects.map((project, index) => {
            const stats = getProjectStats(project);
            return (
              <motion.div
                key={project._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card hover className="h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-blue-500/20">
                          <FolderIcon className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="heading-4 mb-0 truncate">{project.name}</h3>
                          <p className={`text-small ${theme === 'light' ? 'text-slate-600' : 'text-white/60'}`}>
                            Created on {formatDate(project.createdAt)}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status="success" size="sm">
                        Active
                      </StatusBadge>
                    </div>
                  </CardHeader>
                  
                  <CardBody>
                    <p className="text-body mb-4 line-clamp-2">
                      {project.description || 'No description available'}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className={`text-center p-3 rounded-lg ${
                        theme === 'light' ? 'bg-slate-50' : 'bg-white/5'
                      }`}>
                        <ChartBarIcon className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                        <p className={`text-lg font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                          {stats.campaignCount}
                        </p>
                        <p className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-white/60'}`}>
                          Campaigns
                        </p>
                      </div>
                      <div className={`text-center p-3 rounded-lg ${
                        theme === 'light' ? 'bg-slate-50' : 'bg-white/5'
                      }`}>
                        <UsersIcon className="w-5 h-5 text-green-400 mx-auto mb-1" />
                        <p className={`text-lg font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                          {stats.scenarioCount}
                        </p>
                        <p className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-white/60'}`}>
                          Scenarios
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="primary"
                        size="sm"
                        fullWidth
                        icon={<ArrowTopRightOnSquareIcon className="w-4 h-4" />}
                        onClick={() => navigate(`/projects/${project._id}`)}
                      >
                        Open
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<TrashIcon className="w-4 h-4" />}
                        onClick={() => handleDeleteProject(project._id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Project Creation Modal */}
      <AnimatePresence>
        {showProjectForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowProjectForm(false)}
          >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <h2 className="heading-3 mb-0">Create New Project</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<XMarkIcon className="w-4 h-4" />}
                      onClick={() => setShowProjectForm(false)}
                    >
                      Close
                    </Button>
                  </div>
                </CardHeader>

                <CardBody>
                  <form onSubmit={handleProjectFormSubmit} className="space-y-6">
                    <div className="input-group">
                      <label className="input-label">
                        Project Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={projectForm.name}
                        onChange={(e) => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
                        className={`input ${formErrors.name ? 'input-error' : ''}`}
                        placeholder="Enter project name"
                        autoFocus
                      />
                      {formErrors.name && (
                        <p className="text-sm text-red-400 mt-1">{formErrors.name}</p>
                      )}
                    </div>

                    <div className="input-group">
                      <label className="input-label">Description</label>
                      <textarea
                        rows={4}
                        value={projectForm.description}
                        onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                        className="input resize-none"
                        placeholder="Describe your project and its objectives..."
                      />
                      <p className={`text-xs mt-1 ${theme === 'light' ? 'text-slate-600' : 'text-white/60'}`}>
                        A good description will help your team understand the project's purpose.
                      </p>
                    </div>

                    <div className="flex space-x-3">
                      <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        loading={isLoading}
                        icon={<DocumentPlusIcon className="w-4 h-4" />}
                      >
                        Create Project
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowProjectForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardBody>
              </Card>
              </motion.div>
                </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CreateProjectView;
