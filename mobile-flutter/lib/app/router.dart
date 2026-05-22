import 'package:go_router/go_router.dart';
import '../core/auth/auth_session.dart';
import '../features/client/auth/client_login_screen.dart';
import '../features/client/home/client_home_screen.dart';
import '../features/client/orders/client_orders_screen.dart';
import '../features/client/designs/client_designs_screen.dart';
import '../features/client/addresses/client_addresses_screen.dart';
import '../features/client/works/client_works_screen.dart';
import '../features/client/works/client_work_detail_screen.dart';
import '../features/client/profile/client_profile_screen.dart';
import '../features/technician/auth/technician_login_screen.dart';
import '../features/technician/home/technician_home_screen.dart';
import '../features/technician/orders/technician_orders_screen.dart';
import '../features/technician/schedule/technician_schedule_screen.dart';
import '../features/technician/customers/technician_customers_screen.dart';
import '../features/technician/customers/technician_customer_detail_screen.dart';
import '../features/technician/works/technician_works_screen.dart';
import '../features/technician/services/technician_services_screen.dart';
import '../features/technician/profile/technician_profile_screen.dart';
import '../features/shared/chat/conversations_screen.dart';
import '../features/shared/chat/chat_screen.dart';
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
        path: '/client/orders',
        builder: (context, state) => const ClientOrdersScreen(),
      ),
      GoRoute(
        path: '/client/designs',
        builder: (context, state) => const ClientDesignsScreen(),
      ),
      GoRoute(
        path: '/client/addresses',
        builder: (context, state) => const ClientAddressesScreen(),
      ),
      GoRoute(
        path: '/client/works',
        builder: (context, state) => const ClientWorksScreen(),
      ),
      GoRoute(
        path: '/client/works/:id',
        builder: (context, state) => ClientWorkDetailScreen(
          workId: int.parse(state.pathParameters['id']!),
        ),
      ),
      GoRoute(
        path: '/client/profile',
        builder: (context, state) => const ClientProfileScreen(),
      ),
      GoRoute(
        path: '/client/chat',
        builder: (context, state) => const ConversationsScreen(),
      ),
      GoRoute(
        path: '/client/chat/:conversationId',
        builder: (context, state) => ChatScreen(
          conversationId: int.parse(state.pathParameters['conversationId']!),
          title: state.uri.queryParameters['title'] ?? '聊天',
        ),
      ),
      GoRoute(
        path: '/technician/login',
        builder: (context, state) => const TechnicianLoginScreen(),
      ),
      GoRoute(
        path: '/technician/home',
        builder: (context, state) => const TechnicianHomeScreen(),
      ),
      GoRoute(
        path: '/technician/schedule',
        builder: (context, state) => const TechnicianScheduleScreen(),
      ),
      GoRoute(
        path: '/technician/orders',
        builder: (context, state) => const TechnicianOrdersScreen(),
      ),
      GoRoute(
        path: '/technician/customers',
        builder: (context, state) => const TechnicianCustomersScreen(),
      ),
      GoRoute(
        path: '/technician/customers/:id',
        builder: (context, state) => TechnicianCustomerDetailScreen(
          customerId: int.parse(state.pathParameters['id']!),
        ),
      ),
      GoRoute(
        path: '/technician/works',
        builder: (context, state) => const TechnicianWorksScreen(),
      ),
      GoRoute(
        path: '/technician/services',
        builder: (context, state) => const TechnicianServicesScreen(),
      ),
      GoRoute(
        path: '/technician/profile',
        builder: (context, state) => const TechnicianProfileScreen(),
      ),
      GoRoute(
        path: '/technician/chat',
        builder: (context, state) => const ConversationsScreen(),
      ),
      GoRoute(
        path: '/technician/chat/:conversationId',
        builder: (context, state) => ChatScreen(
          conversationId: int.parse(state.pathParameters['conversationId']!),
          title: state.uri.queryParameters['title'] ?? '聊天',
        ),
      ),
    ],
  );
}
