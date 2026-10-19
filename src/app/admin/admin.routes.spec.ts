import { adminRoutes } from './admin.routes';
import { User } from '../entity/user';

describe('admin storage migration routes', () => {
    it('requires SuperAdmin for dashboard and run detail', () => {
        const children = adminRoutes[0].children || [];
        const migrationRoutes = children.filter(route => route.path?.startsWith('storage-migration'));

        expect(migrationRoutes.length).toBe(2);
        expect(migrationRoutes.every(route => route.data?.['minRole'] === User.SUPER_ADMIN_ROLE)).toBeTrue();
        expect(migrationRoutes.every(route => (route.canActivate?.length || 0) > 0)).toBeTrue();
    });
});