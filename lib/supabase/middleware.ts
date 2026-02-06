import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Route Configuration for Authentication & Onboarding
 * 
 * UNAUTHENTICATED_ROUTES: Public pages accessible without login
 * AUTH_PAGES: Login/signup pages - redirect TO dashboard if already logged in
 * ONBOARDING_EXEMPT: Routes that don't require profile completion
 * API routes are auto-excluded from profile checks for performance
 */
const UNAUTHENTICATED_ROUTES = ['/', '/platform', '/auth/callback']
const AUTH_PAGES = ['/auth/signin', '/auth/signup']
const ONBOARDING_EXEMPT = ['/onboarding', '/auth/callback', '/api']

/**
 * Helper to check if pathname matches any route in the list
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
    return routes.some(route => pathname === route || pathname.startsWith(route + '/'))
}

/**
 * Check if a profile has all required fields for onboarding completion
 * Must match the required fields in types/schema.ts ProfileSchema
 */
function isProfileComplete(profile: any): boolean {
    if (!profile) return false

    return Boolean(
        profile.full_name?.trim() &&
        profile.role?.trim() &&
        profile.selling_category?.trim() &&
        profile.selling_description?.trim() &&
        Array.isArray(profile.target_industries) && profile.target_industries.length > 0 &&
        Array.isArray(profile.target_size_band) && profile.target_size_band.length > 0 &&
        Array.isArray(profile.typical_buyer_personas) && profile.typical_buyer_personas.length > 0
    )
}

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options })
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    })
                    response.cookies.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options })
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    })
                    response.cookies.set({ name, value: '', ...options })
                },
            },
        }
    )

    const pathname = request.nextUrl.pathname

    // Skip auth logic for API routes (performance optimization)
    // API routes handle their own authentication
    if (pathname.startsWith('/api')) {
        return response
    }

    // Get current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // Handle authentication errors gracefully
    if (authError) {
        console.error('[Middleware] Auth error:', authError.message)
        // Continue without user - they'll be treated as unauthenticated
    }

    // --- UNAUTHENTICATED USER LOGIC ---
    if (!user) {
        // Allow access to public routes and auth pages
        if (matchesRoute(pathname, [...UNAUTHENTICATED_ROUTES, ...AUTH_PAGES])) {
            return response
        }

        // Redirect unauthenticated users to sign in for protected routes
        const url = request.nextUrl.clone()
        url.pathname = '/auth/signin'
        url.searchParams.set('redirect', pathname) // Remember where they wanted to go
        return NextResponse.redirect(url)
    }

    // --- AUTHENTICATED USER LOGIC ---

    // Redirect logged-in users away from landing page and auth pages
    if (pathname === '/' || matchesRoute(pathname, AUTH_PAGES)) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    // Skip profile check for onboarding-exempt routes
    if (matchesRoute(pathname, ONBOARDING_EXEMPT)) {
        return response
    }

    // Check profile completion for protected routes
    try {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, role, selling_category, selling_description, target_industries, target_size_band, typical_buyer_personas')
            .eq('user_id', user.id)
            .single()

        if (profileError && profileError.code !== 'PGRST116') {
            // PGRST116 = no rows found (expected for new users)
            console.error('[Middleware] Profile query error:', profileError.message)
            // On DB error, allow access but log it (fail open for UX, but monitor)
        }

        if (!isProfileComplete(profile)) {
            const url = request.nextUrl.clone()
            url.pathname = '/onboarding'
            return NextResponse.redirect(url)
        }
    } catch (err) {
        console.error('[Middleware] Unexpected error:', err)
        // Fail open - allow access but log for monitoring
    }

    return response
}
