export function middleware(request) {
    // Check if maintenance mode is enabled
    const maintenanceMode = process.env.MAINTENANCE_MODE === '1';
    
    // If maintenance mode is on and not already on the maintenance page
    if (maintenanceMode && !request.nextUrl.pathname.startsWith('/maintenance')) {
      // Allow access to essential assets
      if (
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.includes('/favicon.ico')
      ) {
        return;
      }
      
      // Redirect to maintenance page
      const url = new URL('/maintenance', request.url);
      return Response.redirect(url);
    }
  }
  
  export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
  };