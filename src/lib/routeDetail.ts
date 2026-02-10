interface QueryParamsLike {
  get(key: string): string | null;
}

interface DetailRouteValueOptions {
  pathname: string;
  searchParams: QueryParamsLike;
  queryKey: string;
  aliases: string[];
  routeParam?: string;
}

function normalizePathPrefix(prefix: string): string {
  const clean = prefix.trim().replace(/\/+$/, '');
  return clean.startsWith('/') ? clean : `/${clean}`;
}

function extractFromPathAliases(pathname: string, aliases: string[]): string {
  const cleanPath = pathname.replace(/\/+$/, '');

  for (const alias of aliases) {
    const base = normalizePathPrefix(alias);
    const matchPrefix = `${base}/`;

    if (cleanPath.startsWith(matchPrefix)) {
      return cleanPath.slice(matchPrefix.length).trim();
    }
  }

  return '';
}

export function getDetailRouteValue({
  pathname,
  searchParams,
  queryKey,
  aliases,
  routeParam,
}: DetailRouteValueOptions): string {
  const fromQuery = (searchParams.get(queryKey) || '').trim();
  if (fromQuery) return fromQuery;

  const fromRouteParam = (routeParam || '').trim();
  if (fromRouteParam) return fromRouteParam;

  return extractFromPathAliases(pathname, aliases);
}

