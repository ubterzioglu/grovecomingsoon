# Grove Software — coming soon

Single-page holding site for [grovesoftware.tech](https://grovesoftware.tech/).
Static, no build step, no dependencies.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | The page. All copy lives here. |
| `styles.css` | Design tokens, layout, entrance animation. |
| `canopy.js` | Animated triangulated mesh backdrop. |
| `assets/` | Web-sized logo, favicons, social share image. |
| `assets/source/` | Original full-resolution brand files. Not served. |
| `Dockerfile` | nginx image, for Coolify. |
| `nginx.conf` | Server block: gzip, caching, security headers, `/healthz`. |
| `CNAME` | Custom domain, only used if served from GitHub Pages. |

## Editing

**Copy** — everything is in `index.html`: the eyebrow, headline, lede, link
label and footer. No templating, no strings file.

**Colour** — the palette is sampled from the brand mark and set once at the top
of `styles.css`:

```css
--teal:      #49B4B1;  /* primary, from the wordmark */
--teal-deep: #20777D;  /* the mark's shadow tone */
--ink:       #060A0B;  /* background */
```

`canopy.js` draws in the same teal; the RGB triplets `73,180,177` and
`127,221,217` in that file correspond to `--teal` and `--teal-lift`.

**Backdrop tuning** — the constants at the top of `canopy.js` control it:
`GROW_MS` (how long growth takes to sweep the page), `DRAW_MS` (per-edge draw),
`PULSE_GAP` (spacing between travelling pulses). Mesh density is the `cell`
value in `build()` — larger cells mean fewer, wider triangles.

## Regenerating icons

`assets/icon-*.png` and `assets/og-image.png` were generated from the files in
`assets/source/`. If the brand mark changes, regenerate them at 32, 180 and 512
px (square, transparent, tree only — no wordmark) plus a 1200×630 share image.

## Deploying with Coolify

Create a new resource from this Git repository and pick **Dockerfile** as the
build pack. Coolify needs no other build configuration:

| Setting | Value |
| --- | --- |
| Build pack | Dockerfile |
| Base directory | `/` |
| Port | `80` |
| Health check path | `/healthz` |
| Domain | `https://grovesoftware.tech` |

Point the domain's `A` record at the Coolify host, then let Coolify issue the
Let's Encrypt certificate. TLS terminates at Coolify's proxy, so the container
itself only ever speaks plain HTTP on port 80 — that is intentional.

Run it locally the same way Coolify will:

```bash
docker build -t grove .
docker run --rm -p 8080:80 grove
# http://localhost:8080
```

`RUN nginx -t` runs during the build, so a broken `nginx.conf` fails the build
rather than shipping a container that will not start.

### Or GitHub Pages

The repo also works unchanged as a Pages site: serve `main` from the root.
`CNAME` sets the domain and `.nojekyll` stops Jekyll from touching the files.
The apex domain then needs four `A` records — `185.199.108.153`,
`185.199.109.153`, `185.199.110.153`, `185.199.111.153` — and **Enforce HTTPS**
switched on once the certificate is issued. Use one host or the other, not both.

## Security headers

`nginx.conf` sets CSP, `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy` and `Permissions-Policy` at server level. They are declared
there once and deliberately not repeated in any `location` block: in nginx, an
`add_header` inside a block discards every header inherited from its parent, so
the caching rules below use `expires` instead. Keep it that way when editing.

The CSP allows `fonts.googleapis.com` and `fonts.gstatic.com` because the page
loads Sora and JetBrains Mono from Google Fonts. It permits no inline styles or
scripts — the entrance-animation delays live in `styles.css` rather than in
`style` attributes for exactly this reason. Self-host the fonts if you want to
drop the two external origins.

## Accessibility and performance

- Content is readable with the canvas disabled — it is decorative and
  `aria-hidden`.
- `prefers-reduced-motion` renders the mesh fully grown and static, and drops
  the entrance animation.
- The canvas pauses when the tab is hidden and caps device pixel ratio at 2.
- First load is about 125 KB of local files — 106 KB of that is the logo —
  plus the two web fonts. `og-image.png` and `icon-512.png` are only fetched by
  link unfurlers and the OS, never during a normal page view.
