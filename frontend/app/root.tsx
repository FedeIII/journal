import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { AuthProvider } from "~/utils/auth";
import { ThemeProvider } from "~/utils/theme";
import styles from "./styles/global.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
  { rel: "icon", type: "image/png", sizes: "32x32", href: "https://azyr.io/thumbnails/favicon-32x32.png" },
  { rel: "icon", type: "image/png", sizes: "16x16", href: "https://azyr.io/thumbnails/favicon-16x16.png" },
];

export async function loader({ request }: LoaderFunctionArgs) {
  return json({
    ENV: {
      API_URL: process.env.API_URL || 'http://localhost:3001',
    },
  });
}

export default function App() {
  const data = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <Outlet />
          </AuthProvider>
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(data.ENV)}`,
          }}
        />
      </body>
    </html>
  );
}
