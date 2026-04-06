/** Line-delimited JSON control + raw SAN chess lines after auth */

export const DEFAULT_CHESS_PORT = 5000;

export type ProbeMsg = { t: 'probe' };
export type HelloMsg = { t: 'hello' };
export type JoinMsg = { t: 'join'; p: string };
export type OkMsg = { t: 'ok' };
export type DenyMsg = { t: 'deny' };

export function encodeLine(obj: object): string {
    return JSON.stringify(obj) + '\n';
}

export function buildInviteUrl(ip: string, port: number, password: string): string {
    const q = new URLSearchParams();
    q.set('ip', ip);
    q.set('port', String(port));
    if (password.length > 0) q.set('pwd', password);
    return `chessoffline://join?${q.toString()}`;
}

export function parseInviteUrl(url: string): { ip: string; port: number; password: string } | null {
    try {
        const qStart = url.indexOf('?');
        const query = qStart >= 0 ? url.slice(qStart + 1) : '';
        if (!query) return null;
        const params = new URLSearchParams(query);
        const ip = params.get('ip');
        const portStr = params.get('port');
        if (!ip || !portStr) return null;
        const port = parseInt(portStr, 10);
        if (Number.isNaN(port)) return null;
        const password = params.get('pwd') ?? '';
        return { ip, port, password };
    } catch {
        return null;
    }
}

/** Also accept pasted query-only strings */
export function parseInviteFromPastedText(text: string): { ip: string; port: number; password: string } | null {
    const t = text.trim();
    const fromUrl = parseInviteUrl(t);
    if (fromUrl) return fromUrl;
    if (t.includes('ip=') && t.includes('port=')) {
        const q = t.startsWith('?') ? t : `?${t}`;
        return parseInviteUrl(`chessoffline://join${q}`);
    }
    return null;
}
