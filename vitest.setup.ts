import '@testing-library/jest-dom'

// Polyfill EventSource for components that use SSE in tests
class MockEventSource {
	url: string
		onopen: any = null
		onmessage: any = null
		onerror: any = null
	constructor(url: string) {
		this.url = url
		// open asynchronously
		setTimeout(() => this.onopen && this.onopen.call(this as any, new Event('open')), 0)
	}
	close() {}
	// minimal addEventListener support
	addEventListener() {}
	removeEventListener() {}
	dispatchEvent() { return true }
}

// @ts-ignore
global.EventSource = (global.EventSource ?? (MockEventSource as any))
