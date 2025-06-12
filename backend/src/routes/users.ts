import { Router } from 'express';
import { UserManagementController } from '../controllers/UserManagementController';
import { authMiddleware } from '../middleware/auth';
import { 
  requirePermission, 
  requireRole, 
  logResourceAccess,
  requireAnyPermission 
} from '../middleware/permissions';

const router = Router();
const userController = new UserManagementController();

// Appliquer l'authentification à toutes les routes
router.use(authMiddleware);

// Routes publiques (pour tous les utilisateurs authentifiés)

/**
 * @route GET /api/users/profile
 * @desc Obtenir son propre profil
 * @access Tous les utilisateurs authentifiés
 */
router.get('/profile', 
  logResourceAccess('user_profile'),
  userController.getMyProfile
);

/**
 * @route PUT /api/users/profile
 * @desc Mettre à jour son propre profil
 * @access Tous les utilisateurs authentifiés
 */
router.put('/profile',
  logResourceAccess('user_profile'),
  userController.updateMyProfile
);

/**
 * @route PUT /api/users/:userId/password
 * @desc Changer le mot de passe (soi-même ou admin)
 * @access Propriétaire ou Admin
 */
router.put('/:userId/password',
  logResourceAccess('user_password'),
  userController.changePassword
);

// Routes d'administration des utilisateurs

/**
 * @route GET /api/users
 * @desc Obtenir la liste des utilisateurs avec filtres
 * @access Admin ou permission users:read
 */
router.get('/',
  requireAnyPermission([
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'admin' }
  ]),
  logResourceAccess('users'),
  userController.getUsers
);

/**
 * @route GET /api/users/stats
 * @desc Obtenir les statistiques des utilisateurs
 * @access Admin ou permission users:admin
 */
router.get('/stats',
  requirePermission('users', 'admin'),
  logResourceAccess('user_stats'),
  userController.getUserStats
);

/**
 * @route GET /api/users/:userId
 * @desc Obtenir un utilisateur par ID
 * @access Admin ou permission users:read
 */
router.get('/:userId',
  requireAnyPermission([
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'admin' }
  ]),
  logResourceAccess('user_detail'),
  userController.getUserById
);

/**
 * @route POST /api/users
 * @desc Créer un nouvel utilisateur
 * @access Admin ou permission users:create
 */
router.post('/',
  requireAnyPermission([
    { resource: 'users', action: 'create' },
    { resource: 'users', action: 'admin' }
  ]),
  logResourceAccess('user_creation'),
  userController.createUser
);

/**
 * @route PUT /api/users/:userId
 * @desc Mettre à jour un utilisateur
 * @access Admin ou permission users:update
 */
router.put('/:userId',
  requireAnyPermission([
    { resource: 'users', action: 'update' },
    { resource: 'users', action: 'admin' }
  ]),
  logResourceAccess('user_update'),
  userController.updateUser
);

/**
 * @route DELETE /api/users/:userId
 * @desc Supprimer un utilisateur (soft delete)
 * @access Admin ou permission users:delete
 */
router.delete('/:userId',
  requireAnyPermission([
    { resource: 'users', action: 'delete' },
    { resource: 'users', action: 'admin' }
  ]),
  logResourceAccess('user_deletion'),
  userController.deleteUser
);

/**
 * @route POST /api/users/:userId/reset-password
 * @desc Réinitialiser le mot de passe d'un utilisateur
 * @access Admin seulement
 */
router.post('/:userId/reset-password',
  requireRole('super_admin', 'admin'),
  logResourceAccess('password_reset'),
  userController.resetPassword
);

/**
 * @route POST /api/users/:userId/toggle-lock
 * @desc Verrouiller/déverrouiller un utilisateur
 * @access Admin seulement
 */
router.post('/:userId/toggle-lock',
  requireRole('super_admin', 'admin'),
  logResourceAccess('user_lock_toggle'),
  userController.toggleUserLock
);

// Routes de gestion des rôles

/**
 * @route GET /api/users/roles/all
 * @desc Obtenir tous les rôles (système + personnalisés)
 * @access Admin ou permission users:read
 */
router.get('/roles/all',
  requireAnyPermission([
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'admin' }
  ]),
  logResourceAccess('roles'),
  userController.getRoles
);

/**
 * @route POST /api/users/roles
 * @desc Créer un rôle personnalisé
 * @access Super Admin seulement
 */
router.post('/roles',
  requireRole('super_admin'),
  logResourceAccess('role_creation'),
  userController.createRole
);

// Routes d'audit de sécurité

/**
 * @route GET /api/users/audit/security-logs
 * @desc Obtenir les logs d'audit de sécurité
 * @access Super Admin ou Admin
 */
router.get('/audit/security-logs',
  requireRole('super_admin', 'admin'),
  logResourceAccess('security_audit'),
  userController.getSecurityAuditLogs
);

export default router; 