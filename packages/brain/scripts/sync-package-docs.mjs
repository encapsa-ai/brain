import { copyFile } from 'node:fs/promises'

// One public README (including the maintainer's animation), license and history.
for (const file of ['README.md', 'LICENSE', 'CHANGELOG.md']) {
  await copyFile(new URL(`../../../${file}`, import.meta.url), new URL(`../${file}`, import.meta.url))
}
