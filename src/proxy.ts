import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function redirect(req: NextRequest, pathname: string, search?: URLSearchParams) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  if (search) url.search = search.toString();
  return NextResponse.redirect(url, 307);
}

export function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Legacy -> canonical route redirects (stellarchain.io-compatible)
  if (pathname.startsWith('/transaction/')) {
    return redirect(req, pathname.replace('/transaction/', '/tx/'));
  }

  if (pathname.startsWith('/contract/')) {
    return redirect(req, pathname.replace('/contract/', '/contracts/'));
  }

  if (pathname.startsWith('/account/')) {
    return redirect(req, pathname.replace('/account/', '/address/'));
  }

  if (pathname.startsWith('/known-accounts')) {
    return redirect(req, '/accounts/directory');
  }

  if (pathname.startsWith('/add-label')) {
    return redirect(req, '/accounts/directory/update');
  }

  if (pathname.startsWith('/statistics')) {
    return redirect(req, '/charts');
  }

  // Legacy asset route is ambiguous without issuer; only redirect when we can safely build the canonical slug.
  if (pathname.startsWith('/asset/')) {
    const code = pathname.slice('/asset/'.length);
    const issuer = searchParams.get('issuer');
    if (issuer) {
      return redirect(req, `/assets/${encodeURIComponent(code)}-${encodeURIComponent(issuer)}`);
    }
    if (decodeURIComponent(code).toUpperCase() === 'XLM') {
      return redirect(req, `/assets/XLM-native`);
    }
    // Fall through (keep working locally) if issuer wasn't provided.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|robots.txt|sitemap.xml).*)'],
};
