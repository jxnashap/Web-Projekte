# Technik: Next.js 16.4, Datenbank, Auth

Recherche für SCM Studio, Stand 26.10.2026 (Websuche + npm-Registry, je Thema ein Rechercheur). Aussagen mit Sicherheit "mittel" vor dem Livegang an der Quelle prüfen.

## Zusammenfassung

Stand 26.10.2026, geprüft per npm-Registry und an der Doku, die mit next@16.4.3 ausgeliefert wird (node_modules/next/dist/docs). Für SCM Studio empfehle ich diesen Stack:
- next 16.4.3 (latest seit 23.10.2026; die Sicherheitsfixes vom 14.10. stecken ab 16.4.1 drin)
- react und react-dom 19.3.1
- typescript 6.0.3, NICHT 7.0.2 (Begründung weiter unten)
- tailwindcss und @tailwindcss/postcss 4.3.3
- drizzle-orm 0.45.4 (stabil) mit drizzle-kit 0.31.11 und postgres (postgres.js) 3.4.9
- lokal @electric-sql/pglite 0.5.11 plus @electric-sql/pglite-socket 0.2.14
- @supabase/ssr 0.12.7 und @supabase/supabase-js 2.118.0
- zod 4.6.7
- ESLint 9/10 mit eslint-config-next 16.4.3

**Was Next 16 grundsätzlich geändert hat:**
- Turbopack ist Standard für dev und build.
- proxy.ts ersetzt middleware.ts. Proxy läuft nur in der Node.js-Runtime, Edge geht dort nicht.
- Request-APIs (params, searchParams, cookies, headers) gibt es nur noch asynchron.
- revalidateTag braucht ein cacheLife-Profil als zweites Argument.
- Neu sind updateTag und refresh für Server Actions.
- `next lint` ist entfernt.
- Parallel Routes brauchen eine default.js.
- Neue Defaults bei Bildern.
- serverRuntimeConfig und publicRuntimeConfig sind entfernt.

**Cache Components** (Schalter `cacheComponents: true` plus `partialPrefetching: true`) ist laut Release-Post zu 16.4 das empfohlene Standardmodell und soll in Next 17 Default werden. Dazu gehören:
- `use cache`, `use cache: private`, cacheLife und cacheTag (stabil)
- `<Activity>` für das Navigieren
- io() für Zeitwerte wie `new Date()`
- ensureStatic, navigation() und prefetch()

**React:** 19.2 brachte Activity, useEffectEvent und cacheSignal. In React 19.3 sind `<ViewTransition>`, addTransitionType und Fragment Refs stabil. View Transitions laufen im App Router ohne Konfiguration.

**TypeScript 7:** `next build` kann TS 7 nutzen, weil Next standardmäßig die tsc-CLI aufruft (`experimental.useTypeScriptCli`). TS 7.0 hat aber keine JavaScript-API und unterstützt keine Language-Service-Plugins. Folgen:
- typescript-eslint 8.72 verlangt `typescript >=4.8.4 <6.1.0`, damit fällt eslint-config-next/typescript aus.
- Das Next-IDE-Plugin funktioniert mit TS 7 nicht.
- create-next-app 16.4.3 installiert selbst noch `typescript ^5`.
Deshalb jetzt TS 6.0.3 und TS 7 erst ab 7.1, wenn dort eine API kommt.

**Tailwind 4:** @tailwindcss/postcss in postcss.config.mjs, `@import "tailwindcss"` und Design-Tokens per `@theme` bzw. `@theme inline`. Schriften über next/font/local mit Archivo und Courier Prime aus webseiten/scm-creatives/public/fonts, weil die Build-Umgebung kein freies Internet hat.

**Datenbank:**
- Drizzle mit postgres.js über den Supabase-Pooler mit `prepare: false`. Das ist bei Supabase so dokumentiert, weil der Transaction-Modus keine Prepared Statements unterstützt.
- Lokal läuft PGlite über pglite-server (`pglite-server --db=./.pglite --port=5433`). So nutzt die App lokal denselben postgres.js-Treiber wie in Produktion.
- Supabase-Auth und Storage gibt es lokal nicht. Dafür braucht es Adapter: einen Dev-Login und Dateiablage.

**Auth:**
- @supabase/ssr mit drei Dateien: lib/supabase/client.ts, server.ts und proxy.ts. Im Proxy aktualisiert `getClaims()` die Session.
- Zum Absichern `getClaims()` verwenden, für Berechtigungsentscheidungen nie `getSession()`.
- MFA mit TOTP: `mfa.enroll({factorType:'totp'})`, dann challenge und verify. Der Zugriff wird über eine restriktive RLS-Policy mit `aal2` erzwungen.

**Belege:** in einen privaten Storage-Bucket über Signed Upload URLs hochladen. Server Actions haben ein Body-Limit von 1 MB.

**Formulare:** Server Actions mit useActionState und zod 4. `error.flatten()` ist dort deprecated, stattdessen `z.flattenError()` oder `z.treeifyError()` verwenden. zod bringt `z.iban()`, `z.email()` und eine deutsche Locale mit.

## Einzelergebnisse

### 1. Aktuelle Paketversionen am 26.10.2026: next 16.4.3, react und react-dom 19.3.1, typescript 7.0.2 (6.0.3 ist die letzte Version auf JavaScript-Basis), tailwindcss und @tailwindcss/postcss 4.3.3, drizzle-orm 0.45.4 (1.0.0-rc.5 ist nur RC), drizzle-kit 0.31.11, postgres 3.4.9, @electric-sql/pglite 0.5.11, @electric-sql/pglite-socket 0.2.14, @supabase/ssr 0.12.7, @supabase/supabase-js 2.118.0, zod 4.6.7, eslint 10.13.0, eslint-config-next 16.4.3, babel-plugin-react-compiler 1.0.0, openai 7.43.0, googleapis 188.0.0, @react-pdf/renderer 4.9.0, @types/react 19.3.0.

Sicherheit: hoch

Abgefragt per `npm view <paket> version`, `dist-tags` und `time`. Wichtige Daten:
- next 16.4.3 veröffentlicht am 23.10.2026.
- react 19.3.0 am 09.09.2026, 19.3.1 am 14.10.2026.
- typescript 7.0.2 am 08.07.2026, 6.0.3 am 16.04.2026.
- drizzle-orm 0.45.4 am 08.10.2026, 1.0.0-rc.5 am 21.10.2026.
- @supabase/ssr 0.12.7 am 08.09.2026.
Peer-Dependencies von next@16.4.3: `react ^18.2.0 || ^19.0.0`, engines `node >=20.9.0`. @supabase/ssr verlangt als Peer `@supabase/supabase-js ^2.114.0`.
Empfehlung: Versionen in package.json exakt pinnen (ohne ^), damit die lokale Vorschau und Vercel identisch bauen.

Quellen:

- https://www.npmjs.com/package/next („dist-tags: "latest": "16.4.3", "canary": "16.5.0-canary.27"; time: "16.4.3": "2026-10-23T13:40:24.922Z"“)
- https://www.npmjs.com/package/typescript („dist-tags: "latest": "7.0.2", "beta": "7.1.0-beta"; "6.0.3": "2026-04-16T23:38:27.905Z"“)
- https://www.npmjs.com/package/drizzle-orm („"latest": "0.45.4", "rc": "1.0.0-rc.5"“)
- https://www.npmjs.com/package/react („"latest": "19.3.1"; "19.3.0": "2026-09-09T17:21:30.071Z"“)

### 2. Next.js 16.4 (06.10.2026) bringt React 19.3, Lazy Compilation, kleineren Turbopack-Output und neue Cache-Components-APIs (ensureStatic, navigation(), prefetch()). Cache Components ist das empfohlene Standardmodell und wird in Next 17 Default. Am 14.10.2026 gab es ein Sicherheitsupdate (16.4.1). Wir sollten also mindestens 16.4.1 einsetzen, aktuell 16.4.3.

Sicherheit: hoch

Laut Release-Post schaltet create-next-app Cache Components für neue Projekte ein. Im CLI-Code von create-next-app 16.4.3 gibt es dafür das Flag `--cache-components`, das in next.config.ts `cacheComponents: true` und `partialPrefetching: true` einträgt. Weitere Neuerungen in 16.4:
- experimentell `agentUpgrade` und `agentFeedback`
- `turbopackGc`
- `next analyze export`
- eslint-config-next unterstützt ESLint 10
16.4 ist laut Sicherheitspost die Active LTS.

Quellen:

- https://nextjs.org/blog/next-16-4 („Next.js 16.4 introduces lazy compilation, smaller Turbopack output, React 19.3 features, Cache Components improvements, and new developer tooling … it will become the default in Next.js 17.“)
- https://nextjs.org/blog/nextjs-security-update-october-14-2026 („Fixed versions are v16.4.1 (Active LTS) and v15.5.28 (Maintenance LTS).“)
- https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents („To enable the cacheComponents flag, set it to true in your next.config.ts file, together with partialPrefetching … Both features will be enabled everywhere in the next major release, and the options will be removed.“)

### 3. Breaking Changes in Next 16, die uns betreffen:
- Turbopack ist Standard für dev und build; eine eigene webpack-Konfiguration lässt den Build fehlschlagen.
- Mindestens Node 20.9 und TypeScript 5.1.
- Request-APIs nur noch asynchron.
- revalidateTag braucht ein zweites Argument.
- middleware heißt jetzt proxy.
- `next lint` und die eslint-Option sind entfernt.
- serverRuntimeConfig und publicRuntimeConfig sind entfernt.
- Parallel Routes brauchen default.js.
- Neue Bild-Defaults (qualities [75], minimumCacheTTL 4 h).
- `next dev` schreibt nach .next/dev.
- experimental.dynamicIO, experimental.useCache und experimental.ppr sind entfernt, Ersatz ist cacheComponents.

Sicherheit: hoch

Folgen für ein neues Projekt:
1. Skripte bleiben einfach: "dev": "next dev", "build": "next build". Das Flag --turbopack ist nicht mehr nötig.
2. Für Linting eine eigene ESLint-CLI-Konfiguration anlegen (eslint.config.mjs).
3. In next.config.ts nur die Top-Level-Optionen verwenden: `turbopack`, `cacheComponents`, `cacheLife`, `reactCompiler`, `typedRoutes`, `adapterPath`.
4. Umgebungsvariablen direkt lesen; damit sie zur Laufzeit und nicht beim Build gelesen werden, vorher `await connection()` aufrufen.
5. `images.qualities` setzen, falls nötig.
6. tsconfig muss `.next/dev/types/**/*.ts` enthalten. Das Template von create-next-app hat das schon.

Quellen:

- https://nextjs.org/docs/app/guides/upgrading/version-16 („Starting with Next.js 16, Turbopack is stable and used by default with next dev and next build … Node.js 20.9+ | Minimum version now 20.9.0 (LTS) … TypeScript 5+ | Minimum version now 5.1.0“)
- https://nextjs.org/docs/app/guides/upgrading/version-16 („Starting with Next.js 16, synchronous access is fully removed. These APIs can only be accessed asynchronously.“)
- https://nextjs.org/docs/app/guides/upgrading/version-16 („revalidateTag now requires a second argument specifying a cacheLife profile. The single-argument form is deprecated and will produce a TypeScript error.“)
- https://nextjs.org/docs/app/guides/upgrading/version-16 („The next lint command has been removed. Use Biome or ESLint directly. next build no longer runs linting.“)

### 4. Neue Features in 16.1 bis 16.4 laut Versionshistorie der ausgelieferten Doku:
- 16.1: Turbopack-Dateisystem-Cache für dev standardmäßig an, `next upgrade`.
- 16.2: adapterPath stabil, Link-Prop `transitionTypes`, unstable_catchError, browserToTerminal.
- 16.3: catchError stabil, io(), `instant` und `prefetch` als Segment-Exports stabil, Dateisystem-Cache auch für Builds standardmäßig an, next/root-params, experimenteller Rust React Compiler.
- 16.4: ensureStatic, navigation() und prefetch(), ESLint 10, `next analyze export`.

Sicherheit: hoch

Für SCM Studio nützlich:
- `catchError` aus 'next/error' als Fehlergrenze pro Komponente, z. B. für das Kunden-KPI-Widget, mit `retry()`.
- `io()` aus 'next/cache', wenn mit Cache Components `new Date()` oder `crypto.randomUUID()` in Server Components verwendet wird (Rechnungsdatum, Fälligkeiten).
- `<Link transitionTypes>` für gerichtete Seitenübergänge.
- `export const instant = false` auf Seiten, die bewusst blockieren dürfen.
Noch experimentell, also vorerst nicht nutzen: `experimental.useOffline`/`useOffline()`, `turbopackRustReactCompiler`, `authInterrupts` (forbidden/unauthorized, Status canary).

Quellen:

- https://nextjs.org/docs/app/api-reference/functions/catchError („The catchError function creates a component that wraps its children in an error boundary. It provides a programmatic alternative to the error.js file convention … v16.3.0 | catchError became stable.“)
- https://nextjs.org/docs/app/api-reference/functions/io („When Cache Components is enabled, Next.js needs you to decide whether to capture a synchronous value like new Date() or Math.random() once and reuse it for every visitor, or produce it fresh for each request … use await io(), which suspends during prerendering.“)
- https://nextjs.org/docs/app/api-reference/functions/use-offline („version: experimental … Without the flag, this hook always returns false.“)

### 5. proxy.ts ersetzt middleware.ts. Die Datei liegt im Projekt-Root (oder in src/) und exportiert eine Funktion `proxy`. Sie läuft immer in der Node.js-Runtime; `runtime` zu setzen wirft einen Fehler. Ohne matcher läuft sie auf JEDEM Request, auch auf Prefetches und statischen Dateien. Im Proxy deshalb nur optimistische Cookie-Prüfungen machen, keine Datenbankabfragen.

Sicherheit: hoch

Code-Muster (aus dem Supabase-Leitfaden, an Next 16 angepasst):
```ts
// proxy.ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)'],
}
```
Die eigentliche Autorisierung gehört in den Data Access Layer (lib/dal.ts mit 'server-only' und React `cache()`) und zusätzlich in jede Server Action und jeden Route Handler.

Quellen:

- https://nextjs.org/docs/app/api-reference/file-conventions/proxy („Proxy defaults to using the Node.js runtime. The runtime config option is not available in Proxy files. Setting the runtime config option in Proxy will throw an error.“)
- https://nextjs.org/docs/app/api-reference/file-conventions/proxy („Without a matcher, Proxy runs on every request, including static files (_next/static), image optimizations (_next/image), and assets in the public/ folder.“)
- https://nextjs.org/docs/app/guides/authentication („since Proxy runs on every route, including prefetched routes, it's important to only read the session from the cookie (optimistic checks), and avoid database checks to prevent performance issues.“)

### 6. Cache Components (`use cache`) für eine App, die überall einen Login braucht:
- `cookies()` außerhalb einer Suspense-Grenze ist ein Build-Fehler.
- `use cache` darf weder cookies() noch headers() aufrufen. Diese Werte außerhalb lesen und als Argument übergeben, oder `use cache: private` verwenden.
- cacheTag zusammen mit updateTag in Server Actions ergibt Read-your-writes: Änderungen sind sofort sichtbar.
- Cache-Keys und Tags werden im Klartext gespeichert.

Sicherheit: hoch

Muster für SCM Studio:
1. Root-Layout und App-Shell (Sidebar, Navigation) bleiben statisch. Alles, was die Session liest, kommt hinter `<Suspense>`.
2. Im DAL `getCurrentUser()` mit `'use cache: private'` oder React `cache()` definieren.
3. Team-Daten über eine nicht exportierte Funktion mit Argumenten cachen:
```ts
async function getKundenByTeam(teamId: string) {
  'use cache'
  cacheTag(`kunden:${teamId}`)
  cacheLife('minutes')
  return db.select().from(kunden).where(eq(kunden.teamId, teamId))
}
```
4. In der Server Action nach dem Schreiben: `updateTag(`kunden:${teamId}`)`.

Voreingestellte Profile (stale/revalidate/expire):
- default: 5 min / 15 min / never
- seconds: 30 s / 1 s / 1 min
- minutes: 5 min / 1 min / 1 h
- hours: 5 min / 1 h / 1 d
- days: 5 min / 1 d / 1 w
- weeks: 5 min / 1 w / 30 d
- max: 5 min / 30 d / 1 y

Auf Vercel ist das In-Memory-`use cache` nur best effort. Für Buchhaltungszahlen nicht cachen, sondern dynamisch lesen.
In Tags keine personenbezogenen Daten verwenden (nur IDs). `stale` mindestens 30 s, sonst greift kein Prefetch.

Quellen:

- https://nextjs.org/docs/app/guides/authentication-with-cache-components („A component that reads the session must sit behind a <Suspense> boundary. With Cache Components, reading cookies() outside a boundary is a build error.“)
- https://nextjs.org/docs/app/api-reference/directives/use-cache („Cached functions and components cannot access runtime APIs like cookies(), headers(), or searchParams … Read these values outside the cached scope and pass them as arguments.“)
- https://nextjs.org/docs/app/guides/authentication-with-cache-components („cache keys and tags are stored in plain text … keep secrets and sensitive personal data (tokens, passwords, raw emails) out of arguments and tags.“)
- https://nextjs.org/docs/app/api-reference/functions/cacheLife („| default | Standard content | 5 minutes | 15 minutes | never | … | max | Stable content that rarely changes | 5 minutes | 30 days | 1 year |“)
- https://nextjs.org/docs/app/guides/upgrading/version-16 („updateTag is a new Server Actions-only API that provides read-your-writes semantics“)

### 7. Server Actions und Formulare:
- Mit useActionState(action, initialState) bekommt die Action `prevState` als erstes Argument; der Hook liefert `[state, formAction, pending]`.
- Dazu useOptimistic und useFormStatus (aus react-dom).
- Body-Limit standardmäßig 1 MB (`experimental.serverActions.bodySizeLimit`).
- CSRF-Schutz läuft über POST und den Vergleich von Origin und Host.
- Jede Action muss die Session selbst neu prüfen.

Sicherheit: hoch

Muster:
```ts
'use server'
import { z } from 'zod'
import { updateTag } from 'next/cache'
const KundeSchema = z.object({
  firma: z.string().min(2),
  email: z.email(),
  iban: z.iban().optional(),
  paket: z.enum(['4','8','12']),
})
export async function kundeAnlegen(prev: State, formData: FormData): Promise<State> {
  const user = await requireUser() // DAL, prüft getClaims + aal2
  const parsed = KundeSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fehler: z.flattenError(parsed.error).fieldErrors }
  await db.insert(kunden).values({ ...parsed.data, teamId: user.teamId })
  updateTag(`kunden:${user.teamId}`)
  return { ok: true }
}
```
Im Client: `const [state, action, pending] = useActionState(kundeAnlegen, {})`.
Dateien (Belege) NICHT über die Server Action schicken, sondern per Signed Upload URL direkt in den Storage, siehe Storage-Finding.

Quellen:

- https://nextjs.org/docs/app/guides/forms („When using useActionState, the Server function signature will change to receive a new prevState or initialState parameter as its first argument.“)
- https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions („By default, the maximum size of the request body sent to a Server Action is 1MB“)
- https://nextjs.org/docs/app/guides/data-security („Server Actions in Next.js also compare the Origin header to the Host header (or X-Forwarded-Host). If these don't match, the request will be aborted.“)
- https://nextjs.org/docs/app/guides/authentication-with-cache-components („Re-verify the session in every Server Action and Route Handler, close to the data.“)

### 8. Zod 4.6.7 im Vergleich zu den Next-Beispielen: Die Next-Doku verwendet noch `validatedFields.error.flatten().fieldErrors`. In Zod 4 ist `.flatten()` als deprecated markiert; ersetzt wird es durch `z.flattenError(err)` oder `z.treeifyError(err)`. String-Methoden wie `.email()` und `.uuid()` sind deprecated, stattdessen `z.email()` und `z.uuid()`. Zod 4.6 bringt `z.iban()`, `z.iso.date()` und eine deutsche Locale mit.

Sicherheit: hoch

Deutsche Fehlermeldungen global: `z.config(z.locales.de())`. Die Datei v4/locales/de.js ist im Paket enthalten.
Für Geldbeträge besser Cent-Integer validieren, z. B. `z.coerce.number().int().nonnegative()`, und `numeric(12,2)` in Postgres verwenden; Float-Formulareingaben vermeiden.
`z.toJSONSchema()` ist vorhanden. Das ist nützlich, um Structured Outputs für die OpenAI-Skriptgenerierung (Bauplan Hook/Pointe) zu beschreiben.

Quellen:

- https://www.npmjs.com/package/zod („package/v4/classic/errors.d.ts: /** @deprecated Use the `z.treeifyError(err)` function instead. */ flatten(): core.$ZodFlattenedError<T>;“)
- https://www.npmjs.com/package/zod („package/v4/classic/schemas.d.ts: /** @deprecated Use `z.email()` instead. */ … export declare function iban(params?: string | core.$ZodIBANParams): ZodIBAN;“)
- https://nextjs.org/docs/app/guides/forms („errors: validatedFields.error.flatten().fieldErrors,“)

### 9. React-Features:
- React 19.2 (in Next 16): `<Activity>`, `useEffectEvent`, View Transitions noch über Canary.
- React 19.3 (09.09.2026): `<ViewTransition>`, `addTransitionType` und Fragment Refs sind stabil und werden aus 'react' exportiert. Im stabilen React 19.2.9 fehlen diese Exporte noch.
- Mit cacheComponents nutzt Next `<Activity>`, um den Zustand der vorherigen Route beim Navigieren zu behalten.
- View Transitions laufen im App Router ohne Konfiguration.

Sicherheit: hoch

Für die UX von SCM Studio:
- `<ViewTransition>` für Übergänge Liste → Detail, z. B. Kundenkarte → Kundenakte.
- `<Link transitionTypes={['vor']}>` für gerichtete Übergänge.
- Activity hält den Formularzustand, wenn man zwischen Skript-Editor und Kalender wechselt.
- useOptimistic für Kanban-Status (Skript → Dreh → Schnitt → Freigabe).

React Compiler: `reactCompiler: true` ist stabil, aber nicht Default. Es braucht `babel-plugin-react-compiler` 1.0.0 und verlängert Build- und Dev-Zeiten. Empfehlung: einschalten, weil das manuelles useMemo spart.
Unterstützte Browser für Next 16: Chrome/Edge/Firefox 111+, Safari 16.4+. Gerichtete View Transitions brauchen Chromium 125+, ohne Unterstützung gibt es nur keine Animation.

Quellen:

- https://react.dev/blog/2026/09/09/react-19-3 („View Transitions and Fragment Refs … are now stable in React 19.3“)
- https://nextjs.org/docs/app/guides/view-transitions („View transitions work in the App Router with no configuration. React 19.3 includes the <ViewTransition> component and addTransitionType API used in this guide.“)
- https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents („When cacheComponents is enabled, Next.js uses React's <Activity> component to preserve component state during client-side navigation.“)
- https://nextjs.org/docs/app/guides/upgrading/version-16 („The reactCompiler configuration option has been promoted from experimental to stable. It is not enabled by default … Expect compile times in development and during builds to be higher“)

### 10. Asynchrone params und searchParams: In page, layout und route sind `params` und `searchParams` Promises. Die global verfügbaren Typ-Helfer `PageProps<'/route'>`, `LayoutProps<'/'>` und `RouteContext<'/route'>` erzeugt `next typegen` bzw. dev/build. Das create-next-app-Template verwendet sie bereits.

Sicherheit: hoch

```tsx
// app/(app)/kunden/[id]/page.tsx
export default async function KundePage(props: PageProps<'/kunden/[id]'>) {
  const { id } = await props.params
  const { tab } = await props.searchParams
  return <Kundenakte id={id} tab={typeof tab === 'string' ? tab : 'uebersicht'} />
}
```
In Client Components Promises mit React `use()` auspacken.
Zusätzlich `typedRoutes: true` (stabil) für typsichere `<Link href>`.

Quellen:

- https://nextjs.org/docs/app/guides/upgrading/version-16 („export default async function Page(props: PageProps<'/blog/[slug]'>) { const { slug } = await props.params; const query = await props.searchParams“)
- https://nextjs.org/docs/app/api-reference/config/next-config-js/typedRoutes („This option has been marked as stable, so you should use typedRoutes instead of experimental.typedRoutes.“)

### 11. TypeScript 7 und Next 16.4: `next build` funktioniert mit TS 7, weil standardmäßig die projektlokale tsc-CLI aufgerufen wird (`experimental.useTypeScriptCli`). TS 7.0 hat aber keine JavaScript-API und keine Language-Service-Plugins. Folgen:
- typescript-eslint 8.72.0 (Teil von eslint-config-next 16.4.3) verlangt `typescript >=4.8.4 <6.1.0`.
- Das Next-IDE-Plugin funktioniert damit nicht.
- create-next-app 16.4.3 installiert noch `typescript ^5`.
Empfehlung: TypeScript 6.0.3.

Sicherheit: hoch

TS 6.0.3 hat neue Defaults:
- `strict` ist an, solange nicht explizit false gesetzt.
- `types` ist standardmäßig [], ohne Wildcard. Node-Typen kommen trotzdem über next-env.d.ts, denn next/types/global.d.ts referenziert `/// <reference types="node" />`.

Als deprecated markiert (Wegfall in 7.0): `baseUrl`, `moduleResolution: node10/classic`, `esModuleInterop: false`, `allowSyntheticDefaultImports: false`, `alwaysStrict: false`, `target: ES5`, `outFile`, module AMD/UMD/System. Die tsconfig von create-next-app (target ES2017, moduleResolution bundler, paths '@/*': ['./*']) nutzt nichts davon und ist kompatibel. Also kein `baseUrl` verwenden.

Auf TS 7 umsteigen, wenn TS 7.1 die angekündigte API mitbringt und typescript-eslint sie unterstützt. Für einen parallelen Betrieb gibt es das npm-Paket `@typescript/typescript6` (bin `tsc6`).

Quellen:

- https://nextjs.org/docs/app/api-reference/config/next-config-js/useTypeScriptCli („By default, next build runs the project-local tsc command instead of loading the TypeScript JavaScript compiler API. This supports TypeScript 6 and enables TypeScript 7 while its JavaScript API is unavailable.“)
- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ („TypeScript 7.0 does not ship with an API … tools such as Volar … can currently only rely on TypeScript 6.0“)
- https://www.npmjs.com/package/typescript-eslint („"version": "8.72.0", "peerDependencies": { "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0", "typescript": ">=4.8.4 <6.1.0" }“)
- https://nextjs.org/docs/app/api-reference/config/typescript („Next.js includes a custom TypeScript plugin and type checker, which VSCode and other code editors can use … Selecting "Use Workspace Version"“)

### 12. Tailwind CSS 4.3 mit Next 16 einrichten:
- `npm i -D tailwindcss@4.3.3 @tailwindcss/postcss@4.3.3`
- postcss.config.mjs mit `'@tailwindcss/postcss': {}`
- in app/globals.css `@import 'tailwindcss';`
Es gibt keine tailwind.config.js mehr. Tokens werden per `@theme` definiert und erzeugen Utility-Klassen. `@theme inline` verwenden, wenn Tokens auf andere Variablen zeigen, z. B. die next/font-Variablen.

Sicherheit: hoch

Vorschlag für SCM Studio (helle UI, Marke Schwarz/Weiß/Rot wie die Website):
```css
@import 'tailwindcss';
@theme {
  --color-papier: #ffffff;
  --color-tinte: #0b0b0b;
  --color-signal: #d7261e; /* [PLATZHALTER] exakten Markenrot-Hex aus webseiten/scm-creatives/marke übernehmen */
  --color-linie: #e7e7e4;
  --radius-karte: 14px;
}
@theme inline {
  --font-sans: var(--font-archivo);
  --font-mono: var(--font-courier);
}
```
Schriften:
```ts
import localFont from 'next/font/local'
const archivo = localFont({ src: './fonts/archivo-var.woff2', variable: '--font-archivo', display: 'swap' })
const courier = localFont({ src: [{ path: './fonts/courier-prime-400-normal.woff2', weight: '400' }, { path: './fonts/courier-prime-700-normal.woff2', weight: '700' }], variable: '--font-courier' })
```
Die Dateien liegen bereits unter webseiten/scm-creatives/public/fonts. next/font/google lädt beim Build aus dem Netz, und die Build-Umgebung hat laut CLAUDE.md keinen freien Internetzugriff. Deshalb next/font/local.

Quellen:

- https://nextjs.org/docs/app/getting-started/css („npm install -D tailwindcss @tailwindcss/postcss … export default { plugins: { '@tailwindcss/postcss': {}, }, } … @import 'tailwindcss';“)
- https://tailwindcss.com/docs/theme („When defining theme variables that reference other variables, use the inline option … Use @theme when you want a design token to map directly to a utility class, and use :root for defining regular CSS variables that shouldn't have corresponding utility classes.“)
- https://nextjs.org/docs/app/getting-started/fonts („To use a local font, import the localFont function from next/font/local and specify the src of your local font file.“)

### 13. Drizzle mit Supabase-Postgres: `drizzle-orm` und `postgres` (postgres.js) mit dem Pooler-URI aus dem Connect-Panel als DATABASE_URL. Im Transaction-Modus des Poolers muss `prepare: false` gesetzt sein. Drizzle 0.45.4 ist stabil; 1.0 ist RC (rc.5 vom 21.10.2026). `drizzle-orm/supabase` liefert RLS-Helfer (authenticatedRole, serviceRole, authUsers).

Sicherheit: hoch

```ts
// lib/db/index.ts
import 'server-only'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'
const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,                     // Supabase Transaction Pooler
  max: process.env.PGLITE ? 1 : 5,    // lokal: pglite-server ohne Multiplexer = 1
  ssl: process.env.PGLITE ? false : 'require',
})
export const db = drizzle(client, { schema, casing: 'snake_case' })
```
```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'
export default defineConfig({ dialect: 'postgresql', schema: './lib/db/schema.ts', out: './drizzle', dbCredentials: { url: process.env.DATABASE_URL! } })
```
Wichtig: Wer über die direkte DB-Verbindung als Rolle `postgres` arbeitet, umgeht RLS. Das ist Postgres-Verhalten für Owner und Rollen mit BYPASSRLS und hier nicht gesondert belegt. Die Autorisierung muss deshalb im DAL stehen; RLS bleibt die zweite Verteidigungslinie für Zugriffe über den Supabase-Client (Storage, Realtime).
Supabase empfiehlt, die Data API (PostgREST) abzuschalten, wenn nur Drizzle genutzt wird.
Empfehlung: mit 0.45.4 starten. Auf 1.0 erst migrieren, wenn es als latest veröffentlicht ist; Breaking Changes sind wahrscheinlich, aber nicht verifiziert.

Quellen:

- https://supabase.com/docs/guides/database/drizzle („// Disable prefetch as it is not supported for "Transaction" pool mode export const client = postgres(connectionString, { prepare: false })“)
- https://supabase.com/docs/guides/database/drizzle („If you plan on solely using Drizzle instead of the Supabase Data API (PostgREST), you can turn off the latter in the API Settings.“)
- https://www.npmjs.com/package/drizzle-orm („drizzle-orm@0.45.4 package/supabase/rls.d.ts: export declare const authenticatedRole … export declare const authUsers“)

### 14. Lokale Vorschau ohne Cloud: PGlite 0.5.11 (Postgres als WASM, Status alpha) als Server über `@electric-sql/pglite-socket` mit dem CLI `pglite-server`. Die App verbindet sich wie in Produktion per postgres.js. drizzle-kit 0.31.11 kann migrations auch direkt mit `driver: 'pglite'` gegen ein Datenverzeichnis ausführen.

Sicherheit: mittel

package.json-Skripte (Vorschlag):
```json
"db:lokal": "pglite-server --db=./.pglite --port=5433",
"dev:lokal": "pglite-server --db=./.pglite --port=5433 --run \"next dev\" --include-database-url",
"db:migrate": "drizzle-kit migrate",
"db:studio": "drizzle-kit studio"
```
`.env.local`: `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/postgres` und `PGLITE=1`.

Grenzen:
- Kein SSL.
- Standardmäßig nur eine Verbindung, mehr nur über den Multiplexer `--max-connections`; deshalb postgres.js mit `max: 1`.
- Die Supabase-Schemas `auth` und `storage` fehlen. Lösung: Auth-Adapter (Dev-Login mit festen Nutzern Oskar und Yannick) und Storage-Adapter (Ablage in ./.uploads) hinter einem Interface. Im Schema eine eigene Tabelle `profile` ohne harten Fremdschlüssel auf `auth.users`, oder lokal per Seed eine Stub-Tabelle `auth.users` anlegen.

Alternative wäre `drizzle-orm/pglite` direkt in Next. Ob PGlite in `serverExternalPackages` muss, ist nicht belegt; es steht nicht auf Nexts Auto-Liste. Der Socket-Weg umgeht das Bundling-Problem.

Quellen:

- https://pglite.dev/docs/pglite-socket („-m, --max-connections=N - Maximum concurrent connections (default is no concurrency: 1) … SSL connections are NOT supported.“)
- https://www.npmjs.com/package/@electric-sql/pglite-socket („The --run option is particularly useful for development workflows where you want to use PGlite as a drop-in replacement for PostgreSQL … pglite-server --run "npm run dev" --include-database-url“)
- https://www.npmjs.com/package/drizzle-kit („declare const drivers: readonly ["d1-http", "expo", "aws-data-api", "pglite", "durable-sqlite"]; … driver: Verify<Driver, 'pglite'>; dbCredentials: { url: string; }“)
- https://www.npmjs.com/package/@electric-sql/pglite („PGlite is a WASM Postgres build packaged into a TypeScript client library … status-alpha“)

### 15. Supabase Auth mit @supabase/ssr 0.12.7 in Next 16 braucht drei Dateien:
- lib/supabase/client.ts mit createBrowserClient
- lib/supabase/server.ts mit createServerClient und await cookies(); getAll/setAll, setAll im try/catch
- lib/supabase/proxy.ts mit updateSession, das `supabase.auth.getClaims()` aufruft und die Cookies auf Request und Response setzt
Zum Absichern `getClaims()` verwenden (prüft das JWT lokal per JWKS), für Berechtigungen nie `getSession()`. Umgebungsvariablen: NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.

Sicherheit: hoch

`setAll(cookiesToSet, headers)` hat seit @supabase/ssr 0.12 einen zweiten Parameter `headers` (zum Beispiel Cache-Header), die auf die Response gesetzt werden müssen. Zwischen createServerClient und getClaims() keinen Code ausführen, sonst drohen zufällige Logouts.

Mit Cache Components:
```ts
// lib/dal.ts
import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
export const requireUser = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const c = data?.claims
  if (!c) redirect('/login')
  if (c.aal !== 'aal2') redirect('/login/mfa')
  return { id: c.sub, email: c.email as string }
})
```
Aufrufe nur innerhalb von `<Suspense>` und nicht in Layouts auf oberster Ebene.
Supabase-Clients pro Request neu erzeugen, nie modulweit teilen.

Quellen:

- https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs („Use getClaims to protect pages and user data … The returned claims always come from decoding the JWT, not from a user lookup.“)
- https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs („Do not run code between createServerClient and supabase.auth.getClaims(). A simple mistake could make it very hard to debug issues with users being randomly logged out.“)
- https://supabase.com/docs/guides/auth/server-side/creating-a-client („setAll(cookiesToSet, headers) { … Object.entries(headers).forEach(([key, value]) => supabaseResponse.headers.set(key, value))“)
- https://supabase.com/docs/guides/auth/auth-mfa („When using the Supabase JavaScript library in a server-side rendering context, make sure you always create a new object for each request!“)

### 16. MFA mit TOTP in Supabase:
- Kostenlos und standardmäßig in jedem Projekt aktiv.
- Ablauf: `mfa.enroll({ factorType: 'totp' })` liefert `data.totp.qr_code` (SVG) und das Secret, danach `mfa.challenge({ factorId })` und `mfa.verify({ factorId, challengeId, code })`.
- Nach dem Login prüft `getAuthenticatorAssuranceLevel()`, ob `currentLevel` aal1 ist und `nextLevel` aal2, dann kommt die MFA-Abfrage.
- Erzwungen wird MFA per restriktiver RLS-Policy auf `aal2`.

Sicherheit: hoch

Für 2 Nutzer: 'Enforce for all users'. SQL-Muster pro Tabelle:
```sql
create policy "mfa_pflicht" on public.rechnungen as restrictive to authenticated
  using ((select auth.jwt()->>'aal') = 'aal2');
```
Zusätzlich prüft der DAL `claims.aal`, siehe Auth-Finding. Bei aal1 auf /login/mfa umleiten statt 401/403 zu zeigen.
Ein TOTP-Code gilt 30 s, plus ein Intervall Toleranz.
Enroll und Challenge laufen im Client (Browser-Client). `refreshSession()` nach unenroll, damit aal sofort sinkt.

Quellen:

- https://supabase.com/docs/guides/auth/auth-mfa/totp („TOTP MFA API is free to use and is enabled on all Supabase projects by default.“)
- https://supabase.com/docs/guides/auth/auth-mfa/totp („const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', }) … setQR(data.totp.qr_code)“)
- https://supabase.com/docs/guides/auth/auth-mfa („create policy "Policy name." on table_name as restrictive to authenticated using ((select auth.jwt()->>'aal') = 'aal2');“)
- https://supabase.com/docs/guides/auth/auth-mfa („We thus recommend you redirect users to a page where they can authenticate using their additional factor, instead of rendering an HTTP 401 Unauthorized or HTTP 403 Forbidden content.“)

### 17. Supabase Storage für Belege:
- Privaten Bucket verwenden (Buckets sind standardmäßig privat). Zugriffe laufen über RLS auf `storage.objects`.
- Download nur per JWT oder per zeitlich begrenzter `createSignedUrl`.
- Upload am 1-MB-Limit der Server Actions vorbei: Server erzeugt mit `createSignedUploadUrl(path)` einen Token, der Browser lädt per `uploadToSignedUrl(path, token, file)` hoch.
- Maximale Dateigröße und erlaubte MIME-Typen am Bucket festlegen.

Sicherheit: hoch

Ablauf:
1. Die Server Action `belegUploadVorbereiten()` prüft requireUser(), legt einen DB-Datensatz `beleg` (Status 'ausstehend') an und erzeugt die Signed Upload URL für den Pfad `belege/<jahr>/<belegId>.<ext>`.
2. Der Client lädt direkt hoch.
3. Die Server Action `belegBestaetigen()` setzt den Status, speichert eine Prüfsumme (SHA-256) und schließt den Datensatz ab.
Bucket-Optionen: z. B. 20 MB, MIME-Typen application/pdf, image/jpeg, image/png, image/heic.
Aufbewahrung und Unveränderbarkeit (GoBD) sind hier nicht belegt; das gehört zum Thema Buchhaltung. Konsequenz für die Policies: kein DELETE für authenticated.

Quellen:

- https://supabase.com/docs/guides/storage/buckets/fundamentals („When a bucket is set to Private all operations are subject to access control via RLS policies. This also applies when downloading assets. Buckets are private by default.“)
- https://supabase.com/docs/reference/javascript/file-buckets-uploadtosignedurl („Upload a file with a token generated from createSignedUploadUrl. … .uploadToSignedUrl('folder/cat.jpg', 'token-from-createSignedUploadUrl', file)“)
- https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions („By default, the maximum size of the request body sent to a Server Action is 1MB“)

### 18. Linting und Projektgerüst:
- create-next-app 16.4.3 kennt die Flags `--ts --tailwind --eslint|--biome --app --src-dir --react-compiler --cache-components --agents-md --import-alias --use-npm|--use-pnpm`.
- ESLint läuft per Flat-Config (eslint.config.mjs mit `eslint-config-next/core-web-vitals` und `eslint-config-next/typescript`).
- eslint-config-next ab 16.4.0 unterstützt ESLint 10.
- In node_modules/next/dist/docs liegt eine versionsgleiche Doku samt AGENTS.md.

Sicherheit: hoch

Empfohlener Start:
```bash
npx create-next-app@16.4.3 scm-studio --ts --tailwind --eslint --app --src-dir --react-compiler --cache-components --agents-md --import-alias "@/*" --use-npm
```
Danach typescript auf 6.0.3 pinnen.
Die ausgelieferte AGENTS.md sagt: 'This is NOT the Next.js you know … Read the relevant guide in dist/docs/'. Ideal für Claude Code, um keine veralteten Next-15-Muster zu erzeugen.

Quellen:

- https://www.npmjs.com/package/create-next-app („.option("--cache-components","Initialize with Cache Components enabled.") … .option("--react-compiler","Initialize with React Compiler enabled.") … typescript:"^5" … eslint:"^9"“)
- https://nextjs.org/docs/app/guides/upgrading/version-16 („eslint-config-next@16 requires ESLint 9 or later, and eslint-config-next@16.4.0 or later supports ESLint 10.“)
- https://www.npmjs.com/package/next („AGENTS.md: This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in dist/docs/ before writing any code.“)

### 19. Bibliotheken, die Next automatisch aus dem Server-Bundle heraushält: `@react-pdf/renderer` steht auf der eingebauten serverExternalPackages-Liste (relevant für die PDF-Dokumente), `@electric-sql/pglite` und `postgres` nicht.

Sicherheit: mittel

PDF-Erzeugung (Angebot, Rechnung, Vertrag) per Route Handler oder Server Action mit @react-pdf/renderer 4.9.0 funktioniert ohne zusätzliche Config. Ob PGlite eine Config braucht, ist nicht belegt; das Socket-Setup umgeht die Frage.

Quellen:

- https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages („- `@libsql/client` … - `@react-pdf/renderer` … - `sharp`“)
