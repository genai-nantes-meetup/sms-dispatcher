import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SMS Dispatcher" },
      { name: "description", content: "Send and schedule SMS via httpSMS." },
      { property: "og:title", content: "SMS Dispatcher" },
      { property: "og:description", content: "Send and schedule SMS via httpSMS." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/new" });
  },
});
