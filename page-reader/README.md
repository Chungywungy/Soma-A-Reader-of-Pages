# A Reader of Pages

A browser-based e-reader for DRM-free EPUB files you own and public-domain books
from Project Gutenberg. It supports page navigation, a table of contents, light,
sepia, and dark reading themes, adjustable text size, and saved reading positions.
Recently opened books are listed on the library screen. Local files must be
selected again after a browser restart; Gutenberg books can be fetched again.

## Run locally

```sh
cd page-reader
npm install
npm run dev
```

Run `npm run lint` and `npm run build` to check the project. `npm run preview`
serves the production build locally.

## Sources and CORS

The local-file picker accepts DRM-free `.epub` files and reads them in the
browser. Catalog searches use the public Gutendex API and only offer its
Project Gutenberg EPUB results.

Project Gutenberg's EPUB host does not provide an `Access-Control-Allow-Origin`
header, so browser code cannot safely fetch those files directly. The app uses
a small Vite proxy at `/api/gutenberg/*`, which fetches the book from the
official Project Gutenberg host and rewrites its redirect back through the
same-origin proxy. This works with the Vite development server and its local
preview server. A production deployment must configure an equivalent
same-origin `/api/gutenberg/*` proxy; do not use a public, unaffiliated CORS
proxy.
