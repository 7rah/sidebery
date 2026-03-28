/* eslint no-console: off */

import fs from 'fs/promises'
import { execSync } from 'child_process'

const UPDATE_URL = 'https://raw.githubusercontent.com/mbnuqw/sidebery/v5/updates.json'
const FOR_CHROMIUM = process.argv.includes('--chromium')

async function main() {
  // Parse arguments
  const versionRE = /^\d\d?\.\d\d?\.\d\d?\.?\d?\d?\d?$/
  const version = process.argv[process.argv.length - 1]
  const is4Digit = version.split('.').length === 4
  const preserveVersion = process.argv.some(arg => arg === '--preserve')
  const sign = process.argv.some(arg => arg === '--sign')
  const manifestPath = FOR_CHROMIUM ? './src/manifest.chrome.json' : './src/manifest.json'
  const outputPath = FOR_CHROMIUM ? `./dist/sidebery-chrome-${version}.zip` : `./dist/sidebery-${version}.zip`
  if (!versionRE.test(version)) {
    console.log('\nWrong target version (the last argument)')
    return
  }

  console.log('')

  // Set 'X' version in package.json, package-lock.json and manifest.json
  let prevVersion
  try {
    console.log('Updating version in package.json...')
    let packageContent = await fs.readFile('./package.json', { encoding: 'utf-8' })
    const pkg = JSON.parse(packageContent)
    prevVersion = pkg.version
    pkg.version = version
    packageContent = JSON.stringify(pkg, undefined, '  ') + '\n'
    await fs.writeFile('./package.json', packageContent, { encoding: 'utf-8' })
  } catch {
    console.log('\nCannot update version in package.json')
    return
  }
  try {
    console.log('Updating version in package-lock.json...')
    let packageLockContent = await fs.readFile('./package-lock.json', { encoding: 'utf-8' })
    const pkgLock = JSON.parse(packageLockContent)
    pkgLock.version = version
    pkgLock.packages[''].version = version
    packageLockContent = JSON.stringify(pkgLock, undefined, '  ') + '\n'
    await fs.writeFile('./package-lock.json', packageLockContent, { encoding: 'utf-8' })
  } catch {
    console.log('\nCannot update version in package-lock.json')
    return
  }
  try {
    console.log(`Updating version${is4Digit && !FOR_CHROMIUM ? ' and update_url' : ''} in manifest.json...`)
    let manifestContent = await fs.readFile(manifestPath, { encoding: 'utf-8' })
    const manifest = JSON.parse(manifestContent)
    manifest.version = version
    if (is4Digit && !FOR_CHROMIUM) manifest.browser_specific_settings.gecko.update_url = UPDATE_URL
    manifestContent = JSON.stringify(manifest, undefined, '  ') + '\n'
    await fs.writeFile(manifestPath, manifestContent, { encoding: 'utf-8' })
  } catch {
    console.log('\nCannot revert changes in manifest.json')
    return
  }

  // Delete folder './addon' and './dist/sidebery-X.zip'
  console.log(`Removing ./addon and ${outputPath}...`)
  await fs.rm('./addon', { force: true, recursive: true })
  await fs.rm(outputPath, { force: true })

  // Build ('build')
  console.log('Preparing code...')
  execSync(`node ./build/all.js${FOR_CHROMIUM ? ' --chromium' : ''}`, {
    encoding: 'utf-8',
    stdio: 'inherit',
  })

  // Revert version in package.json, package-lock.json and manifest.json
  const revertVersion = !preserveVersion && prevVersion && version !== prevVersion
  if (revertVersion) {
    try {
      console.log('Reverting version in package.json...')
      let packageContent = await fs.readFile('./package.json', { encoding: 'utf-8' })
      const pkg = JSON.parse(packageContent)
      pkg.version = prevVersion
      packageContent = JSON.stringify(pkg, undefined, '  ') + '\n'
      await fs.writeFile('./package.json', packageContent, { encoding: 'utf-8' })
    } catch {
      console.log('\nCannot revert version in package.json')
      return
    }
    try {
      console.log('Reverting version in package-lock.json...')
      let packageLockContent = await fs.readFile('./package-lock.json', { encoding: 'utf-8' })
      const pkgLock = JSON.parse(packageLockContent)
      pkgLock.version = prevVersion
      pkgLock.packages[''].version = prevVersion
      packageLockContent = JSON.stringify(pkgLock, undefined, '  ') + '\n'
      await fs.writeFile('./package-lock.json', packageLockContent, { encoding: 'utf-8' })
    } catch {
      console.log('\nCannot revert version in package-lock.json')
      return
    }
  }
  if (revertVersion || is4Digit) {
    try {
      console.log('Reverting data in manifest.json...')
      let manifestContent = await fs.readFile(manifestPath, { encoding: 'utf-8' })
      const manifest = JSON.parse(manifestContent)
      if (revertVersion) manifest.version = prevVersion
      if (is4Digit && !FOR_CHROMIUM) delete manifest.browser_specific_settings.gecko.update_url
      manifestContent = JSON.stringify(manifest, undefined, '  ') + '\n'
      await fs.writeFile(manifestPath, manifestContent, { encoding: 'utf-8' })
    } catch {
      console.log('\nCannot revert changes in manifest.json')
      return
    }
  }

  // Create archive
  console.log('Creating addon archive...')
  if (FOR_CHROMIUM) {
    execSync(`cd ./addon && zip -qr ../dist/sidebery-chrome-${version}.zip .`, {
      encoding: 'utf-8',
      stdio: 'inherit',
    })
  } else {
    execSync('npx web-ext build --source-dir ./addon -a ./dist/ -i __tests__', {
      encoding: 'utf-8',
      stdio: 'inherit',
    })
  }

  // Sign
  if (!FOR_CHROMIUM && is4Digit && sign) {
    console.log('Signing addon...')

    if (!process.env.WEB_EXT_API_KEY || !process.env.WEB_EXT_API_SECRET) {
      console.log('\nNo API key or secret')
      return
    }

    execSync('npx web-ext sign --channel unlisted --source-dir ./addon -a ./dist/ -i __tests__', {
      encoding: 'utf-8',
      stdio: 'inherit',
    })
  }
}

await main()
