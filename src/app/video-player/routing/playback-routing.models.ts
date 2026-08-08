export interface RoutingBackend {
    id: string;
    label: string;
    region?: string;
    availability: string;
    selectable: boolean;
}

export interface BackendListResponse {
    version: number;
    backends: RoutingBackend[];
}

export type RoutingPreference =
    | {mode: 'auto'}
    | {mode: 'backend'; backendId: string};

export interface RouteResponse {
    routeToken: string;
    playbackUrl: string;
    selectedBackend: RoutingBackend;
    selection: {
        mode: string;
        reason: string;
    };
    issuedAt: string;
    freshUntil: string;
    expiresAt: string;
}

export interface ResolvedMediaRoute {
    canonicalUrl: string;
    playbackUrl: string;
    selectedBackend?: RoutingBackend;
    selection?: RouteResponse['selection'];
    routed: boolean;
}
