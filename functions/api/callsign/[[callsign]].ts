/**
 * CF Pages Function: Callsign Lookup API
 * Route: /api/callsign/:callsign
 *
 * Queries QRZ.com XML API for callsign data.
 * Environment variables needed: QRZ_USERNAME, QRZ_PASSWORD
 */

interface CallsignResponse {
	callsign: string;
	name?: string;
	address?: string;
	grid_square?: string;
	dxcc?: number;
	country?: string;
	cq_zone?: number;
	itu_zone?: number;
	lat?: number;
	lon?: number;
}

interface QRZSession {
	key: string;
	expires: number;
}

let cachedSession: QRZSession | null = null;

async function getQRZSession(username: string, password: string): Promise<string> {
	const now = Date.now();

	if (cachedSession && cachedSession.expires > now) {
		return cachedSession.key;
	}

	const url = `https://xmldata.qrz.com/current/?username=${encodeURIComponent(username)};password=${encodeURIComponent(password)};agent=radio-ba4vun-1.0`;
	const response = await fetch(url);
	const text = await response.text();

	const keyMatch = text.match(/<Key>([^<]+)<\/Key>/);
	if (!keyMatch) {
		throw new Error('Failed to obtain QRZ session key');
	}

	cachedSession = {
		key: keyMatch[1],
		expires: now + 30 * 60 * 1000 // Cache for 30 minutes
	};

	return cachedSession.key;
}

function parseQRZResponse(xml: string, callsign: string): CallsignResponse {
	const result: CallsignResponse = { callsign };

	const extract = (tag: string): string | undefined => {
		const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
		return match?.[1]?.trim() || undefined;
	};

	const name = extract('fname') || extract('name');
	if (name) result.name = name;

	const addr2 = extract('addr2');
	if (addr2) result.address = addr2;

	const grid = extract('grid');
	if (grid) result.grid_square = grid;

	const dxcc = extract('dxcc');
	if (dxcc) result.dxcc = parseInt(dxcc, 10);

	const country = extract('country');
	if (country) result.country = country;

	const cqz = extract('cqzone');
	if (cqz) result.cq_zone = parseInt(cqz, 10);

	const ituz = extract('ituzone');
	if (ituz) result.itu_zone = parseInt(ituz, 10);

	const lat = extract('lat');
	if (lat) result.lat = parseFloat(lat);

	const lon = extract('lon');
	if (lon) result.lon = parseFloat(lon);

	return result;
}

export const onRequestGet: PagesFunction<{
	QRZ_USERNAME: string;
	QRZ_PASSWORD: string;
}> = async (context) => {
	const url = new URL(context.request.url);
	const parts = url.pathname.split('/');
	const callsign = parts.at(-1)?.toUpperCase();

	if (!callsign || callsign.length < 3 || callsign.length > 20) {
		return new Response(JSON.stringify({ error: 'Invalid callsign' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const { QRZ_USERNAME, QRZ_PASSWORD } = context.env;

	if (!QRZ_USERNAME || !QRZ_PASSWORD) {
		return new Response(JSON.stringify({ error: 'QRZ credentials not configured' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const sessionKey = await getQRZSession(QRZ_USERNAME, QRZ_PASSWORD);
		const queryUrl = `https://xmldata.qrz.com/current/?s=${sessionKey};callsign=${encodeURIComponent(callsign)}`;
		const response = await fetch(queryUrl);
		const xml = await response.text();

		// Check for session expired
		if (xml.includes('Session Expired') || xml.includes('Session Timeout')) {
			cachedSession = null;
			const newSession = await getQRZSession(QRZ_USERNAME, QRZ_PASSWORD);
			const retryUrl = `https://xmldata.qrz.com/current/?s=${newSession};callsign=${encodeURIComponent(callsign)}`;
			const retryResponse = await fetch(retryUrl);
			const retryXml = await retryResponse.text();

			if (retryXml.includes('Not Found') || retryXml.includes('Error')) {
				return new Response(JSON.stringify({ error: 'Callsign not found' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			return new Response(JSON.stringify(parseQRZResponse(retryXml, callsign)), {
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'public, max-age=86400'
				}
			});
		}

		if (xml.includes('Not Found') || xml.includes('Error')) {
			return new Response(JSON.stringify({ error: 'Callsign not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new Response(JSON.stringify(parseQRZResponse(xml, callsign)), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=86400'
			}
		});
	} catch (err) {
		return new Response(
			JSON.stringify({
				error: 'Lookup failed',
				details: err instanceof Error ? err.message : 'Unknown error'
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
