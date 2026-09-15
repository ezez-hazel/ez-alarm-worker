export interface LiveRoomData {
	rid: string;
	uid: number;
	live_status: number;
	title: string;
	name: string;
	face: string;
}

export interface LiveRoomServices {
	db?: D1Database;
	kv?: KVNamespace;
	notificationWorker?: Fetcher;
}

export const LIVE_ROOM_EXECUTION_KEY = "live-room:last-execution";
export const LIVE_ROOM_EXECUTION_TTL_SECONDS = 4 * 60 * 60;

export async function handleLiveRoom(
	_room: LiveRoomData,
	_services: LiveRoomServices = {},
): Promise<void> {
	if (_services.kv) {
		await _services.kv.put(
			LIVE_ROOM_EXECUTION_KEY,
			new Date().toISOString(),
			{ expirationTtl: LIVE_ROOM_EXECUTION_TTL_SECONDS },
		);
	}

	const devices: string[] = [];

	if (!_services.db) {
		return;
	}

	const result = await _services.db
		.prepare(
			`SELECT key
			 FROM devices
			 WHERE token IS NOT NULL
			   AND token != ''
			   AND token != 'deleted'`,
		)
		.all<{ key: string }>();

	for (const device of result.results) {
		devices.push(device.key);
	}

	if (_services.notificationWorker) {
		const response = await _services.notificationWorker.fetch(
			"https://bark-worker/post",
			{
				method: "POST",
				headers: {
					"content-type": "application/json",
				},
				body: JSON.stringify({
					title: _room.name,
					body: _room.title,
					sound: "alarm",
					level: "critical",
					icon: _room.face,
					url: `bilibili://live/${_room.rid}`,
					call: "1",
					volume: "10",
					device_keys: devices,
				}),
			},
		);

		if (!response.ok) {
			throw new Error(`Notification request failed: ${response.status}`);
		}
	}
}
