import { type App, type Component, MarkdownRenderer } from 'obsidian'
import { createApi, type IdSettings } from './api'
import { equivalentCall } from './choice'
import { Clock } from './clock'

// UI parts shared by the settings tab and the modal.

// Examples use a clock separate from the plugin's, so that generating examples does not advance the +1 on the plugin's times.
// Examples share one clock, so regenerating one increments it as consecutive generation does and shows how consecutive IDs look: Sqids changes even within the same second.
const exampleClock = new Clock()

export function example(settings: IdSettings): string {
	return createApi(() => settings, exampleClock).generate()
}

// Renders the equivalent call in the same code block as in notes, which also gives it the copy button.
// The code block styling, such as the background and the copy button position, applies only under the markdown-rendered class, as in notes.
export async function renderCall(
	app: App,
	settings: IdSettings,
	component: Component,
): Promise<HTMLElement> {
	const out = createDiv({
		cls: ['markdown-rendered', 'unique-id-generator-call'],
	})
	await MarkdownRenderer.render(
		app,
		`\`\`\`js\n${equivalentCall(settings)}\n\`\`\``,
		out,
		'',
		component,
	)
	return out
}

// Many Obsidian components are handed to a callback, so this captures the component and returns it.
export function capture<T>(add: (cb: (component: T) => void) => void): T {
	let component: T | undefined
	add((c) => {
		component = c
	})
	if (component === undefined) {
		throw new Error('The component was not created.')
	}
	return component
}
