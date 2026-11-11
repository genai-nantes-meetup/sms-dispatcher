import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SMS Dispatcher" },
      { name: "description", content: "Send and schedule SMS via Brevo." },
      { property: "og:title", content: "SMS Dispatcher" },
      { property: "og:description", content: "Send and schedule SMS via Brevo." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/new" });
  },
});
