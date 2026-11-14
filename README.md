# SMS Dispatcher

A frontend for a SMS gateway (via [HTTPSMS](https://httpsms.com)).

Used during [GenAI Days Nantes](https://genai-days-nantes.com/) to send notifications to speakers or VIPs, 15 minutes before their talk, meeting, etc.

Built with [Lovable](https://lovable.dev).

**Live app**: https://sms-dispatcher.lovable.app

## Features

- Scheduling
- CSV import
- Rate-limit: send 30 SMS per minute to prevent ban
- Auth limited to a trusted list of emails

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
