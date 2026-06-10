#!/usr/bin/env bun
import { $ } from "bun"

import { copyBinaryToSidecarFolder, getCurrentSidecar, windowsify } from "./utils"

const pkg = await Bun.file("./package.json").json()
const tagged = Bun.env.GITHUB_REF_NAME?.startsWith("desktop/v")
  ? Bun.env.GITHUB_REF_NAME.replace(/^desktop\/v/, "")
  : undefined
const desktop = Bun.env.RAILWISE_DESKTOP_VERSION || tagged || pkg.version
pkg.version = desktop
await Bun.write("./package.json", JSON.stringify(pkg, null, 2) + "\n")
console.log(`Updated package.json version to ${pkg.version}`)

const sidecarConfig = getCurrentSidecar()

const dir = "src-tauri/target/railwise-binaries"
const version = (
  Bun.env.RAILWISE_CLI_VERSION ??
  (await Bun.file(".cli-version").exists() ? await Bun.file(".cli-version").text() : "")
).trim()
const tag = Bun.env.RAILWISE_CLI_TAG ?? (version.startsWith("v") ? version : `v${version}`)
const repo = Bun.env.RAILWISE_CLI_REPO ?? "railwise-cn/RAILWISE-CLI"
const source = Bun.env.RAILWISE_CLI_SOURCE ?? "release"
const asset = `${sidecarConfig.ocBinary}.${sidecarConfig.assetExt}`
const archive = `${dir}/${asset}`

await $`mkdir -p ${dir}`
if (source === "run") {
  await $`rm -rf ${dir}`
  await $`mkdir -p ${dir}`
  if (!Bun.env.GITHUB_RUN_ID) throw new Error("GITHUB_RUN_ID is required when RAILWISE_CLI_SOURCE=run")
  await $`gh run download ${Bun.env.GITHUB_RUN_ID} -n railwise-cli`.cwd(dir)
  await copyBinaryToSidecarFolder(windowsify(`${dir}/${sidecarConfig.ocBinary}/bin/railwise`))
  process.exit(0)
}

if (!version) throw new Error("Missing .cli-version or RAILWISE_CLI_VERSION")

const meta = JSON.parse(
  await $`gh api ${`repos/${repo}/releases/tags/${tag}`} --jq ${`.assets[] | select(.name == "${asset}") | {size, url: .browser_download_url}`}`.text(),
) as { size?: number; url?: string }
if (!meta.size || !meta.url) throw new Error(`Could not find ${asset} in ${repo}@${tag}`)

const current = (await Bun.file(archive).exists()) ? Bun.file(archive).size : 0
if (current !== meta.size) {
  const gh = await $`gh release download ${tag} -R ${repo} -p ${asset} -D ${dir} --clobber`.nothrow()
  if (gh.exitCode !== 0) {
    await $`curl --fail --location --continue-at - --retry 5 --retry-delay 2 --connect-timeout 30 --max-time ${Bun.env.RAILWISE_DOWNLOAD_TIMEOUT_MS ?? "2400"} --speed-limit 1024 --speed-time 300 --output ${archive} ${meta.url}`
  }
}

if (Bun.file(archive).size !== meta.size) throw new Error(`Downloaded ${asset} size mismatch`)

await $`rm -rf ${dir}/unpacked`
await $`mkdir -p ${dir}/unpacked`
await $`unzip -oq ${archive} -d ${dir}/unpacked`

const binary = windowsify(`${dir}/unpacked/railwise`)
await $`chmod +x ${binary}`
await $`xattr -d com.apple.quarantine ${binary}`.quiet().nothrow()
await $`xattr -d com.apple.provenance ${binary}`.quiet().nothrow()
const actual = (await $`${binary} --version`.text()).trim()
if (actual !== version.replace(/^v/, "")) throw new Error(`Expected railwise ${version}, got ${actual}`)

await copyBinaryToSidecarFolder(binary)
