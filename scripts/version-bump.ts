// 使い方：bun run bump 0.2.0
// package.json、manifest.json、versions.json の版を上げ、コミットしてタグを打つ。
// タグは版番号そのまま（v を付けない）。Obsidian はタグと manifest.json の version が一致することを求める。
import { $ } from 'bun'

const version = process.argv[2]
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
	console.error('usage: bun run bump <x.y.z>')
	process.exit(1)
}

if ((await $`git status --porcelain`.text()).trim() !== '') {
	console.error('working tree is not clean')
	process.exit(1)
}

if ((await $`git tag --list ${version}`.text()).trim() !== '') {
	console.error(`tag ${version} already exists`)
	process.exit(1)
}

const readJson = async (path: string) =>
	(await Bun.file(path).json()) as Record<string, unknown>
const writeJson = (path: string, data: unknown) =>
	Bun.write(path, `${JSON.stringify(data, null, '\t')}\n`)

const pkg = await readJson('package.json')
pkg.version = version
await writeJson('package.json', pkg)

const manifest = await readJson('manifest.json')
manifest.version = version
await writeJson('manifest.json', manifest)

const versions = await readJson('versions.json')
if (!(version in versions)) {
	versions[version] = manifest.minAppVersion
	await writeJson('versions.json', versions)
}

const files = ['package.json', 'manifest.json', 'versions.json']
await $`git commit --only -m ${`chore(release): ${version}`} -- ${files}`
await $`git tag ${version}`
console.log(
	`tagged ${version}. push with: git push && git push origin ${version}`,
)
