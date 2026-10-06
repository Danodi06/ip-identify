# Address / URL to IP

A small, responsive web tool that resolves a URL or hostname to its public IPv4 and IPv6 addresses, then builds a direct IP-based URL with the original scheme, port, path, query, and fragment preserved.

**Live demo:** add your GitHub Pages URL here after deployment.

## Run locally

Open `index.html` in a browser, or serve the project directory with any static web server. No build step or dependencies are required.

## Deploy with GitHub Pages

1. Push this repository to GitHub using the `main` branch.
2. In **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source.
3. The included workflow publishes the site after pushes to `main`. Find the published URL in the repository's **Actions** tab or **Settings → Pages**.
4. Replace the live-demo placeholder above with your published URL.

## How it works

- The browser sends DNS-over-HTTPS requests for A (IPv4) and AAAA (IPv6) records to Google Public DNS.
- Choose an address to replace the hostname in the original URL. Copy the result with the copy button.
- The original path, query string, fragment, and port are preserved. URL credentials are preserved as part of the URL but are never sent to the DNS resolver.
- Everything runs in the browser; this project has no backend, analytics, or storage.

## Notes

DNS answers can vary by resolver, network, and time. Only the hostname is sent to Google Public DNS; the rest of the URL stays in the browser. A direct IP URL may not work with HTTPS because TLS certificates and virtual hosting commonly depend on the original hostname.