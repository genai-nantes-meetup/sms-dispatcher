# SMS Dispatcher

A frontend for a SMS gateway (via [HTTPSMS](https://httpsms.com)). Uses a real SIM card.

Used during [GenAI Days Nantes](https://genai-days-nantes.com/) to send notifications to speakers or VIPs, 15 minutes before their talk, meeting, etc.

Built with [Lovable](https://lovable.dev).

**Live app**: https://sms-dispatcher.lovable.app

## Features

- Gateway to a real SIM card (Android)
- Scheduling
- CSV import
- Rate-limit: send 30 SMS per minute to prevent ban
- Auth limited to trusted emails

<img width="1016" height="721" alt="image" src="https://github.com/user-attachments/assets/ac273bbf-a359-4df5-8c14-c7bf043d9e88" />

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Full Setup Guide

See **[SETUP.md](SETUP.md)** for complete instructions on:
- Creating a new Supabase project
- Running database migrations
- Configuring httpSMS provider
- Setting environment variables (local + production)
- Deploying the cron job (Vercel, GitHub Actions, external schedulers)
- Verifying end-to-end
- Rate limits & troubleshooting
