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

    // If user is authenticated and trying to access protected routes
    if (user && !PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
        // Check if user has a profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .eq('user_id', user.id)
            .single()

        // If no profile exists, redirect to onboarding
        if (!profile) {
            const url = request.nextUrl.clone()
            url.pathname = '/onboarding'
            return NextResponse.redirect(url)
        }
    }

    return response
}
