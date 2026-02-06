import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that don't require profile completion
const PUBLIC_ROUTES = ['/', '/auth/signin', '/auth/signup', '/auth/callback', '/onboarding']

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
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const pathname = request.nextUrl.pathname

    // Active session handling:
    // If user is logged in and visits the landing page ('/') or auth pages, redirect to dashboard
    if (user) {
        if (pathname === '/' || pathname.startsWith('/auth/signin') || pathname.startsWith('/auth/signup')) {
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }
    }

    // If user is authenticated and trying to access protected routes
    // We check if the path is NOT a public route (like onboarding)
    if (user && !PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
        // Check if user has a COMPLETE profile
        // We select key fields that mark a profile as "onboarded"
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, selling_category, target_industries')
            .eq('user_id', user.id)
            .single()

        // logic:
        // 1. If no profile record exists -> Redirect
        // 2. If profile exists but missing key fields -> Redirect
        const isProfileComplete =
            profile &&
            profile.role &&
            profile.selling_category &&
            profile.target_industries &&
            profile.target_industries.length > 0

        if (!isProfileComplete) {
            const url = request.nextUrl.clone()
            url.pathname = '/onboarding'
            return NextResponse.redirect(url)
        }
    }

    return response
}
