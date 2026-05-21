import 'package:go_router/go_router.dart';
import '../core/auth/auth_session.dart';
import '../features/client/auth/client_login_screen.dart';
import '../features/client/home/client_home_screen.dart';
import '../features/technician/auth/technician_login_screen.dart';
import '../features/technician/home/technician_home_screen.dart';
import 'role_select_screen.dart';

GoRouter createRouter(AuthSession authSession) {
  return GoRouter(
    initialLocation: '/',
    refreshListenable: authSession,
    redirect: (context, state) {
      final status = authSession.status;
      final location = state.matchedLocation;

      if (status == AuthStatus.unknown) return null;

      final authRoutes = ['/client/login', '/technician/login', '/role-select'];
      final isOnAuthRoute = authRoutes.contains(location);

      if (status == AuthStatus.unauthenticated) {
        if (isOnAuthRoute) return null;
        return '/role-select';
      }

      if (status == AuthStatus.client) {
        if (location.startsWith('/client/login') || location == '/role-select' || location == '/technician/login') {
          return '/client/home';
        }
      }

      if (status == AuthStatus.technician) {
        if (location.startsWith('/technician/login') || location == '/role-select' || location == '/client/login') {
          return '/technician/home';
        }
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        redirect: (_, __) => '/role-select',
      ),
      GoRoute(
        path: '/role-select',
        builder: (context, state) => const RoleSelectScreen(),
      ),
      GoRoute(
        path: '/client/login',
        builder: (context, state) => const ClientLoginScreen(),
      ),
      GoRoute(
        path: '/client/home',
        builder: (context, state) => const ClientHomeScreen(),
      ),
      GoRoute(
        path: '/technician/login',
        builder: (context, state) => const TechnicianLoginScreen(),
      ),
      GoRoute(
        path: '/technician/home',
        builder: (context, state) => const TechnicianHomeScreen(),
      ),
    ],
  );
}