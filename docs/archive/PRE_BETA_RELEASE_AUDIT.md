# 🗃️ Pre-Beta Release Audit

> **Historical record.** This audit captured the repository before the beta preparation line. It does not describe the supported `v2.1.0-beta.2` release; use the [current project status](../PROJECT_STATUS.md) for present-day evidence.

Captured: `2026-08-06T19:51:23Z`

This manifest preserves the observed state before preparing `1.1.0-beta.1`. It contains metadata and hashes only; no historical binary was downloaded or added to Git. No release, tag, installation, mounted image, or local artifact had been removed when this audit was captured.

## Repository state

- Repository: `kaeganscott26/FORGE`
- Feature branch: `feature/persistent-task-engine`
- Feature HEAD: `f173976f5e0965135cbd4b0e0c61f3371b18bceb`
- Local `main`: `d3c34d918b2f9be5aef0d4db5cec102686942ddc`
- `origin/main`: `d3c34d918b2f9be5aef0d4db5cec102686942ddc`
- Package version: `1.1.0-alpha.3`
- Worktree: clean
- Open pull requests: none
- Active workflows: `Build and release macOS app` (`328269171`), `Dependabot Updates` (`328223792`)
- Most recent tag workflow: run `31122821636`, `v1.1.0-alpha.3`, head `d3c34d9`, success
- A separate manual alpha.3 run `31122829515` was cancelled; Actions history is retained.

## Tags before cleanup

| Tag | Object type | Tag object | Target commit |
| --- | --- | --- | --- |
| `v0.1-foundation` | lightweight | — | `1f1cd4dc90d70e1f53523dc769f3fdc7670c2e7a` |
| `v0.2-ai-loop` | lightweight | — | `b8db3f21bfa8a5eaf61262eee827fb0859638898` |
| `v1.0.0` | annotated | `70752ac28c7209bd0cc40e7ededb4fbad5668409` | `86ed05cc7587e7bbc86be1a9a20cc99860c53890` |
| `v1.0.1` | annotated | `eca49e54475b1b64042dc995ba9025d38e97a579` | `0c8c919790cf764d1c470ec2dfddb4e6813f7f38` |
| `v1.1.0-alpha.1` | annotated | `86ee6767c34e5c21ea4a19f0b5987dc2625ed50a` | `6d9037f2d3ff8f5dfdbf6101f0fc2eac49cdbe73` |
| `v1.1.0-alpha.2` | annotated | `99620fa9094ffa3a3f1e48dee9ba9a7606748df6` | `4a0207a0d0e721c031a4687f10ce4aa12d43277e` |
| `v1.1.0-alpha.3` | annotated | `e02d9db66caf671965dcc8648b682a214173ac63` | `d3c34d918b2f9be5aef0d4db5cec102686942ddc` |

The two early development tags are not GitHub Releases and are not in the authorized obsolete-release-tag deletion set. They must remain unless separately reviewed.

## GitHub Releases and assets before cleanup

GitHub exposed five visible Releases. Digests are GitHub API SHA-256 values.

### `v1.1.0-alpha.3`

- Release ID `366355487`; prerelease; published `2026-08-06T17:31:05Z`
- URL: `https://github.com/kaeganscott26/FORGE/releases/tag/v1.1.0-alpha.3`

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `FORGE-1.1.0-alpha.3-universal.dmg` | 249985469 | `2bd349d233454ac0909b0866dadfd792071fab8ce5b7b74160de47e03c90f69b` |
| `FORGE-1.1.0-alpha.3-universal.dmg.blockmap` | 258045 | `5cd2e35d1e3bb92404a14660f1358e9278e6a0057dd049695750ee35d7b51727` |
| `FORGE-1.1.0-alpha.3-universal.zip` | 245919317 | `7c25aca9849582cda2c1b99b12dafc9b0244aa1530d7324bcefac208f1520964` |
| `FORGE-1.1.0-alpha.3-universal.zip.blockmap` | 260042 | `ac09f208f418413308a84574e5850a38476a1c2ee7e030ae5d114a7a143b931c` |
| `preview-mac.yml` | 535 | `dae33f13d4aa8adb2b313ab5143c2830d4a0a9319e73c07345f69c009928ac69` |

### `v1.1.0-alpha.2`

- Release ID `366338694`; prerelease; published `2026-08-06T16:13:16Z`
- URL: `https://github.com/kaeganscott26/FORGE/releases/tag/v1.1.0-alpha.2`

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `FORGE-1.1.0-alpha.2-universal.dmg` | 250022931 | `eaa422ea3090b0e9f6e3ece1d60109589b34b8b25d70b15812536566f4584172` |
| `FORGE-1.1.0-alpha.2-universal.dmg.blockmap` | 259288 | `fc6d97760c3c982bb4abd851d56897a8dabde3bdcd5c8b7bf3965894d52f84a3` |
| `FORGE-1.1.0-alpha.2-universal.zip` | 245905783 | `205e5538343aeaf873c10678b1f43fc867fbcc9bb7b09e9fcdcea66188df1df4` |
| `FORGE-1.1.0-alpha.2-universal.zip.blockmap` | 260140 | `a8c35f0849c076932136192f07b8e1ad1b1dcc804fb72470f9d71345068854e9` |
| `preview-mac.yml` | 535 | `26361c5d593eb88c79e95600f79618fd526614db071ea2cbfc525ee50a9073b3` |

### `v1.1.0-alpha.1`

- Release ID `366235482`; prerelease; published `2026-08-06T13:17:56Z`
- URL: `https://github.com/kaeganscott26/FORGE/releases/tag/v1.1.0-alpha.1`

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `FORGE-1.1.0-alpha.1-universal.dmg` | 249957167 | `55cd6b734fc96456849fe3ad160be7612b090f378d26f1fb6c74f41f5ffc2a55` |
| `FORGE-1.1.0-alpha.1-universal.dmg.blockmap` | 255918 | `ed3376a30b15d9b307c50cd4c55f5c3f4fd221f393ff0a0c31b1ae8a8665af19` |
| `FORGE-1.1.0-alpha.1-universal.zip` | 245872425 | `17dd167c7b732a61392b87a29c34ff28791682f313031d3d4ab50611f616904d` |
| `FORGE-1.1.0-alpha.1-universal.zip.blockmap` | 258166 | `a591674fd1911fe31c8e6fdd40c3a2084b7b3eec5423c610ca0dcdf5e90f4ecd` |
| `preview-mac.yml` | 535 | `09b98def6bd8c956438620015a18bd46623c09bed8105a527cb7b41af5b59b8c` |

### `v1.0.1`

- Release ID `366042875`; stable release; published `2026-08-06T07:31:59Z`
- URL: `https://github.com/kaeganscott26/FORGE/releases/tag/v1.0.1`

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `FORGE-1.0.1-universal.dmg` | 248187260 | `0fba8b5385083d75fce3f4adc2d69867f04ad4904bd5a1934319d5118a879daa` |
| `FORGE-1.0.1-universal.dmg.blockmap` | 254284 | `bf9dfffff959f2bd8332c1d3448b5e461f7de6d1da2cde660380ee3c03ad5caa` |
| `FORGE-1.0.1-universal.zip` | 243985790 | `2d2294b6bef7a731be029e4b958388d7a663079c56a29fa9ac39c0ed7936694c` |
| `FORGE-1.0.1-universal.zip.blockmap` | 256495 | `949af758f638b8e260762492d8c011d7eb7eb642181cd48a7bbee438054e80a4` |
| `latest-mac.yml` | 503 | `00ee008c229a83859ea0e8f938e9053007f1ac05263d909c07d14b361639c861` |

### `v1.0.0`

- Release ID `365969109`; stable release; published `2026-08-06T04:07:11Z`
- URL: `https://github.com/kaeganscott26/FORGE/releases/tag/v1.0.0`

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `FORGE-1.0.0-universal.dmg` | 248168636 | `d08b078e0bc711e3adbc0566aaf0f58b00f1eff3c1b189ddec6b0aad49db95e1` |
| `FORGE-1.0.0-universal.dmg.blockmap` | 256840 | `4c6188800463b0aa6e11aa53b4e1101767ed21136756c6bd8b2a3a8a061a14f2` |
| `FORGE-1.0.0-universal.zip` | 243980745 | `3f23357a84e3e72276d7130148d3fe75f38e13075dd7dbc6e0f4c89b5c7ad072` |
| `FORGE-1.0.0-universal.zip.blockmap` | 257905 | `a18d859542765cce2b220e582248515b798fa25473d9d4c89e0180607a130a5a` |
| `latest-mac.yml` | 503 | `ac42662e9c3e89e01862352f1958fd9da04764110305c2e1945858694a7b25dc` |

GitHub also exposes generated source ZIP/tar archives for each tag. They are not uploaded Release asset records and the Releases API does not provide asset IDs, sizes, or digests for them.

## Local installations and runtime state

| Classification | Path | Version | Architectures | Embedded commit / diagnostics | `app.asar` SHA-256 |
| --- | --- | --- | --- | --- | --- |
| Installed application | `/Applications/FORGE.app` | `1.1.0-alpha.3` | arm64 | `d3c34d918b2f9be5aef0d4db5cec102686942ddc`; Preview; packaged; `file:// packaged app.asar`; build `2026-08-06T18:12:07.401Z` | `1096c26e00632fbe9c698c9e074618bebd8a83e3f6af2fb6001f7898be01d34e` |
| Stale installed application | `~/Applications/FORGE.app` | `1.0.0` | arm64 | This build predates the build-info diagnostic; visible renderer reported `v1.0.0` | `1888d8c2a404565289163a873216269f7508739cb440d63f642bf593b671eac3` |
| Build artifact | `dist_electron/mac-arm64/FORGE.app` | `1.1.0-alpha.3` | arm64 | `d3c34d918b2f9be5aef0d4db5cec102686942ddc`; build `2026-08-06T19:36:27.456Z` | `275dc71e933ede9fdff91dbc08d21857d7bc5c2a4b5f10e3f300770b35232fb6` |
| Build artifact | `dist_electron/mac-universal/FORGE.app` | `1.1.0-alpha.3` | x86_64, arm64 | `d3c34d918b2f9be5aef0d4db5cec102686942ddc`; build `2026-08-06T19:36:27.456Z` | `959a5c38f4e2fe0e8cf089c7a3fda0adb5329b946f3d616e13e86818e7ecccf7` |

- Both installed bundles and both build bundles are ad-hoc signed with no TeamIdentifier.
- No running FORGE process was present after the diagnostic probes exited.
- No mounted FORGE DMG volume was present. A mounted `Perplexity.dmg` was unrelated and left untouched.
- Spotlight and bounded filesystem inspection found no other bundle with identifier `com.kaeganscott26.forge`.

## Local packaging output before cleanup

`dist_electron` occupied approximately 4.5 GB and contained 39 top-level files plus ARM64/universal app directories and builder icon state.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `FORGE-1.0.0-arm64.dmg` | 151309210 | `7cbc8b5da703cc8296b3f34864fdf989fcefa2a2ca73c3183d448f1aa3052691` |
| `FORGE-1.0.0-arm64.dmg.blockmap` | 153486 | `e784dd273ad4e67cb6d6ebc39351428de2bcccb09c5740e271b998db026ddb90` |
| `FORGE-1.0.0-arm64.zip` | 147167813 | `244b5626263576c7992e68e6511c5df858562820481cc86da799989fc9363b8f` |
| `FORGE-1.0.0-arm64.zip.blockmap` | 156124 | `7d71f1391efbdaeea71bfbf826e1d7d63d5d55bab64e2e16cb974d8d2f0eec7e` |
| `FORGE-1.0.0-universal.dmg` | 248168636 | `d08b078e0bc711e3adbc0566aaf0f58b00f1eff3c1b189ddec6b0aad49db95e1` |
| `FORGE-1.0.0-universal.dmg.blockmap` | 256840 | `4c6188800463b0aa6e11aa53b4e1101767ed21136756c6bd8b2a3a8a061a14f2` |
| `FORGE-1.0.0-universal.zip` | 243980745 | `3f23357a84e3e72276d7130148d3fe75f38e13075dd7dbc6e0f4c89b5c7ad072` |
| `FORGE-1.0.0-universal.zip.blockmap` | 257905 | `a18d859542765cce2b220e582248515b798fa25473d9d4c89e0180607a130a5a` |
| `FORGE-1.0.1-universal.dmg` | 248187138 | `fb34deb441536a02d0e9861678c877711fca14fd0c380b0341a161d6938e0705` |
| `FORGE-1.0.1-universal.dmg.blockmap` | 255662 | `fdec557f6725d7f5098798fa789302816166bcfda7757ede14369844beb00cbd` |
| `FORGE-1.0.1-universal.zip` | 243985156 | `594758a8ef5e757700a4c13cf4e2485081941d4082197430eb5b142f69a6c058` |
| `FORGE-1.0.1-universal.zip.blockmap` | 258242 | `e7131f6d0efda32c9d3624c75de0307c48f5250cc7b4d6db45313722603d4146` |
| `FORGE-1.1.0-alpha.1-arm64.dmg` | 153081514 | `a5a1c46a9ed3cd1cb59dfef53d3dad8763590ca8be2fd08d8d1866a1d9c5520b` |
| `FORGE-1.1.0-alpha.1-arm64.dmg.blockmap` | 155529 | `5ca7bf1c4e098fc793ae32bc4e60ec7609e382eb01da8be8396d1253cfa87e08` |
| `FORGE-1.1.0-alpha.1-arm64.zip` | 149034183 | `298ed6b468396a08e7092facc054207ec3e53ba965edd9d8db77a029e713fa4c` |
| `FORGE-1.1.0-alpha.1-arm64.zip.blockmap` | 157598 | `07ff452d4bae1e70cc75c40f437dfb0c0eee10df335c194572ca3ab04ad53b55` |
| `FORGE-1.1.0-alpha.1-universal.dmg` | 249956947 | `eeb754b6fc9e9908510a4b85723f665821dc5b3fa22683f0762b770e43a29845` |
| `FORGE-1.1.0-alpha.1-universal.dmg.blockmap` | 257619 | `120df946184bc6383129951cd619645eb9638d78968f139117de98613bc90416` |
| `FORGE-1.1.0-alpha.1-universal.zip` | 245872556 | `e67b727d23fb9403eec00eb1579cc2a1d9b5e69331ccf21bcb1ce3a7075f689b` |
| `FORGE-1.1.0-alpha.1-universal.zip.blockmap` | 260379 | `d88cf939287c9facf3b75b0fa1a7bf16074188c26309ece897340736d3ea0a32` |
| `FORGE-1.1.0-alpha.2-arm64.dmg` | 153127631 | `d1314a0390197713ca25f0ff6538a2bf8941930407bfcb9f4a80e1a971a33b26` |
| `FORGE-1.1.0-alpha.2-arm64.dmg.blockmap` | 155288 | `f2f3ad20f57008a192678ef95282a3232b590199c057ab06884a74c5c2f85666` |
| `FORGE-1.1.0-alpha.2-arm64.zip` | 149070136 | `7fee75158ab1665e0af367c6a7641ac113e8999512d1a6a1a9a0ed811eacb8b1` |
| `FORGE-1.1.0-alpha.2-arm64.zip.blockmap` | 158667 | `193812ca92b66ca0be8dae12fd57a346b923ffc7ecbceece73353e53c2e1af06` |
| `FORGE-1.1.0-alpha.2-universal.dmg` | 250022931 | `eaa422ea3090b0e9f6e3ece1d60109589b34b8b25d70b15812536566f4584172` |
| `FORGE-1.1.0-alpha.2-universal.dmg.blockmap` | 259288 | `fc6d97760c3c982bb4abd851d56897a8dabde3bdcd5c8b7bf3965894d52f84a3` |
| `FORGE-1.1.0-alpha.2-universal.zip` | 245905783 | `205e5538343aeaf873c10678b1f43fc867fbcc9bb7b09e9fcdcea66188df1df4` |
| `FORGE-1.1.0-alpha.2-universal.zip.blockmap` | 260140 | `a8c35f0849c076932136192f07b8e1ad1b1dcc804fb72470f9d71345068854e9` |
| `FORGE-1.1.0-alpha.3-arm64.dmg` | 153162103 | `d0d578f7b27151ebe538587e75c98c38e94f6bcfe0162935e4aa835ff58c459c` |
| `FORGE-1.1.0-alpha.3-arm64.dmg.blockmap` | 155709 | `d1ec68226db77e3012a728c9be53cdbce9a79b0a6f72666017ff15ed6eb92949` |
| `FORGE-1.1.0-alpha.3-arm64.zip` | 149110500 | `0c4b3cd4cd88fd5cbd69538c1baa9dd4fa6344a2a224abdfd19133f803c99e43` |
| `FORGE-1.1.0-alpha.3-arm64.zip.blockmap` | 157950 | `f9b288e944caa5c50932c80af37ed1dc34ea9e2001112e5b90d2732f0e3e8fee` |
| `FORGE-1.1.0-alpha.3-universal.dmg` | 250006231 | `37cd648b722c92e927265d85c3b1aa4b5cd011e7ddd107d30aa7e87ac7d6dfae` |
| `FORGE-1.1.0-alpha.3-universal.dmg.blockmap` | 258943 | `31efe717f6218435f32ab3b9dff2be26cd1c4497d3c3cd3702d9413bff057824` |
| `FORGE-1.1.0-alpha.3-universal.zip` | 245946528 | `94b19df11132e51fc7f318796c28ae87f9faa96a02f92f00b98449d0832167cd` |
| `FORGE-1.1.0-alpha.3-universal.zip.blockmap` | 260096 | `3a8910e154844884a3aea531c6bbcb67cc5ad9f0538aa8387844d0c1ad76e9ea` |
| `builder-debug.yml` | 2034 | `3b686ffa205c386d253e4ea8541d914b64f9ca5ce9c23767c8b2fdb27dbc25ea` |
| `latest-mac.yml` | 535 | `9fcab67a119989785e5e9901d2904b58ee8e51503e28d04572f3e5b04cad39b0` |
| `preview-mac.yml` | 535 | `9ec8bfa97567ec7fa84642548776f762fd1886de2937be3761ec1332ddb1d14b` |

No release artifact was found elsewhere in the repository after excluding `.git`, `node_modules`, and `dist_electron`. The workflow source `.github/workflows/package-mac.yml` is not a release artifact.

## Updater state before beta preparation

- Logical user channels: `stable` and `preview`; default/migrated selection is `stable`.
- Preview accepts strictly newer normal SemVer or prereleases beginning `alpha`, `beta`, or `rc`.
- Stable accepts strictly newer normal SemVer only.
- Current `preview-mac.yml` points to local `1.1.0-alpha.3` universal ZIP/DMG.
- Stale local `latest-mac.yml` points to `1.1.0-alpha.1`, demonstrating why packaging output must be cleaned before a beta build.
- The release workflow publishes prerelease tags through Preview semantics and normal versions through Stable semantics.

## Destructive cleanup gate

Historical GitHub Releases and release tags may not be removed until the new beta is built from final main, installed locally, accepted, published, independently downloaded and hash-verified, installed from the public artifact, and re-tested. Installed bundles remain preserved until the local beta replacement gate. This file is the comparison manifest for each later deletion.

After this audit, the 4.5 GB `dist_electron` tree was moved recoverably to `~/.Trash/FORGE-dist-pre-beta-20260806T195123Z` so beta packaging begins with no stale output. No installed bundle, remote Release, or tag was changed by that action.
