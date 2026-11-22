import { type App, type Component, MarkdownRenderer } from 'obsidian'
import { createApi, type IdSettings } from './api'
import { equivalentCall } from './choice'
import { Clock } from './clock'

// 設定画面とモーダルで共通に使う、画面の部品。

// 例には、プラグインの ID とは別の時計を使う。例を作るたびにプラグインの時刻の +1 が進まないように。
// 例どうしは同じ時計を使うので、作り直すと続けて作ったときと同じく +1 され、続けて作った ID の見た目が分かる（同じ秒でも Sqids が変わる）。
const exampleClock = new Clock()

export function example(settings: IdSettings): string {
	return createApi(() => settings, exampleClock).generate()
}

// 同じ結果になる呼び出しを、ノートと同じコードブロックで描く。コピーのボタンもコードブロック自身に付く。
// コードブロックの見た目（背景、コピーのボタンの位置）は、ノートと同じ markdown-rendered の class の下で効く。
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

// Obsidian の部品はコールバックで渡されるものが多いので、受け取って返す形にする。
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
