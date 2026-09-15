import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("ez-alarm worker", () => {
	it("responds to a health check (integration style)", async () => {
		const response = await SELF.fetch("http://example.com/");

		expect(response.status).toBe(200);
		expect(await response.text()).toBe("ez-alarm is running");
	});

	it("triggers the live room handler with test data", async () => {
		const response = await SELF.fetch("http://example.com/test");

		expect(response.status).toBe(200);
		expect(await response.text()).toBe("Test completed");
	});
});
