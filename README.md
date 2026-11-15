# A Reader of Pages

A React and TypeScript e-reader for DRM-free EPUB files you own and public-domain
books from Project Gutenberg. It supports a table of contents, page navigation,
three reading themes, adjustable text size, saved positions, and a recent-books
list. Local files must be selected again after restarting the browser.

## Run

```sh
cd page-reader
npm install
npm run dev
```

Use `npm run lint`, `npm run build`, and `npm run preview` from `page-reader` to
check and preview the production build. Deployment platforms can run
`npm run build` followed by `npm run start`; the start script listens on the
platform's `PORT` environment variable.

Catalog searches use Gutendex. Project Gutenberg EPUB downloads use a local Vite
`/api/gutenberg/*` proxy to the Gutenberg mirror because browser CORS is disabled
on the primary host. Production hosting must provide an equivalent same-origin
proxy. See [the app README](page-reader/README.md) for details.
