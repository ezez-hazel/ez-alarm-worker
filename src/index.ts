import {
	handleLiveRoom,
	LIVE_ROOM_EXECUTION_KEY,
} from "./handle-live-room";

type PreparedEnv = Env & {
	DB?: D1Database;
	KV?: KVNamespace;
	NOTIFICATION_WORKER?: Fetcher;
};

interface RoomInfoResponse {
	code: number;
	data?: {
		uid: number;
		live_status: number;
		title: string;
	};
}

interface UserCardResponse {
	code: number;
	data?: {
		card?: {
			name: string;
			face: string;
		};
	};
}

async function fetchJson<T>(url: URL): Promise<T> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Bilibili request failed: ${response.status}`);
	}

	return response.json<T>();
}

async function processRoom(rid: string, env: PreparedEnv): Promise<void> {
	const roomUrl = new URL("https://api.live.bilibili.com/room/v1/Room/get_info");
	roomUrl.searchParams.set("room_id", rid);
	const roomResponse = await fetchJson<RoomInfoResponse>(roomUrl);
	const room = roomResponse.data;

	if (!room || room.live_status !== 1) {
		return;
	}

	const cardUrl = new URL("https://api.bilibili.com/x/web-interface/card");
	cardUrl.searchParams.set("mid", String(room.uid));
	const cardResponse = await fetchJson<UserCardResponse>(cardUrl);
	const card = cardResponse.data?.card;

	if (!card) {
		throw new Error(`Bilibili user card is missing for uid ${room.uid}`);
	}

	await handleLiveRoom({
		rid,
		uid: room.uid,
		live_status: room.live_status,
		title: room.title,
		name: card.name,
		face: card.face,
	}, {
		db: env.DB,
		kv: env.KV,
		notificationWorker: env.NOTIFICATION_WORKER,
	});
}

async function processScheduledRoom(env: PreparedEnv): Promise<void> {
	if (env.KV && await env.KV.get(LIVE_ROOM_EXECUTION_KEY) !== null) {
		return;
	}

	const rid = env.ROOM_ID.trim();
	if (!rid) {
		return;
	}

	try {
		await processRoom(rid, env);
	} catch (error) {
		console.error(`Failed to process room ${rid}`, error);
	}
}

export default {
	async fetch(request, env: PreparedEnv): Promise<Response> {
		if (new URL(request.url).pathname === "/test") {
			try {
				await handleLiveRoom({
					rid: "1024",
					uid: 2,
					live_status: 1,
					title: "Test live room",
					name: "Test user",
					face: "https://i0.hdslb.com/bfs/face/member/noface.jpg",
				}, {
					db: env.DB,
					kv: env.KV,
					notificationWorker: env.NOTIFICATION_WORKER,
				});

				return new Response("Test completed");
			} catch (error) {
				console.error("Test execution failed", error);
				return new Response("Test failed", { status: 500 });
			}
		}

		return new Response("ez-alarm is running");
	},

	async scheduled(_controller, env): Promise<void> {
		await processScheduledRoom(env);
	},
} satisfies ExportedHandler<Env>;
